"""Shared feature engineering functions for ML model training.

Computes features from OHLC price data for XGBoost, LSTM, and TFT models.
Since BSE API provides price data (not quarterly financials), features are
derived from price momentum, volatility, volume trends, and technical indicators.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler


# --------------------------------------------------------------------------
# XGBoost Features (from OHLC price data)
# --------------------------------------------------------------------------


def engineer_xgboost_features(df: pd.DataFrame) -> pd.DataFrame:
    """Compute technical/momentum features from OHLC data for XGBoost.

    Expanded feature set (20+ features) for better classification:
    - Momentum: 5d, 10d, 20d, 30d, 60d returns
    - Volatility: 10d, 20d rolling std
    - Volume: ratio, trend, spike detection
    - Technical: RSI, MACD signal, Bollinger Band position, ADX proxy
    - Price structure: distance from high/low, candle patterns
    - Moving averages: SMA crossovers, EMA ratios

    Args:
        df: DataFrame with columns DATE, OPEN, HIGH, LOW, CLOSE, VOLUME.

    Returns:
        DataFrame with feature columns added. Rows with NaN features are dropped.
    """
    if df.empty or len(df) < 60:
        return pd.DataFrame()

    features = df.copy()

    # Ensure numeric
    for col in ["OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"]:
        features[col] = pd.to_numeric(features[col], errors="coerce").fillna(0)

    close = features["CLOSE"]
    high = features["HIGH"]
    low = features["LOW"]
    open_price = features["OPEN"]
    volume = features["VOLUME"]

    # === Momentum features ===
    features["return_5d"] = close.pct_change(periods=5)
    features["return_10d"] = close.pct_change(periods=10)
    features["return_20d"] = close.pct_change(periods=20)
    features["return_30d"] = close.pct_change(periods=30)
    features["return_60d"] = close.pct_change(periods=60)

    # === Volatility features ===
    daily_returns = close.pct_change()
    features["volatility_10d"] = daily_returns.rolling(window=10).std() * np.sqrt(252)
    features["volatility_20d"] = daily_returns.rolling(window=20).std() * np.sqrt(252)

    # === Volume features ===
    vol_ma20 = volume.rolling(window=20).mean()
    features["volume_ratio"] = volume / vol_ma20.replace(0, np.nan)
    features["volume_trend"] = vol_ma20.pct_change(periods=10)
    features["volume_spike"] = (volume / vol_ma20.replace(0, np.nan)) > 2.0
    features["volume_spike"] = features["volume_spike"].astype(float)

    # === RSI (14-day) ===
    delta = close.diff()
    gain = delta.where(delta > 0, 0).rolling(window=14).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
    rs = gain / loss.replace(0, np.nan)
    features["rsi_14"] = 100 - (100 / (1 + rs))

    # === MACD signal ===
    ema12 = close.ewm(span=12).mean()
    ema26 = close.ewm(span=26).mean()
    macd = ema12 - ema26
    macd_signal = macd.ewm(span=9).mean()
    features["macd_histogram"] = (macd - macd_signal) / close.replace(0, np.nan)

    # === Bollinger Band position (0=lower, 1=upper) ===
    sma20 = close.rolling(window=20).mean()
    std20 = close.rolling(window=20).std()
    upper_band = sma20 + 2 * std20
    lower_band = sma20 - 2 * std20
    band_width = upper_band - lower_band
    features["bb_position"] = (close - lower_band) / band_width.replace(0, np.nan)

    # === Moving average crossovers ===
    sma5 = close.rolling(window=5).mean()
    sma50 = close.rolling(window=50).mean()
    features["ma_5_20_cross"] = (sma5 / sma20.replace(0, np.nan)) - 1.0
    features["ma_20_50_cross"] = (sma20 / sma50.replace(0, np.nan)) - 1.0

    # === EMA ratios ===
    ema9 = close.ewm(span=9).mean()
    ema21 = close.ewm(span=21).mean()
    features["ema_ratio"] = (ema9 / ema21.replace(0, np.nan)) - 1.0

    # === Price structure ===
    rolling_high = high.rolling(window=min(250, len(df))).max()
    rolling_low = low.rolling(window=min(250, len(df))).min()
    features["dist_from_high"] = (close - rolling_high) / rolling_high.replace(0, np.nan)
    features["dist_from_low"] = (close - rolling_low) / rolling_low.replace(0, np.nan)

    # === ATR normalized ===
    tr = pd.concat(
        [
            high - low,
            (high - close.shift(1)).abs(),
            (low - close.shift(1)).abs(),
        ],
        axis=1,
    ).max(axis=1)
    atr_14 = tr.rolling(window=14).mean()
    features["atr_normalized"] = atr_14 / close.replace(0, np.nan)

    # === Candle body ratio ===
    body = (close - open_price).abs()
    full_range = (high - low).replace(0, np.nan)
    features["candle_body_ratio"] = body / full_range

    # === Trend strength (ADX proxy): ratio of directional movement ===
    plus_dm = high.diff()
    minus_dm = -low.diff()
    plus_dm = plus_dm.where(plus_dm > minus_dm, 0).where(plus_dm > 0, 0)
    minus_dm = minus_dm.where(minus_dm > plus_dm, 0).where(minus_dm > 0, 0)
    features["trend_strength"] = (plus_dm.rolling(14).mean() - minus_dm.rolling(14).mean()).abs() / (plus_dm.rolling(14).mean() + minus_dm.rolling(14).mean()).replace(0, np.nan)

    # Select only feature columns
    feature_cols = [
        "return_5d", "return_10d", "return_20d", "return_30d", "return_60d",
        "volatility_10d", "volatility_20d",
        "volume_ratio", "volume_trend", "volume_spike",
        "rsi_14", "macd_histogram", "bb_position",
        "ma_5_20_cross", "ma_20_50_cross", "ema_ratio",
        "dist_from_high", "dist_from_low",
        "atr_normalized", "candle_body_ratio", "trend_strength",
    ]

    result = features[["DATE", "CLOSE"] + feature_cols].copy()
    result = result.dropna(subset=feature_cols).reset_index(drop=True)
    return result


def generate_xgboost_labels(df: pd.DataFrame, forward_days: int = 30) -> pd.Series:
    """Generate classification labels from forward returns.

    Label scheme based on 30-day forward price performance:
    - 0 (SELL): price declined > 5%
    - 1 (HOLD): price change between -5% and +5%
    - 2 (BUY): price increased 5% to 15%
    - 3 (STRONG BUY): price increased > 15%

    Uses 30-day window (shorter = more predictable from technicals).

    Args:
        df: DataFrame with CLOSE column.
        forward_days: Number of days to look ahead. Default 30.

    Returns:
        Series of integer labels (0-3). Length may be shorter than input
        due to forward-looking window.
    """
    close = pd.to_numeric(df["CLOSE"], errors="coerce")
    forward_return = close.shift(-forward_days) / close - 1.0

    labels = pd.Series(np.nan, index=df.index, dtype="float64")
    labels[forward_return < -0.05] = 0   # SELL (> 5% decline)
    labels[(forward_return >= -0.05) & (forward_return < 0.05)] = 1  # HOLD
    labels[(forward_return >= 0.05) & (forward_return < 0.15)] = 2   # BUY
    labels[forward_return >= 0.15] = 3   # STRONG BUY (> 15% gain)

    return labels


LABEL_NAMES = {0: "SELL", 1: "HOLD", 2: "BUY", 3: "STRONG BUY"}


# --------------------------------------------------------------------------
# LSTM Features (sliding window sequences)
# --------------------------------------------------------------------------


def create_lstm_sequences(
    prices: np.ndarray, window: int = 30
) -> tuple[np.ndarray, np.ndarray, MinMaxScaler]:
    """Create sliding window sequences for LSTM training.

    Normalizes prices using MinMaxScaler, then creates overlapping windows
    of `window` days as input, with the next day's price as the target.

    Args:
        prices: 1D array of close prices.
        window: Number of lookback days per sequence. Default 30.

    Returns:
        Tuple of (X, y, scaler) where:
        - X: shape (n_samples, window, 1) input sequences
        - y: shape (n_samples,) target values (next day normalized close)
        - scaler: fitted MinMaxScaler for inverse transform
    """
    prices = np.array(prices, dtype=np.float64).reshape(-1, 1)

    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled = scaler.fit_transform(prices).flatten()

    X, y = [], []
    for i in range(window, len(scaled)):
        X.append(scaled[i - window : i])
        y.append(scaled[i])

    X = np.array(X).reshape(-1, window, 1)
    y = np.array(y)

    return X, y, scaler


# --------------------------------------------------------------------------
# TFT Features (sector momentum and velocity)
# --------------------------------------------------------------------------


def engineer_tft_features(sector_data: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Engineer temporal features for TFT model from sector proxy data.

    Computes momentum and velocity features for each sector:
    - 7-day momentum (% change)
    - 14-day momentum
    - 30-day momentum
    - Momentum velocity (acceleration of momentum)
    - Cross-sector dispersion (std of all sector momentums)

    Args:
        sector_data: Dict mapping sector name to OHLC DataFrame.

    Returns:
        DataFrame with date index and feature columns for all sectors.
        Columns named as: {SECTOR}_mom_7d, {SECTOR}_mom_14d, etc.
    """
    if not sector_data:
        return pd.DataFrame()

    all_features = {}
    date_index = None

    for sector, df in sector_data.items():
        if df.empty or len(df) < 30:
            continue

        close = pd.to_numeric(df["CLOSE"], errors="coerce")
        dates = pd.to_datetime(df["DATE"])

        # Momentum features
        mom_7d = close.pct_change(periods=7)
        mom_14d = close.pct_change(periods=14)
        mom_30d = close.pct_change(periods=30)

        # Velocity (rate of change of momentum)
        velocity = mom_7d.diff(periods=7)

        all_features[f"{sector}_mom_7d"] = mom_7d.values
        all_features[f"{sector}_mom_14d"] = mom_14d.values
        all_features[f"{sector}_mom_30d"] = mom_30d.values
        all_features[f"{sector}_velocity"] = velocity.values

        if date_index is None:
            date_index = dates.values

    if not all_features:
        return pd.DataFrame()

    # Align all features to the shortest series
    min_len = min(len(v) for v in all_features.values())
    aligned = {k: v[:min_len] for k, v in all_features.items()}

    result = pd.DataFrame(aligned)

    if date_index is not None:
        result["DATE"] = date_index[:min_len]

    # Cross-sector dispersion: std of all sector 7d momentums
    mom_cols = [c for c in result.columns if c.endswith("_mom_7d")]
    if mom_cols:
        result["sector_dispersion"] = result[mom_cols].std(axis=1)

    # Drop rows with NaN
    result = result.dropna().reset_index(drop=True)
    return result


def generate_tft_labels(
    features_df: pd.DataFrame, forward_days: int = 30
) -> pd.Series:
    """Generate resilience score labels for TFT model.

    Resilience score (0 to 1) based on forward sector performance:
    - High resilience: sectors perform well despite dispersion
    - Low resilience: sectors decline with high dispersion

    Args:
        features_df: DataFrame from engineer_tft_features.
        forward_days: Days to look ahead for label.

    Returns:
        Series of resilience scores (0-1).
    """
    # Use average of all sector momentums as a proxy for market resilience
    mom_cols = [c for c in features_df.columns if c.endswith("_mom_30d")]
    if not mom_cols:
        return pd.Series(dtype=float)

    avg_momentum = features_df[mom_cols].mean(axis=1)

    # Shift forward to create labels
    forward_avg = avg_momentum.shift(-forward_days)

    # Normalize to 0-1 using sigmoid-like transform
    # Positive momentum -> high resilience, negative -> low
    resilience = 1 / (1 + np.exp(-forward_avg * 20))  # Scale factor for sensitivity

    return resilience
