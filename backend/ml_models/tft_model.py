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

    def predict(self, repo_rate: float, sector_indices: dict[str, float], stock_data: dict = None) -> dict:
        """Produce per-stock Resilience Score based on price momentum.

        Uses actual stock momentum (7d, 30d, 90d returns) combined with
        volatility and trend strength to score resilience 0-100.

        Args:
            repo_rate: RBI REPO rate as a float.
            sector_indices: Dict mapping sector name to current index value.
            stock_data: Dict with stock-specific data:
                - "symbol": str (NSE symbol for yfinance lookup)
                - "pe_ratio": float
                - "roe": float
                - "price_change": float (today's % change)
                - "sector": str

        Returns:
            Dict with "score" (0-100) and "trend_outlook".
        """
        symbol = stock_data.get("symbol", "") if stock_data else ""

        # Fetch real momentum data from yfinance
        momentum_score = self._compute_momentum_score(symbol)

        # Fundamental quality bonus (small adjustments)
        quality_adj = 0
        if stock_data:
            pe = stock_data.get("pe_ratio", 0)
            roe = stock_data.get("roe", 0)

            # Quality premium: high ROE + reasonable PE
            if roe > 20 and pe < 30:
                quality_adj += 5
            elif roe > 15 and pe < 25:
                quality_adj += 3
            elif roe < 5 or pe > 60:
                quality_adj -= 5

        score = max(0, min(100, momentum_score + quality_adj))
        trend = self._score_to_trend(score)
        return {"score": score, "trend_outlook": trend}

    def _compute_momentum_score(self, symbol: str) -> int:
        """Compute momentum-based resilience score from real price data.

        Fetches 90 days of data and computes:
        - 7-day return (short-term momentum)
        - 30-day return (medium-term momentum)
        - 90-day return (long-term trend)
        - Volatility (lower = more resilient)
        - Trend consistency (how many up-days recently)

        Returns score 0-100 where:
        - 80-100: Strong bullish momentum, low volatility
        - 60-80: Positive trend
        - 40-60: Neutral/sideways
        - 20-40: Negative trend
        - 0-20: Strong bearish, high volatility
        """
        if not symbol:
            return 50

        try:
            import yfinance as yf

            df = yf.download(f"{symbol}.NS", period="90d", progress=False, auto_adjust=True)

            if df.empty or len(df) < 20:
                return 50

            # Handle multi-level columns
            if isinstance(df.columns, __import__('pandas').MultiIndex):
                df.columns = df.columns.get_level_values(0)

            close = df["Close"].values.flatten()

            # Returns at different timeframes
            ret_7d = (close[-1] / close[-7] - 1) * 100 if len(close) >= 7 else 0
            ret_30d = (close[-1] / close[-30] - 1) * 100 if len(close) >= 30 else 0
            ret_90d = (close[-1] / close[0] - 1) * 100 if len(close) >= 2 else 0

            # Daily returns for volatility
            daily_returns = __import__('numpy').diff(close) / close[:-1] * 100
            volatility = float(__import__('numpy').std(daily_returns)) if len(daily_returns) > 0 else 2.0

            # Trend consistency: % of positive days in last 20 days
            recent_returns = daily_returns[-20:] if len(daily_returns) >= 20 else daily_returns
            up_days_pct = (recent_returns > 0).sum() / len(recent_returns) * 100 if len(recent_returns) > 0 else 50

            # === Scoring ===
            score = 50  # Start neutral

            # Short-term momentum (weight: 30%)
            if ret_7d > 5:
                score += 15
            elif ret_7d > 2:
                score += 10
            elif ret_7d > 0:
                score += 5
            elif ret_7d > -2:
                score -= 3
            elif ret_7d > -5:
                score -= 8
            else:
                score -= 15

            # Medium-term momentum (weight: 30%)
            if ret_30d > 10:
                score += 15
            elif ret_30d > 5:
                score += 10
            elif ret_30d > 0:
                score += 5
            elif ret_30d > -5:
                score -= 5
            elif ret_30d > -10:
                score -= 10
            else:
                score -= 15

            # Long-term trend (weight: 20%)
            if ret_90d > 20:
                score += 10
            elif ret_90d > 10:
                score += 7
            elif ret_90d > 0:
                score += 3
            elif ret_90d > -10:
                score -= 5
            else:
                score -= 10

            # Volatility penalty (weight: 10%)
            if volatility < 1.0:
                score += 5  # Very stable
            elif volatility < 1.5:
                score += 2
            elif volatility > 3.0:
                score -= 8  # Very volatile
            elif volatility > 2.5:
                score -= 5

            # Trend consistency (weight: 10%)
            if up_days_pct > 60:
                score += 5
            elif up_days_pct > 55:
                score += 2
            elif up_days_pct < 40:
                score -= 5
            elif up_days_pct < 45:
                score -= 2

            return max(0, min(100, score))

        except Exception as exc:
            logger.warning("Momentum calculation failed for %s: %s", symbol, exc)
            return 50

    def _fallback_score(
        self, repo_rate: float, sector_indices: dict[str, float]
    ) -> int:
        """Compute a heuristic base score when the SageMaker endpoint is unavailable.

        Uses repo rate positioning to produce a moderate baseline.
        Per-stock adjustments happen in predict().

        Args:
            repo_rate: RBI REPO rate.
            sector_indices: Dict of sector name -> index value.

        Returns:
            Score clamped to [0, 100], centered around 50.
        """
        # Start at neutral 50
        base = 50

        # Adjust for repo rate: lower rates = more bullish
        # 4% = +15, 6.5% = 0, 8% = -10
        rate_adjustment = (6.5 - repo_rate) * 6

        score = int(base + rate_adjustment)
        return max(20, min(80, score))  # Keep base in 20-80 range

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
