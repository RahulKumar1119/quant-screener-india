"""Unit tests for the LSTM model wrapper."""

from datetime import date, timedelta
from unittest.mock import MagicMock

import numpy as np
import pandas as pd
import pytest

import importlib.util
import sys
from pathlib import Path

# Direct import to avoid __init__.py pulling in dependencies (xgboost, torch) not installed
_lstm_path = str(Path(__file__).resolve().parent.parent / "ml_models" / "lstm_model.py")
_spec = importlib.util.spec_from_file_location("lstm_model", _lstm_path)
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)
LSTMModel = _module.LSTMModel


class TestLSTMModelInit:
    """Tests for LSTMModel initialization."""

    def test_init_missing_model_file(self, tmp_path):
        """Model loads gracefully when file doesn't exist."""
        model = LSTMModel(model_path=str(tmp_path / "nonexistent.h5"))
        assert model.model is None

    def test_init_loads_model_successfully(self, tmp_path):
        """Model loads when file exists and keras.models.load_model succeeds."""
        import sys
        # Create a fake model file
        model_file = tmp_path / "test_model.h5"
        model_file.write_text("fake model data")

        # Create a fake tensorflow.keras.models module
        mock_keras = MagicMock()
        mock_keras.models.load_model.return_value = MagicMock()
        fake_tf = MagicMock()
        fake_tf.keras = mock_keras
        sys.modules["tensorflow"] = fake_tf
        sys.modules["tensorflow.keras"] = mock_keras
        sys.modules["tensorflow.keras.models"] = mock_keras.models
        try:
            _spec2 = importlib.util.spec_from_file_location("lstm_model_reload", _lstm_path)
            _mod2 = importlib.util.module_from_spec(_spec2)
            _spec2.loader.exec_module(_mod2)
            model = _mod2.LSTMModel(model_path=str(model_file))
            assert model.model is not None
        finally:
            sys.modules.pop("tensorflow", None)
            sys.modules.pop("tensorflow.keras", None)
            sys.modules.pop("tensorflow.keras.models", None)

    def test_init_handles_corrupt_model(self, tmp_path):
        """Model handles corrupt file gracefully."""
        import sys
        model_file = tmp_path / "corrupt.h5"
        model_file.write_text("corrupt data")

        mock_keras = MagicMock()
        mock_keras.models.load_model.side_effect = Exception("corrupt")
        fake_tf = MagicMock()
        fake_tf.keras = mock_keras
        sys.modules["tensorflow"] = fake_tf
        sys.modules["tensorflow.keras"] = mock_keras
        sys.modules["tensorflow.keras.models"] = mock_keras.models
        try:
            _spec2 = importlib.util.spec_from_file_location("lstm_model_reload2", _lstm_path)
            _mod2 = importlib.util.module_from_spec(_spec2)
            _spec2.loader.exec_module(_mod2)
            model = _mod2.LSTMModel(model_path=str(model_file))
            assert model.model is None
        finally:
            sys.modules.pop("tensorflow", None)
            sys.modules.pop("tensorflow.keras", None)
            sys.modules.pop("tensorflow.keras.models", None)


