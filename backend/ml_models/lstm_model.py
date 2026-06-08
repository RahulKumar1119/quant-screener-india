"""LSTM Model wrapper using SageMaker Serverless Inference endpoint.

Invokes the quant-screener-lstm SageMaker endpoint to produce a 7-day price
projection from 30-day historical OHLC closing prices.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import date, timedelta
from typing import Dict, List, Optional

import numpy as np
import pandas as pd
import boto3
from botocore.exceptions import (
    ClientError,
    EndpointConnectionError,
    ReadTimeoutError,
    ConnectTimeoutError,
)

logger = logging.getLogger(__name__)


class LSTMModel:
    """Produces 7-day price projection from 30-day historical OHLC via SageMaker.

    Sends normalized close prices to the quant-screener-lstm SageMaker
    Serverless Inference endpoint and receives 7-day predictions.
    Falls back to None if the endpoint is unavailable.
    """

    SEQUENCE_LENGTH = 30
    PREDICTION_STEPS = 7

    def __init__(self, model_path: str = ""):
        """Initialize the SageMaker runtime client.

        Args:
            model_path: Unused in SageMaker mode. Kept for interface compatibility.
        """
        self.endpoint_name = os.environ.get(
            "LSTM_ENDPOINT", "quant-screener-lstm"
        )
        self.client = boto3.client(
            "sagemaker-runtime",
            region_name=os.environ.get("AWS_REGION", "us-east-1"),
            config=boto3.session.Config(
                read_timeout=60,
                connect_timeout=10,
                retries={"max_attempts": 1},
            ),
        )
        logger.info(
            "LSTM model configured to use SageMaker endpoint: %s",
            self.endpoint_name,
        )

    def predict(self, historical_df: pd.DataFrame) -> Optional[Dict]:
        """Predict 7-day price projection from 30-day historical close prices.

        Args:
            historical_df: DataFrame with at least 30 rows and a 'CLOSE' column.

        Returns:
            Dictionary with 'dates' (list of 7 date strings) and 'prices'
            (list of 7 floats), or None if prediction fails.
        """
        if historical_df is None or len(historical_df) < self.SEQUENCE_LENGTH:
            logger.warning(
                "Insufficient historical data: need %d rows, got %d.",
                self.SEQUENCE_LENGTH,
                len(historical_df) if historical_df is not None else 0,
            )
            return None

        try:
            close_prices = (
                historical_df["CLOSE"]
                .tail(self.SEQUENCE_LENGTH)
                .values.astype(np.float32)
            )

            # Normalize using mean/std
            mean_price = float(close_prices.mean())
            std_price = float(close_prices.std())
            if std_price == 0:
                std_price = 1.0

            normalized = ((close_prices - mean_price) / std_price).tolist()

            # Send normalized prices to SageMaker endpoint
            payload = json.dumps({
                "close_prices": normalized,
                "mean_price": mean_price,
                "std_price": std_price,
            })

            response = self.client.invoke_endpoint(
                EndpointName=self.endpoint_name,
                ContentType="application/json",
                Accept="application/json",
                Body=payload,
            )

            result = json.loads(response["Body"].read().decode("utf-8"))

            # Endpoint returns denormalized prices directly
            prices = result.get("prices", [])

            if not prices or len(prices) != self.PREDICTION_STEPS:
                # If endpoint returns normalized predictions, denormalize here
                predictions = result.get("predictions", [])
                if predictions and len(predictions) == self.PREDICTION_STEPS:
                    prices = [
                        round(p * std_price + mean_price, 2)
                        for p in predictions
                    ]
                else:
                    logger.warning(
                        "Invalid response from LSTM endpoint: expected %d prices, got %d",
                        self.PREDICTION_STEPS,
                        len(prices),
                    )
                    return None

            # Generate 7 future trading dates (weekdays only)
            dates = self._generate_trading_dates(self.PREDICTION_STEPS)

            return {
                "dates": dates,
                "prices": [round(float(p), 2) for p in prices],
            }

        except (ClientError, EndpointConnectionError) as e:
            logger.warning(
                "SageMaker LSTM endpoint unavailable: %s", str(e)
            )
            return None
        except (ReadTimeoutError, ConnectTimeoutError) as e:
            logger.warning(
                "SageMaker LSTM endpoint timeout: %s", str(e)
            )
            return None
        except (ConnectionError, OSError) as e:
            logger.warning(
                "SageMaker LSTM connection error: %s", str(e)
            )
            return None
        except Exception as e:
            logger.warning(
                "Unexpected error invoking LSTM endpoint: %s", str(e)
            )
            return None

    def _generate_trading_dates(self, count: int) -> List[str]:
        """Generate future trading dates (weekdays only, skipping Sat/Sun).

        Starts from the next business day after today.

        Args:
            count: Number of trading dates to generate.

        Returns:
            List of date strings in YYYY-MM-DD format.
        """
        trading_dates: List[str] = []
        current = date.today() + timedelta(days=1)

        while len(trading_dates) < count:
            if current.weekday() < 5:
                trading_dates.append(current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)

        return trading_dates
