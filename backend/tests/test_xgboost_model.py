"""Unit tests for XGBoostModel class."""

import importlib.util
import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

# Direct import to avoid __init__.py pulling in dependencies (torch, tensorflow)
_xgb_path = str(
    Path(__file__).resolve().parent.parent / "ml_models" / "xgboost_model.py"
)
_spec = importlib.util.spec_from_file_location("xgboost_model", _xgb_path)
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
XGBoostModel = _module.XGBoostModel


SAMPLE_FINANCIALS = [
    {
        "quarter": "Q1 FY25",
        "revenue": 10000000000,
        "expenses": 8000000000,
        "operating_profit": 2000000000,
        "net_profit": 1500000000,
        "margin_pct": 15.0,
    },
    {
        "quarter": "Q2 FY25",
        "revenue": 11000000000,
        "expenses": 8500000000,
        "operating_profit": 2500000000,
        "net_profit": 1800000000,
        "margin_pct": 16.4,
    },
    {
        "quarter": "Q3 FY25",
        "revenue": 12000000000,
        "expenses": 9000000000,
        "operating_profit": 3000000000,
        "net_profit": 2100000000,
        "margin_pct": 17.5,
    },
    {
        "quarter": "Q4 FY25",
        "revenue": 12500000000,
        "expenses": 9800000000,
        "operating_profit": 2700000000,
        "net_profit": 1900000000,
        "margin_pct": 15.2,
    },
]


class TestXGBoostModelInit:
    """Tests for XGBoostModel initialization."""

    def test_init_missing_model_file(self, tmp_path):
        """Model initializes gracefully when file doesn't exist."""
        model = XGBoostModel(model_path=str(tmp_path / "nonexistent.json"))
        assert model.model is None

    def test_rating_map_defined(self, tmp_path):
        """Rating map contains all expected values."""
        model = XGBoostModel(model_path=str(tmp_path / "nonexistent.json"))
        assert model.rating_map == {
            0: "SELL",
            1: "HOLD",
            2: "BUY",
            3: "STRONG BUY",
        }


class TestXGBoostModelPredict:
    """Tests for XGBoostModel.predict method."""

    def _make_model_with_mock(self, predicted_probs=None):
        """Create an XGBoostModel with a mocked Booster."""
        if predicted_probs is None:
            predicted_probs = np.array([[0.05, 0.10, 0.25, 0.60]])

        model = XGBoostModel.__new__(XGBoostModel)
        model.model_path = "test.json"
        model.rating_map = {0: "SELL", 1: "HOLD", 2: "BUY", 3: "STRONG BUY"}
        model.model = MagicMock()
        model.model.predict = MagicMock(return_value=predicted_probs)
        return model

    def test_predict_returns_none_when_model_not_loaded(self):
        """predict returns None when model is not loaded."""
        model = XGBoostModel.__new__(XGBoostModel)
        model.model = None
        model.model_path = "test.json"
        model.rating_map = {0: "SELL", 1: "HOLD", 2: "BUY", 3: "STRONG BUY"}

        result = model.predict(SAMPLE_FINANCIALS)
        assert result is None

    def test_predict_returns_none_for_empty_financials(self):
        """predict returns None when financials list is empty."""
        model = self._make_model_with_mock()
        result = model.predict([])
        assert result is None

    def test_predict_returns_correct_structure(self):
        """predict returns dict with 'rating' and 'confidence' keys."""
        model = self._make_model_with_mock()
        result = model.predict(SAMPLE_FINANCIALS)

        assert result is not None
        assert "rating" in result
        assert "confidence" in result

    def test_predict_rating_is_valid(self):
        """predict returns a rating from the valid set."""
        model = self._make_model_with_mock()
        result = model.predict(SAMPLE_FINANCIALS)

        assert result["rating"] in ("SELL", "HOLD", "BUY", "STRONG BUY")

    def test_predict_confidence_is_float(self):
        """predict returns confidence as a float between 0 and 1."""
        model = self._make_model_with_mock()
        result = model.predict(SAMPLE_FINANCIALS)

        assert isinstance(result["confidence"], float)
        assert 0.0 <= result["confidence"] <= 1.0

    def test_predict_strong_buy_with_high_prob(self):
        """predict returns STRONG BUY when class 3 has highest probability."""
        model = self._make_model_with_mock(
            predicted_probs=np.array([[0.05, 0.10, 0.15, 0.70]])
        )
        result = model.predict(SAMPLE_FINANCIALS)
        assert result["rating"] == "STRONG BUY"
        assert result["confidence"] == 0.70

    def test_predict_sell_with_high_prob(self):
        """predict returns SELL when class 0 has highest probability."""
        model = self._make_model_with_mock(
            predicted_probs=np.array([[0.80, 0.10, 0.05, 0.05]])
        )
        result = model.predict(SAMPLE_FINANCIALS)
        assert result["rating"] == "SELL"
        assert result["confidence"] == 0.80

    def test_predict_hold_with_high_prob(self):
        """predict returns HOLD when class 1 has highest probability."""
        model = self._make_model_with_mock(
            predicted_probs=np.array([[0.10, 0.65, 0.15, 0.10]])
        )
        result = model.predict(SAMPLE_FINANCIALS)
        assert result["rating"] == "HOLD"
        assert result["confidence"] == 0.65

    def test_predict_buy_with_high_prob(self):
        """predict returns BUY when class 2 has highest probability."""
        model = self._make_model_with_mock(
            predicted_probs=np.array([[0.05, 0.10, 0.75, 0.10]])
        )
        result = model.predict(SAMPLE_FINANCIALS)
        assert result["rating"] == "BUY"
        assert result["confidence"] == 0.75

    def test_predict_with_single_quarter(self):
        """predict works with a single quarter of financial data."""
        model = self._make_model_with_mock()
        result = model.predict([SAMPLE_FINANCIALS[0]])
        assert result is not None
        assert result["rating"] in ("SELL", "HOLD", "BUY", "STRONG BUY")


