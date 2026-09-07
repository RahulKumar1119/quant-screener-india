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
        """Produce a stock rating from PE, ROE, and real price momentum.

        Uses yfinance to fetch 30-day momentum for more meaningful signals.
        """
        score = 0  # -10 to +10 scale

        pe = stock_data.get("pe_ratio", 20)
        roe = stock_data.get("roe", 10)
        symbol = stock_data.get("symbol", "")

        # Get real momentum from yfinance
        momentum_7d, momentum_30d = self._get_momentum(symbol)

        # PE scoring
        if pe <= 0:
            score -= 2
        elif pe < 12:
            score += 3
        elif pe < 20:
            score += 2
        elif pe < 30:
            score += 0
        elif pe < 50:
            score -= 1
        else:
            score -= 3

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

        # 7-day momentum scoring (short-term signal)
        if momentum_7d > 5:
            score += 2
        elif momentum_7d > 2:
            score += 1
        elif momentum_7d > -2:
            score += 0
        elif momentum_7d > -5:
            score -= 1
        else:
            score -= 2

        # 30-day momentum scoring (stronger signal)
        if momentum_30d > 10:
            score += 3
        elif momentum_30d > 5:
            score += 2
        elif momentum_30d > 0:
            score += 1
        elif momentum_30d > -5:
            score -= 1
        elif momentum_30d > -10:
            score -= 2
        else:
            score -= 3

        # Map score to rating
        if score >= 6:
            rating = "STRONG BUY"
            confidence = min(0.92, 0.75 + score * 0.02)
        elif score >= 3:
            rating = "BUY"
            confidence = min(0.85, 0.65 + score * 0.03)
        elif score >= -1:
            rating = "HOLD"
            confidence = 0.55 + abs(score) * 0.05
        else:
            rating = "SELL"
            confidence = min(0.88, 0.6 + abs(score) * 0.04)

        return {"rating": rating, "confidence": round(confidence, 2)}

    def _get_momentum(self, symbol: str) -> tuple:
        """Fetch 7-day and 30-day price momentum from yfinance.

        Returns (momentum_7d, momentum_30d) as percentage changes.
        """
        if not symbol:
            return (0.0, 0.0)

        try:
            import yfinance as yf
            import pandas as pd

            df = yf.download(f"{symbol}.NS", period="35d", progress=False, auto_adjust=True)
            if df.empty or len(df) < 7:
                return (0.0, 0.0)

            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)

            close = df["Close"].values.flatten()

            mom_7d = (close[-1] / close[-7] - 1) * 100 if len(close) >= 7 else 0
            mom_30d = (close[-1] / close[0] - 1) * 100 if len(close) >= 2 else 0

            return (round(mom_7d, 2), round(mom_30d, 2))

        except Exception:
            return (0.0, 0.0)

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
