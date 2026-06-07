"""XGBoost model wrapper for stock rating prediction from quarterly financials."""

from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

import numpy as np
import xgboost as xgb

logger = logging.getLogger(__name__)


class XGBoostModel:
    """Produces stock rating from quarterly financial data.

    Loads a pre-trained XGBoost model from a JSON artifact and uses it to
    predict a rating (SELL, HOLD, BUY, STRONG BUY) with a confidence score
    based on extracted financial features from quarterly data.
    """

    rating_map = {0: "SELL", 1: "HOLD", 2: "BUY", 3: "STRONG BUY"}

    def __init__(self, model_path: str):
        """Initialize the XGBoost model.

        Args:
            model_path: Path to the pre-trained XGBoost JSON model file.
                        If the file does not exist, logs a warning and defers
                        the error to predict time.
        """
        self.model_path = model_path
        self.model = None

        if os.path.exists(model_path):
            try:
                self.model = xgb.Booster()
                self.model.load_model(model_path)
                logger.info("XGBoost model loaded from %s", model_path)
            except Exception as e:
                logger.error("Failed to load XGBoost model from %s: %s", model_path, e)
                self.model = None
        else:
            logger.warning(
                "XGBoost model file not found at %s. "
                "predict() will raise until a valid model is provided.",
                model_path,
            )

    def predict(self, financials: list[dict]) -> Optional[dict]:
        """Predict stock rating from quarterly financial data.

        Args:
            financials: List of quarterly financial dicts, each containing:
                - revenue (float): Total revenue in INR
                - expenses (float): Total expenses in INR
                - operating_profit (float): Operating profit in INR
                - net_profit (float): Net profit in INR
                - margin_pct (float): Net profit margin percentage

        Returns:
            dict with:
                - rating: One of "STRONG BUY", "BUY", "HOLD", "SELL"
                - confidence: Float between 0.0 and 1.0
            Or None if the model is not loaded or financials are empty.
        """
        if self.model is None:
            logger.warning(
                "XGBoost model not loaded. Cannot produce predictions."
            )
            return None

        if not financials:
            logger.warning("financials list must not be empty")
            return None

        try:
            features = self._extract_features(financials)
            dmatrix = xgb.DMatrix(np.array([features]))
            probabilities = self.model.predict(dmatrix)[0]
            predicted_class = int(np.argmax(probabilities))
            confidence = float(probabilities[predicted_class])

            return {
                "rating": self.rating_map[predicted_class],
                "confidence": round(confidence, 2),
            }
        except Exception as e:
            logger.error("XGBoost prediction failed: %s", e)
            return None

    def _extract_features(self, financials: list[dict]) -> list[float]:
        """Extract feature vector from quarterly financial data.

        Computes the following features:
        1. Revenue growth rate (quarter-over-quarter, most recent)
        2. Operating margin (most recent quarter)
        3. Net profit margin (most recent quarter)
        4. Revenue trend (slope over last 4 quarters, normalized)
        5. Profit consistency (std of net profit margins / mean, lower is better)

        Args:
            financials: List of quarterly financial dicts ordered chronologically
                        (oldest first, newest last).

        Returns:
            List of 5 float features.
        """
        # Ensure we work with at least 1 quarter; use up to 4 most recent
        quarters = financials[-4:] if len(financials) >= 4 else financials

        # --- Feature 1: Revenue growth rate (QoQ) ---
        if len(quarters) >= 2:
            prev_revenue = quarters[-2].get("revenue", 0)
            curr_revenue = quarters[-1].get("revenue", 0)
            if prev_revenue != 0:
                revenue_growth = (curr_revenue - prev_revenue) / abs(prev_revenue)
            else:
                revenue_growth = 0.0
        else:
            revenue_growth = 0.0

        # --- Feature 2: Operating margin (most recent quarter) ---
        latest = quarters[-1]
        latest_revenue = latest.get("revenue", 0)
        latest_op_profit = latest.get("operating_profit", 0)
        if latest_revenue != 0:
            operating_margin = latest_op_profit / latest_revenue
        else:
            operating_margin = 0.0

        # --- Feature 3: Net profit margin (most recent quarter) ---
        net_profit_margin = latest.get("margin_pct", 0.0) / 100.0

        # --- Feature 4: Revenue trend (normalized slope over available quarters) ---
        revenues = [q.get("revenue", 0) for q in quarters]
        if len(revenues) >= 2:
            # Compute linear regression slope normalized by mean revenue
            x = np.arange(len(revenues), dtype=np.float64)
            y = np.array(revenues, dtype=np.float64)
            mean_revenue = np.mean(y)
            if mean_revenue != 0:
                # Simple slope: (y_last - y_first) / (n-1) / mean
                slope = np.polyfit(x, y, 1)[0]
                revenue_trend = slope / abs(mean_revenue)
            else:
                revenue_trend = 0.0
        else:
            revenue_trend = 0.0

        # --- Feature 5: Profit consistency ---
        # Lower coefficient of variation of net profit margins = more consistent
        margins = [q.get("margin_pct", 0.0) for q in quarters]
        if len(margins) >= 2:
            margin_array = np.array(margins, dtype=np.float64)
            mean_margin = np.mean(margin_array)
            std_margin = np.std(margin_array)
            if mean_margin != 0:
                # Invert so higher = more consistent (1 - CV, clamped to [0, 1])
                cv = abs(std_margin / mean_margin)
                profit_consistency = max(0.0, 1.0 - cv)
            else:
                profit_consistency = 0.0
        else:
            # Single quarter: assume fully consistent
            profit_consistency = 1.0

        return [
            float(revenue_growth),
            float(operating_margin),
            float(net_profit_margin),
            float(revenue_trend),
            float(profit_consistency),
        ]
