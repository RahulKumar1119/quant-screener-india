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

    def predict(self, financials: list[dict]) -> Optional[dict]:
        """Predict stock rating from quarterly financial data via SageMaker.

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
            Or None if the endpoint is unavailable or financials are empty.
        """
        if not financials:
            logger.warning("financials list must not be empty")
            return None

        try:
            features = self._extract_features(financials)
            payload = json.dumps({"features": features})

            response = self.client.invoke_endpoint(
                EndpointName=self.endpoint_name,
                ContentType="application/json",
                Accept="application/json",
                Body=payload,
            )

            result = json.loads(response["Body"].read().decode("utf-8"))

            # SageMaker XGBoost returns probabilities array
            probabilities = result.get("probabilities", result.get("predictions", []))

            if not probabilities:
                logger.warning("Empty response from XGBoost SageMaker endpoint")
                return None

            # Handle nested array (batch response)
            if isinstance(probabilities[0], list):
                probabilities = probabilities[0]

            predicted_class = int(np.argmax(probabilities))
            confidence = float(probabilities[predicted_class])

            return {
                "rating": self.rating_map[predicted_class],
                "confidence": round(confidence, 2),
            }

        except (ClientError, EndpointConnectionError) as e:
            logger.warning(
                "SageMaker XGBoost endpoint unavailable: %s", str(e)
            )
            return None
        except (ReadTimeoutError, ConnectTimeoutError) as e:
            logger.warning(
                "SageMaker XGBoost endpoint timeout: %s", str(e)
            )
            return None
        except (ConnectionError, OSError) as e:
            logger.warning(
                "SageMaker XGBoost connection error: %s", str(e)
            )
            return None
        except Exception as e:
            logger.warning(
                "Unexpected error invoking XGBoost endpoint: %s", str(e)
            )
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
