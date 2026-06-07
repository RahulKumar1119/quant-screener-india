"""Unit tests for TFTModel class."""

import importlib
import sys
import types
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest


def _create_mock_torch():
    """Create a mock torch module with enough functionality for TFTModel."""
    mock_torch = types.ModuleType("torch")

    class MockTensor:
        def __init__(self, data):
            self._data = np.array(data, dtype=np.float32)

        def __getitem__(self, idx):
            return MockTensor(self._data[idx])

        def __mul__(self, other):
            return MockTensor(self._data * other)

        def item(self):
            return float(self._data)

        @property
        def shape(self):
            return self._data.shape

        def unsqueeze(self, dim):
            return MockTensor(np.expand_dims(self._data, axis=dim))

    def mock_tensor(data, dtype=None):
        return MockTensor(data)

    def mock_clamp(tensor, min_val, max_val):
        clamped = np.clip(tensor._data, min_val, max_val)
        return MockTensor(clamped)

    def mock_load(path, map_location=None):
        return MagicMock()

    def mock_no_grad():
        class NoGradContext:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                pass

        return NoGradContext()

    mock_torch.Tensor = MockTensor
    mock_torch.tensor = mock_tensor
    mock_torch.clamp = mock_clamp
    mock_torch.load = mock_load
    mock_torch.no_grad = mock_no_grad
    mock_torch.float32 = "float32"

    return mock_torch


# Install mock torch before importing tft_model
_mock_torch = _create_mock_torch()
sys.modules["torch"] = _mock_torch

# Now import the module
_ml_models_dir = str(Path(__file__).resolve().parent.parent / "ml_models")
_spec = importlib.util.spec_from_file_location(
    "tft_model", Path(_ml_models_dir) / "tft_model.py"
)
_tft_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_tft_module)

TFTModel = _tft_module.TFTModel
DEFAULT_SECTORS = _tft_module.DEFAULT_SECTORS


@pytest.fixture
def model():
    """Create a TFTModel instance without a real model file (uses fallback)."""
    return TFTModel(model_path="nonexistent_model.pt")


class TestScoreToTrend:
    """Tests for _score_to_trend mapping."""

    def test_bullish_at_65(self, model):
        assert model._score_to_trend(65) == "Bullish"

    def test_bullish_above_65(self, model):
        assert model._score_to_trend(80) == "Bullish"

    def test_bullish_at_100(self, model):
        assert model._score_to_trend(100) == "Bullish"

    def test_bearish_at_35(self, model):
        assert model._score_to_trend(35) == "Bearish"

    def test_bearish_below_35(self, model):
        assert model._score_to_trend(20) == "Bearish"

    def test_bearish_at_0(self, model):
        assert model._score_to_trend(0) == "Bearish"

    def test_neutral_at_36(self, model):
        assert model._score_to_trend(36) == "Neutral"

    def test_neutral_at_64(self, model):
        assert model._score_to_trend(64) == "Neutral"

    def test_neutral_at_50(self, model):
        assert model._score_to_trend(50) == "Neutral"


class TestPredict:
    """Tests for predict method (fallback scoring when model unavailable)."""

    def test_returns_dict_with_required_keys(self, model):
        result = model.predict(6.5, {"NIFTY BANK": 45000.0, "NIFTY IT": 35000.0})
        assert "score" in result
        assert "trend_outlook" in result

    def test_score_is_int_in_range(self, model):
        result = model.predict(6.5, {"NIFTY BANK": 45000.0, "NIFTY IT": 35000.0})
        assert isinstance(result["score"], int)
        assert 0 <= result["score"] <= 100

    def test_trend_outlook_valid_values(self, model):
        result = model.predict(6.5, {"NIFTY BANK": 45000.0})
        assert result["trend_outlook"] in ("Bullish", "Bearish", "Neutral")

    def test_empty_sector_indices(self, model):
        result = model.predict(6.5, {})
        assert result["score"] == 50
        assert result["trend_outlook"] == "Neutral"

    def test_low_repo_rate_tends_higher_score(self, model):
        sectors = {"NIFTY BANK": 30000.0, "NIFTY IT": 30000.0}
        low_rate = model.predict(4.0, sectors)
        high_rate = model.predict(8.0, sectors)
        assert low_rate["score"] >= high_rate["score"]

    def test_score_clamped_to_0(self, model):
        # Very high repo rate with low sector values should not go below 0
        result = model.predict(15.0, {"NIFTY BANK": 1000.0})
        assert result["score"] >= 0

    def test_score_clamped_to_100(self, model):
        # Very low repo rate with high sector values should not exceed 100
        result = model.predict(1.0, {"NIFTY BANK": 100000.0, "NIFTY IT": 100000.0})
        assert result["score"] <= 100


class TestBuildFeatureTensor:
    """Tests for _build_feature_tensor method."""

    def test_tensor_shape(self, model):
        tensor = model._build_feature_tensor(6.5, {"NIFTY BANK": 45000.0})
        # Shape: (1, 1 + len(DEFAULT_SECTORS)) = (1, 11)
        assert tensor.shape == (1, 1 + len(DEFAULT_SECTORS))

    def test_repo_rate_normalized(self, model):
        tensor = model._build_feature_tensor(6.5, {})
        # First feature is repo_rate / 10.0
        assert abs(tensor._data[0][0] - 0.65) < 1e-5

    def test_sector_values_normalized(self, model):
        tensor = model._build_feature_tensor(6.0, {"NIFTY BANK": 50000.0})
        # NIFTY BANK is first sector, index 1 in feature vector
        assert abs(tensor._data[0][1] - 5.0) < 1e-5  # 50000 / 10000

    def test_missing_sector_defaults_to_zero(self, model):
        tensor = model._build_feature_tensor(6.0, {})
        # All sector features should be 0 when no sectors provided
        for i in range(1, len(DEFAULT_SECTORS) + 1):
            assert tensor._data[0][i] == 0.0


class TestModelLoading:
    """Tests for model initialization and graceful handling."""

    def test_nonexistent_model_file(self):
        model = TFTModel(model_path="does_not_exist.pt")
        assert model.model is None

    def test_predict_works_without_model(self):
        model = TFTModel(model_path="does_not_exist.pt")
        result = model.predict(6.5, {"NIFTY BANK": 45000.0})
        assert "score" in result
        assert "trend_outlook" in result


class TestFallbackScore:
    """Tests for _fallback_score heuristic."""

    def test_neutral_with_no_sectors(self, model):
        score = model._fallback_score(6.5, {})
        assert score == 50

    def test_returns_int(self, model):
        score = model._fallback_score(6.0, {"NIFTY BANK": 40000.0})
        assert isinstance(score, int)

    def test_clamped_lower_bound(self, model):
        score = model._fallback_score(20.0, {"NIFTY BANK": 100.0})
        assert score >= 0

    def test_clamped_upper_bound(self, model):
        score = model._fallback_score(0.0, {"NIFTY BANK": 200000.0})
        assert score <= 100
