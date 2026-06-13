"""LSTM price projection model training script.

Trains a Keras LSTM model to predict next-day close prices from
30-day sliding window sequences. Uses historical OHLC data fetched
from BSE India API.

Usage:
    python train_lstm.py --epochs 50 --batch-size 32 --tickers RELIANCE,TCS,INFY
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from data_fetcher import TrainingDataFetcher
from feature_engineering import create_lstm_sequences


# Default tickers: top Indian large-caps
DEFAULT_TICKERS = "RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK,HINDUNILVR,ITC,SBIN,BHARTIARTL,LT"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train LSTM price projection model")
    parser.add_argument(
        "--epochs", type=int, default=50, help="Training epochs"
    )
    parser.add_argument(
        "--batch-size", type=int, default=32, help="Batch size"
    )
    parser.add_argument(
        "--tickers",
        type=str,
        default=DEFAULT_TICKERS,
        help="Comma-separated list of NSE ticker symbols",
    )
    parser.add_argument(
        "--window", type=int, default=30, help="Lookback window size in days"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(Path(__file__).resolve().parent.parent / "model_artifacts" / "lstm_price"),
        help="Directory to save model and metrics",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    start_time = time.time()

    tickers = [t.strip().upper() for t in args.tickers.split(",") if t.strip()]

    print("=" * 60)
    print("LSTM Price Projection - Training")
    print("=" * 60)
    print(f"  epochs:     {args.epochs}")
    print(f"  batch_size: {args.batch_size}")
    print(f"  window:     {args.window}")
    print(f"  tickers:    {', '.join(tickers)}")
    print(f"  output_dir: {args.output_dir}")
    print()

    # ---- Step 1: Fetch OHLC data ----
    print("[1/4] Fetching historical OHLC data from BSE...")
    fetcher = TrainingDataFetcher()

    try:
        ohlc_data = fetcher.fetch_multiple_ohlc(tickers, days=365, delay=0.5)
    except SystemExit as exc:
        print(f"FATAL: {exc}")
        sys.exit(1)
    finally:
        fetcher.close()

    if not ohlc_data:
        print("ERROR: No OHLC data fetched. Cannot proceed.")
        sys.exit(1)

    print(f"  Got data for {len(ohlc_data)} tickers.")

    # ---- Step 2: Create sequences ----
    print("\n[2/4] Creating sliding window sequences...")
    all_X, all_y = [], []
    scalers = {}

    for symbol, df in ohlc_data.items():
        prices = df["CLOSE"].values
        if len(prices) < args.window + 10:
            print(f"  Skipping {symbol}: insufficient data ({len(prices)} days)")
            continue

        X, y, scaler = create_lstm_sequences(prices, window=args.window)
        all_X.append(X)
        all_y.append(y)
        scalers[symbol] = scaler
        print(f"  {symbol}: {len(X)} sequences")

    if not all_X:
        print("ERROR: No valid sequences created. Cannot train.")
        sys.exit(1)

    X = np.concatenate(all_X, axis=0)
    y = np.concatenate(all_y, axis=0)
    print(f"\n  Total sequences: {X.shape[0]}, window: {X.shape[1]}")

    # ---- Step 3: Train/validation split (chronological) ----
    print("\n[3/4] Training LSTM model...")
    split_idx = int(len(X) * 0.8)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]

    print(f"  Train: {len(X_train)}, Validation: {len(X_val)}")

    # Import TensorFlow/Keras
    try:
        os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "2")
        import tensorflow as tf
        from tensorflow import keras
    except ImportError:
        print("ERROR: tensorflow not installed. Run: pip install tensorflow")
        sys.exit(1)

    # Build model
    model = keras.Sequential([
        keras.layers.LSTM(64, input_shape=(args.window, 1), return_sequences=True),
        keras.layers.Dropout(0.2),
        keras.layers.LSTM(32),
        keras.layers.Dropout(0.2),
        keras.layers.Dense(1),
    ])

    model.compile(optimizer="adam", loss="mse", metrics=["mae"])
    model.summary()

    # Callbacks
    callbacks = [
        keras.callbacks.EarlyStopping(
            monitor="val_loss", patience=10, restore_best_weights=True
        ),
        keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss", factor=0.5, patience=5, min_lr=1e-6
        ),
    ]

    # Train
    history = model.fit(
        X_train,
        y_train,
        epochs=args.epochs,
        batch_size=args.batch_size,
        validation_data=(X_val, y_val),
        callbacks=callbacks,
        verbose=1,
    )

    # ---- Step 4: Evaluate and save ----
    print("\n[4/4] Evaluating and saving model...")
    val_loss, val_mae = model.evaluate(X_val, y_val, verbose=0)

    # Calculate MAPE
    y_pred = model.predict(X_val, verbose=0).flatten()
    nonzero_mask = y_val != 0
    if nonzero_mask.sum() > 0:
        mape = np.mean(np.abs((y_val[nonzero_mask] - y_pred[nonzero_mask]) / y_val[nonzero_mask])) * 100
    else:
        mape = 0.0

    print(f"\n  Validation MSE:  {val_loss:.6f}")
    print(f"  Validation MAE:  {val_mae:.6f}")
    print(f"  Validation MAPE: {mape:.2f}%")

    # Save model (Keras SavedModel format)
    os.makedirs(args.output_dir, exist_ok=True)
    model_path = os.path.join(args.output_dir, "saved_model")
    model.save(model_path)
    print(f"\n  Model saved to: {model_path}")

    # Save metrics
    duration = time.time() - start_time
    metrics = {
        "model": "lstm_price",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_duration_seconds": round(duration, 1),
        "data_source": "BSE India API (1-year daily OHLC)",
        "tickers_used": list(ohlc_data.keys()),
        "samples": {"train": len(X_train), "validation": len(X_val)},
        "metrics": {
            "mse": round(float(val_loss), 6),
            "mae": round(float(val_mae), 6),
            "mape_percent": round(float(mape), 2),
        },
        "hyperparameters": {
            "epochs_configured": args.epochs,
            "epochs_run": len(history.history["loss"]),
            "batch_size": args.batch_size,
            "window_size": args.window,
            "architecture": "LSTM(64)->Dropout(0.2)->LSTM(32)->Dropout(0.2)->Dense(1)",
        },
    }

    metrics_path = os.path.join(args.output_dir, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"  Metrics saved to: {metrics_path}")

    print(f"\n  Training completed in {duration:.1f}s")
    print("=" * 60)


if __name__ == "__main__":
    main()
