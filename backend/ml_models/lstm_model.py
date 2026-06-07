"""LSTM Model wrapper for 7-day price projection from 30-day historical OHLC."""

import logging
from datetime import date, timedelta
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class LSTMModel:
    """Produces 7-day price projection from 30-day historical OHLC closing prices.

    Loads a pre-trained Keras LSTM model from an .h5 file and performs
    auto-regressive prediction of 7 future trading days.
    """

    SEQUENCE_LENGTH = 30
    PREDICTION_STEPS = 7

    def __init__(self, model_path: str = "model_artifacts/lstm_price.h5"):
        self.model = None
        self.model_path = Path(model_path)

        if not self.model_path.exists():
            logger.warning(
                "LSTM model file not found at %s. Predictions will be unavailable.",
                self.model_path,
            )
            return

        try:
            from tensorflow import keras

            self.model = keras.models.load_model(str(self.model_path))
            logger.info("LSTM model loaded successfully from %s", self.model_path)
        except Exception as e:
            logger.error("Failed to load LSTM model from %s: %s", self.model_path, e)
            self.model = None

    def predict(self, historical_df: pd.DataFrame) -> Optional[Dict]:
        """Predict 7-day price projection from 30-day historical close prices.

        Args:
            historical_df: DataFrame with at least 30 rows and a 'CLOSE' column.

        Returns:
            Dictionary with 'dates' (list of 7 date strings) and 'prices'
            (list of 7 floats), or None if prediction fails.
        """
        if self.model is None:
            logger.warning("LSTM model not loaded. Cannot produce predictions.")
            return None

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
            mean_price = close_prices.mean()
            std_price = close_prices.std()

            # Avoid division by zero if all prices are identical
            if std_price == 0:
                std_price = 1.0

            normalized = (close_prices - mean_price) / std_price

            # Reshape for LSTM input: (batch_size=1, timesteps=30, features=1)
            input_seq = normalized.reshape(1, self.SEQUENCE_LENGTH, 1)

            # Auto-regressive prediction: feed each prediction back into the sequence
            predictions = []
            current_seq = input_seq.copy()

            for _ in range(self.PREDICTION_STEPS):
                pred = self.model.predict(current_seq, verbose=0)[0, 0]
                predictions.append(float(pred))
                # Shift sequence left and append the new prediction
                current_seq = np.roll(current_seq, -1, axis=1)
                current_seq[0, -1, 0] = pred

            # Denormalize predictions back to price scale
            prices = [(p * std_price + mean_price) for p in predictions]

            # Generate 7 future trading dates (weekdays only)
            dates = self._generate_trading_dates(self.PREDICTION_STEPS)

            return {
                "dates": dates,
                "prices": [round(p, 2) for p in prices],
            }

        except Exception as e:
            logger.error("LSTM prediction failed: %s", e)
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
            # weekday(): Monday=0 ... Friday=4, Saturday=5, Sunday=6
            if current.weekday() < 5:
                trading_dates.append(current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)

        return trading_dates
