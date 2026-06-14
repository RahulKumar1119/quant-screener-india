"""XGBoost model wrapper using SageMaker Serverless Inference endpoint.

Invokes the quant-screener-xgboost SageMaker endpoint to produce a stock
rating (SELL, HOLD, BUY, STRONG BUY) with a confidence score from quarterly
financial features.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Optional

import numpy as np
import boto3
from botocore.exceptions import (
    ClientError,
    EndpointConnectionError,
    ReadTimeoutError,
    ConnectTimeoutError,
)

logger = logging.getLogger(__name__)


class XGBoostModel:
    """Produces stock rating from quarterly financial data via SageMaker endpoint.

    Sends extracted financial features to the quant-screener-xgboost SageMaker
    Serverless Inference endpoint and returns a rating with confidence score.
    Falls back to None if the endpoint is unavailable.
    """

    rating_map = {0: "SELL", 1: "HOLD", 2: "BUY", 3: "STRONG BUY"}

    def __init__(self, model_path: str = ""):
        """Initialize the SageMaker runtime client.

        Args:
            model_path: Unused in SageMaker mode. Kept for interface compatibility.
        """
        self.endpoint_name = os.environ.get(
            "XGBOOST_ENDPOINT", "quant-screener-xgboost"
        )
        self.client = boto3.client(
            "sagemaker-runtime",
            region_name=os.environ.get("AWS_REGION", "us-east-1"),
            config=boto3.session.Config(
                read_timeout=30,
                connect_timeout=10,
                retries={"max_attempts": 1},
            ),
        )
        logger.info(
            "XGBoost model configured to use SageMaker endpoint: %s",
            self.endpoint_name,
        )

    def predict(self, financials: list[dict], stock_data: dict = None) -> Optional[dict]:
        """Predict stock rating from financial data.

        Tries SageMaker first, falls back to heuristic scoring
        using PE, ROE, and momentum if SageMaker is unavailable.

        Args:
            financials: List of quarterly financial dicts.
            stock_data: Optional dict with pe_ratio, roe, price_change.

        Returns:
            dict with rating and confidence. Never returns None.
        """
        # Try SageMaker first
        if financials:
            try:
                features = self._extract_features(financials)
                # SageMaker XGBoost expects CSV format input
                csv_payload = ",".join(str(f) for f in features)

                response = self.client.invoke_endpoint(
                    EndpointName=self.endpoint_name,
                    ContentType="text/csv",
                    Accept="application/json",
                    Body=csv_payload,
                )

                result = json.loads(response["Body"].read().decode("utf-8"))
                probabilities = result.get("probabilities", result.get("predictions", []))

                if probabilities:
                    if isinstance(probabilities[0], list):
                        probabilities = probabilities[0]
                    predicted_class = int(np.argmax(probabilities))
                    confidence = float(probabilities[predicted_class])
                    return {
                        "rating": self.rating_map[predicted_class],
                        "confidence": round(confidence, 2),
                    }
            except Exception as e:
                logger.warning("SageMaker XGBoost failed: %s. Using heuristic.", str(e))

        # Fallback: heuristic rating from PE + ROE + momentum
        return self._heuristic_rating(stock_data or {})

    def _heuristic_rating(self, stock_data: dict) -> dict:
        """Produce a stock rating from PE, ROE, and momentum heuristics.

        Scoring:
        - Low PE + High ROE + Positive momentum = STRONG BUY
        - Moderate fundamentals = BUY/HOLD
        - High PE + Low ROE + Negative momentum = SELL
        """
        score = 0  # -10 to +10 scale

        pe = stock_data.get("pe_ratio", 20)
        roe = stock_data.get("roe", 10)
        momentum = stock_data.get("price_change", 0)

        # PE scoring
        if pe <= 0:
            score -= 2  # Negative PE = loss-making
        elif pe < 12:
            score += 3  # Deep value
        elif pe < 20:
            score += 2  # Reasonably valued
        elif pe < 30:
            score += 0  # Fair
        elif pe < 50:
            score -= 1  # Expensive
        else:
            score -= 3  # Very expensive

        # ROE scoring
        if roe > 25:
            score += 3
        elif roe > 18:
            score += 2
        elif roe > 12:
            score += 1
        elif roe > 5:
            score += 0
        else:
            score -= 2

        # Momentum scoring
        if momentum > 3:
            score += 2
        elif momentum > 0:
            score += 1
        elif momentum > -3:
            score -= 1
        else:
            score -= 2

        # Map score to rating
        if score >= 5:
            rating = "STRONG BUY"
            confidence = min(0.92, 0.7 + score * 0.03)
        elif score >= 2:
            rating = "BUY"
            confidence = min(0.85, 0.6 + score * 0.04)
        elif score >= -1:
            rating = "HOLD"
            confidence = 0.55 + abs(score) * 0.05
        else:
            rating = "SELL"
            confidence = min(0.88, 0.6 + abs(score) * 0.04)

        return {"rating": rating, "confidence": round(confidence, 2)}

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
        quarters = financials[-4:] if len(financials) >= 4 else financials

        # Feature 1: Revenue growth rate (QoQ)
        if len(quarters) >= 2:
            prev_revenue = quarters[-2].get("revenue", 0)
            curr_revenue = quarters[-1].get("revenue", 0)
            if prev_revenue != 0:
                revenue_growth = (curr_revenue - prev_revenue) / abs(prev_revenue)
            else:
                revenue_growth = 0.0
        else:
            revenue_growth = 0.0

        # Feature 2: Operating margin (most recent quarter)
        latest = quarters[-1]
        latest_revenue = latest.get("revenue", 0)
        latest_op_profit = latest.get("operating_profit", 0)
        if latest_revenue != 0:
            operating_margin = latest_op_profit / latest_revenue
        else:
            operating_margin = 0.0

        # Feature 3: Net profit margin (most recent quarter)
        net_profit_margin = latest.get("margin_pct", 0.0) / 100.0

        # Feature 4: Revenue trend (normalized slope over available quarters)
        revenues = [q.get("revenue", 0) for q in quarters]
        if len(revenues) >= 2:
            x = np.arange(len(revenues), dtype=np.float64)
            y = np.array(revenues, dtype=np.float64)
            mean_revenue = np.mean(y)
            if mean_revenue != 0:
                slope = np.polyfit(x, y, 1)[0]
                revenue_trend = slope / abs(mean_revenue)
            else:
                revenue_trend = 0.0
        else:
            revenue_trend = 0.0

        # Feature 5: Profit consistency
        margins = [q.get("margin_pct", 0.0) for q in quarters]
        if len(margins) >= 2:
            margin_array = np.array(margins, dtype=np.float64)
            mean_margin = np.mean(margin_array)
            std_margin = np.std(margin_array)
            if mean_margin != 0:
                cv = abs(std_margin / mean_margin)
                profit_consistency = max(0.0, 1.0 - cv)
            else:
                profit_consistency = 0.0
        else:
            profit_consistency = 1.0

        return [
            float(revenue_growth),
            float(operating_margin),
            float(net_profit_margin),
            float(revenue_trend),
            float(profit_consistency),
        ]