class TestLSTMModelPredict:
    """Tests for LSTMModel.predict method."""

    def _make_model_with_mock(self):
        """Create an LSTMModel with a mocked Keras model."""
        model = LSTMModel.__new__(LSTMModel)
        model.model_path = "test.h5"
        model.model = MagicMock()
        # Mock predict to return a value based on mean of input
        model.model.predict = MagicMock(
            return_value=np.array([[0.1]])
        )
        return model

    def _make_historical_df(self, num_rows=30, base_price=100.0):
        """Create a sample historical DataFrame with CLOSE column."""
        prices = np.linspace(base_price, base_price + num_rows, num_rows)
        return pd.DataFrame({"CLOSE": prices})

    def test_predict_returns_none_when_model_not_loaded(self):
        """predict returns None when model is not loaded."""
        model = LSTMModel.__new__(LSTMModel)
        model.model = None
        model.model_path = "test.h5"

        df = self._make_historical_df()
        result = model.predict(df)
        assert result is None

    def test_predict_returns_none_for_insufficient_data(self):
        """predict returns None when fewer than 30 rows provided."""
        model = self._make_model_with_mock()
        df = pd.DataFrame({"CLOSE": [100.0] * 10})
        result = model.predict(df)
        assert result is None

    def test_predict_returns_none_for_none_input(self):
        """predict returns None when None is passed."""
        model = self._make_model_with_mock()
        result = model.predict(None)
        assert result is None

    def test_predict_returns_correct_structure(self):
        """predict returns dict with 'dates' (7 strings) and 'prices' (7 floats)."""
        model = self._make_model_with_mock()
        df = self._make_historical_df()

        result = model.predict(df)

        assert result is not None
        assert "dates" in result
        assert "prices" in result
        assert len(result["dates"]) == 7
        assert len(result["prices"]) == 7
        assert all(isinstance(d, str) for d in result["dates"])
        assert all(isinstance(p, float) for p in result["prices"])

    def test_predict_uses_last_30_rows_when_more_provided(self):
        """predict uses only the last 30 rows if more are given."""
        model = self._make_model_with_mock()
        df = self._make_historical_df(num_rows=60)

        result = model.predict(df)
        assert result is not None
        assert len(result["prices"]) == 7

    def test_predict_handles_constant_prices(self):
        """predict handles case where all prices are identical (std=0)."""
        model = self._make_model_with_mock()
        df = pd.DataFrame({"CLOSE": [50.0] * 30})

        result = model.predict(df)
        assert result is not None
        assert len(result["prices"]) == 7

    def test_predict_calls_model_seven_times(self):
        """predict calls model.predict exactly 7 times for auto-regressive loop."""
        model = self._make_model_with_mock()
        df = self._make_historical_df()

        model.predict(df)
        assert model.model.predict.call_count == 7


class TestGenerateTradingDates:
    """Tests for LSTMModel._generate_trading_dates."""

    def _make_model(self):
        model = LSTMModel.__new__(LSTMModel)
        model.model = None
        model.model_path = "test.h5"
        return model

    def test_generates_correct_count(self):
        """Generates the requested number of dates."""
        model = self._make_model()
        dates = model._generate_trading_dates(7)
        assert len(dates) == 7

    def test_all_dates_are_weekdays(self):
        """All generated dates fall on weekdays (Mon-Fri)."""
        model = self._make_model()
        dates = model._generate_trading_dates(7)

        for d_str in dates:
            parts = d_str.split("-")
            d = date(int(parts[0]), int(parts[1]), int(parts[2]))
            assert d.weekday() < 5, f"{d_str} is a weekend day"

    def test_dates_are_in_future(self):
        """All generated dates are after today."""
        model = self._make_model()
        dates = model._generate_trading_dates(7)
        today = date.today()

        for d_str in dates:
            parts = d_str.split("-")
            d = date(int(parts[0]), int(parts[1]), int(parts[2]))
            assert d > today

    def test_dates_are_in_order(self):
        """Generated dates are in ascending chronological order."""
        model = self._make_model()
        dates = model._generate_trading_dates(7)

        for i in range(1, len(dates)):
            assert dates[i] > dates[i - 1]

    def test_dates_format_is_yyyy_mm_dd(self):
        """Dates are formatted as YYYY-MM-DD."""
        model = self._make_model()
        dates = model._generate_trading_dates(3)

        for d_str in dates:
            parts = d_str.split("-")
            assert len(parts) == 3
            assert len(parts[0]) == 4
            assert len(parts[1]) == 2
            assert len(parts[2]) == 2

    def test_generates_zero_dates(self):
        """Generates empty list for count=0."""
        model = self._make_model()
        dates = model._generate_trading_dates(0)
        assert dates == []
