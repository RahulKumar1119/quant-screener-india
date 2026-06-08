"""TFT (Temporal Fusion Transformer) model wrapper using SageMaker Serverless Inference.

Invokes the quant-screener-tft SageMaker endpoint to produce a Macro Resilience
Score from RBI REPO rate and Nifty sector indices. Falls back to a heuristic
scoring method when the endpoint is unavailable.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Dict, Optional

import numpy as np
import boto3
from botocore.exceptions import (
    ClientError,
    EndpointConnectionError,
    ReadTimeoutError,
    ConnectTimeoutError,
)

logger = logging.getLogger(__name__)

# Default sector names used for feature vector construction.
DEFAULT_SECTORS = [
    "NIFTY BANK",
    "NIFTY IT",
    "NIFTY PHARMA",
    "NIFTY FMCG",
    "NIFTY METAL",
    "NIFTY ENERGY",
    "NIFTY REALTY",
    "NIFTY AUTO",
    "NIFTY MEDIA",
    "NIFTY INFRA",
]


class TFTModel:
    """Produces Macro Resilience Score from RBI REPO rate + sector indices.

    Sends macro-economic features to the quant-screener-tft SageMaker
    Serverless Inference endpoint. Returns a score (0-100) and trend outlook.
    Falls back to heuristic scoring when the endpoint is unavailable.
    """

    def __init__(self, model_path: str = ""):
        """Initialize the SageMaker runtime client.

        Args:
            model_path: Unused in SageMaker mode. Kept for interface compatibility.
        """
        self.endpoint_name = os.environ.get(
            "TFT_ENDPOINT", "quant-screener-tft"
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
            "TFT model configured to use SageMaker endpoint: %s",
            self.endpoint_name,
        )

    def predict(self, repo_rate: float, sector_indices: dict[str, float]) -> dict:
        """Produce Macro Resilience Score and trend outlook via SageMaker.

        Attempts to invoke the SageMaker endpoint. If the endpoint is
        unavailable, falls back to heuristic scoring.

        Args:
            repo_rate: RBI REPO rate as a float (e.g. 6.5 for 6.5%).
            sector_indices: Dict mapping sector name to current index value.

        Returns:
            Dict with keys:
                - "score": int in range [0, 100]
                - "trend_outlook": "Bullish" | "Bearish" | "Neutral"
        """
        try:
            payload = json.dumps({
                "repo_rate": repo_rate,
                "sector_indices": sector_indices,
            })

            response = self.client.invoke_endpoint(
                EndpointName=self.endpoint_name,
                ContentType="application/json",
                Accept="application/json",
                Body=payload,
            )

            result = json.loads(response["Body"].read().decode("utf-8"))

            score = result.get("score")
            trend_outlook = result.get("trend_outlook")

            if score is not None and trend_outlook is not None:
                score = max(0, min(100, int(score)))
                return {"score": score, "trend_outlook": trend_outlook}

            # If response doesn't have expected fields, use raw output
            raw_score = result.get("predictions", [None])[0]
            if raw_score is not None:
                score = max(0, min(100, int(float(raw_score) * 100)))
                trend = self._score_to_trend(score)
                return {"score": score, "trend_outlook": trend}

            # Unexpected response format — fall back to heuristic
            logger.warning(
                "Unexpected response from TFT endpoint, using fallback scoring"
            )
            score = self._fallback_score(repo_rate, sector_indices)
            trend = self._score_to_trend(score)
            return {"score": score, "trend_outlook": trend}

        except (ClientError, EndpointConnectionError) as e:
            logger.warning(
                "SageMaker TFT endpoint unavailable: %s. Using fallback scoring.",
                str(e),
            )
            score = self._fallback_score(repo_rate, sector_indices)
            trend = self._score_to_trend(score)
            return {"score": score, "trend_outlook": trend}
        except (ReadTimeoutError, ConnectTimeoutError) as e:
            logger.warning(
                "SageMaker TFT endpoint timeout: %s. Using fallback scoring.",
                str(e),
            )
            score = self._fallback_score(repo_rate, sector_indices)
            trend = self._score_to_trend(score)
            return {"score": score, "trend_outlook": trend}
        except (ConnectionError, OSError) as e:
            logger.warning(
                "SageMaker TFT connection error: %s. Using fallback scoring.",
                str(e),
            )
            score = self._fallback_score(repo_rate, sector_indices)
            trend = self._score_to_trend(score)
            return {"score": score, "trend_outlook": trend}
        except Exception as e:
            logger.warning(
                "Unexpected error invoking TFT endpoint: %s. Using fallback scoring.",
                str(e),
            )
            score = self._fallback_score(repo_rate, sector_indices)
            trend = self._score_to_trend(score)
            return {"score": score, "trend_outlook": trend}

    def _fallback_score(
        self, repo_rate: float, sector_indices: dict[str, float]
    ) -> int:
        """Compute a heuristic score when the SageMaker endpoint is unavailable.

        Uses a simple weighted average of sector momentum signals and
        repo rate positioning to produce a reasonable estimate.

        Args:
            repo_rate: RBI REPO rate.
            sector_indices: Dict of sector name -> index value.

        Returns:
            Score clamped to [0, 100].
        """
        if not sector_indices:
            return 50  # Neutral when no data available

        sector_values = list(sector_indices.values())
        avg_sector = np.mean(sector_values) if sector_values else 0.0

        # Normalize average sector value to a 0-100 range heuristically
        # Typical Nifty sector indices range ~5000-50000
        normalized = (avg_sector / 30000.0) * 60 + 20

        # Adjust for repo rate: lower rates tend toward bullish
        # Typical range: 4-8%, midpoint ~6%
        rate_adjustment = (6.0 - repo_rate) * 3

        score = int(normalized + rate_adjustment)
        return max(0, min(100, score))

    def _score_to_trend(self, score: int) -> str:
        """Map numerical score to trend outlook label.

        Args:
            score: Macro Resilience Score (0-100).

        Returns:
            "Bullish" if score >= 65,
            "Bearish" if score <= 35,
            "Neutral" otherwise.
        """
        if score >= 65:
            return "Bullish"
        elif score <= 35:
            return "Bearish"
        return "Neutral"