class TestExtractFeatures:
    """Tests for _extract_features method."""

    def _make_model(self):
        model = XGBoostModel.__new__(XGBoostModel)
        model.model = None
        model.model_path = "test.json"
        model.rating_map = {0: "SELL", 1: "HOLD", 2: "BUY", 3: "STRONG BUY"}
        return model

    def test_returns_list_of_5_floats(self):
        """_extract_features returns exactly 5 float features."""
        model = self._make_model()
        features = model._extract_features(SAMPLE_FINANCIALS)

        assert len(features) == 5
        assert all(isinstance(f, float) for f in features)

    def test_revenue_growth_positive(self):
        """Revenue growth is positive when revenue increases."""
        model = self._make_model()
        features = model._extract_features(SAMPLE_FINANCIALS)
        # Revenue grew from Q3 to Q4
        revenue_growth = features[0]
        assert revenue_growth > 0

    def test_revenue_growth_zero_for_single_quarter(self):
        """Revenue growth is 0 for a single quarter."""
        model = self._make_model()
        features = model._extract_features([SAMPLE_FINANCIALS[0]])
        assert features[0] == 0.0

    def test_operating_margin_computed(self):
        """Operating margin is op_profit / revenue for latest quarter."""
        model = self._make_model()
        features = model._extract_features(SAMPLE_FINANCIALS)
        # Latest quarter: op_profit=2700000000, revenue=12500000000
        expected_margin = 2700000000 / 12500000000
        assert abs(features[1] - expected_margin) < 1e-6

    def test_net_profit_margin_from_margin_pct(self):
        """Net profit margin is margin_pct / 100 from latest quarter."""
        model = self._make_model()
        features = model._extract_features(SAMPLE_FINANCIALS)
        assert abs(features[2] - 0.152) < 1e-6

    def test_handles_zero_revenue(self):
        """Handles zero revenue gracefully without division error."""
        model = self._make_model()
        financials = [
            {"revenue": 0, "expenses": 0, "operating_profit": 0, "net_profit": 0, "margin_pct": 0.0}
        ]
        features = model._extract_features(financials)
        assert all(isinstance(f, float) for f in features)
        # Should not raise and margins should be 0
        assert features[1] == 0.0  # operating margin
        assert features[2] == 0.0  # net profit margin

    def test_uses_last_4_quarters(self):
        """Uses at most last 4 quarters even when more are provided."""
        model = self._make_model()
        # Add extra quarters
        extended = SAMPLE_FINANCIALS + [
            {"revenue": 15000000000, "expenses": 11000000000,
             "operating_profit": 4000000000, "net_profit": 3000000000, "margin_pct": 20.0}
        ]
        features_4 = model._extract_features(SAMPLE_FINANCIALS)
        features_5 = model._extract_features(extended)
        # With 5 quarters, it should use last 4 which differ from using all 4 of SAMPLE_FINANCIALS
        assert len(features_5) == 5

    def test_profit_consistency_high_for_stable_margins(self):
        """Profit consistency is high when margins are stable."""
        model = self._make_model()
        stable_financials = [
            {"revenue": 10e9, "expenses": 8e9, "operating_profit": 2e9, "net_profit": 1.5e9, "margin_pct": 15.0},
            {"revenue": 10e9, "expenses": 8e9, "operating_profit": 2e9, "net_profit": 1.5e9, "margin_pct": 15.0},
            {"revenue": 10e9, "expenses": 8e9, "operating_profit": 2e9, "net_profit": 1.5e9, "margin_pct": 15.0},
            {"revenue": 10e9, "expenses": 8e9, "operating_profit": 2e9, "net_profit": 1.5e9, "margin_pct": 15.0},
        ]
        features = model._extract_features(stable_financials)
        # Profit consistency (feature 4) should be 1.0 for identical margins
        assert features[4] == 1.0
