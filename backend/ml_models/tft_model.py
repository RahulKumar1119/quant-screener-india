"""TFT (Temporal Fusion Transformer) model wrapper for Macro Resilience Score."""

from __future__ import annotations

import logging
import os
from typing import Dict

import numpy as np
import torch

logger = logging.getLogger(__name__)

# Default sector names used for feature vector construction.
# These correspond to Nifty sector indices commonly tracked.
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

    The model takes macro-economic features (RBI repo rate and Nifty sector
    index values) and outputs a score between 0-100 representing overall
    market macro resilience, along with a trend outlook classification.
    """

    def __init__(self, model_path: str = "model_artifacts/tft_macro.pt"):
        """Load the pre-trained TFT PyTorch model.

        Args:
            model_path: Path to the .pt model artifact file.
        """
        self.model = None
        self.model_path = model_path

        if os.path.exists(model_path):
            try:
                self.model = torch.load(model_path, map_location="cpu")
                self.model.eval()
                logger.info("TFT model loaded from %s", model_path)
            except Exception as e:
                logger.warning("Failed to load TFT model from %s: %s", model_path, e)
                self.model = None
        else:
            logger.warning(
                "TFT model file not found at %s. "
                "Predictions will use fallback scoring.",
                model_path,
            )

    def predict(self, repo_rate: float, sector_indices: dict[str, float]) -> dict:
        """Produce Macro Resilience Score and trend outlook.

        Args:
            repo_rate: RBI REPO rate as a float (e.g. 6.5 for 6.5%).
            sector_indices: Dict mapping sector name to current index value.

        Returns:
            Dict with keys:
                - "score": int in range [0, 100]
                - "trend_outlook": "Bullish" | "Bearish" | "Neutral"
        """
        if self.model is not None:
            features = self._build_feature_tensor(repo_rate, sector_indices)
            with torch.no_grad():
                output = self.model(features)
            score = int(torch.clamp(output[0] * 100, 0, 100).item())
        else:
            # Fallback: heuristic scoring when model is unavailable
            score = self._fallback_score(repo_rate, sector_indices)

        trend = self._score_to_trend(score)
        return {"score": score, "trend_outlook": trend}

    def _build_feature_tensor(
        self, repo_rate: float, sector_indices: dict[str, float]
    ) -> torch.Tensor:
        """Build input feature tensor from macro data.

        Feature vector layout: [repo_rate, sector_1_value, sector_2_value, ...]
        Sector values are normalized by dividing by 10000 for numerical stability.

        Args:
            repo_rate: RBI REPO rate.
            sector_indices: Dict of sector name -> index value.

        Returns:
            Tensor of shape (1, num_features) suitable for model input.
        """
        features = [repo_rate / 10.0]  # Normalize repo rate (typically 4-8%)

        for sector in DEFAULT_SECTORS:
            value = sector_indices.get(sector, 0.0)
            features.append(value / 10000.0)  # Normalize index values

        feature_array = np.array(features, dtype=np.float32)
        return torch.tensor(feature_array, dtype=torch.float32).unsqueeze(0)

    def _fallback_score(
        self, repo_rate: float, sector_indices: dict[str, float]
    ) -> int:
        """Compute a heuristic score when model artifact is unavailable.

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

        # Simple heuristic: average sector index position relative to baseline
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
