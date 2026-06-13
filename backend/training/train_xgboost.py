"""XGBoost rating classifier training script.

Trains a multi-class XGBoost classifier to predict stock ratings
(SELL/HOLD/BUY/STRONG BUY) based on price momentum and technical features
derived from historical OHLC data fetched from BSE India API.

Usage:
    python train_xgboost.py --n-estimators 200 --max-depth 6 --output-dir ../model_artifacts/xgboost_rating/
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
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, confusion_matrix

from data_fetcher import TrainingDataFetcher
from feature_engineering import (
    LABEL_NAMES,
    engineer_xgboost_features,
    generate_xgboost_labels,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train XGBoost rating classifier")
    parser.add_argument(
        "--n-estimators", type=int, default=200, help="Number of boosting rounds"
    )
    parser.add_argument(
        "--max-depth", type=int, default=6, help="Maximum tree depth"
    )
    parser.add_argument(
        "--learning-rate", type=float, default=0.1, help="Learning rate"
    )
    parser.add_argument(
        "--top-n", type=int, default=100, help="Number of top stocks to use for training"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(Path(__file__).resolve().parent.parent / "model_artifacts" / "xgboost_rating"),
        help="Directory to save model and metrics",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    start_time = time.time()

    print("=" * 60)
    print("XGBoost Rating Classifier - Training")
    print("=" * 60)
    print(f"  n_estimators: {args.n_estimators}")
    print(f"  max_depth:    {args.max_depth}")
    print(f"  learning_rate:{args.learning_rate}")
    print(f"  top_n stocks: {args.top_n}")
    print(f"  output_dir:   {args.output_dir}")
    print()

    # ---- Step 1: Fetch stock data ----
    print("[1/5] Fetching stock list from BSE...")
    fetcher = TrainingDataFetcher()

    try:
        stocks = fetcher.fetch_stock_list(min_market_cap_cr=1000.0)
    except SystemExit as exc:
        print(f"FATAL: {exc}")
        sys.exit(1)

    if not stocks:
        print("ERROR: No stocks found. Cannot proceed.")
        sys.exit(1)

    # Take top N by market cap
    top_stocks = stocks[: args.top_n]
    symbols = [s["symbol"] for s in top_stocks]
    print(f"  Using {len(symbols)} stocks for training.")

    # ---- Step 2: Fetch OHLC data ----
    print(f"\n[2/5] Fetching 1-year OHLC for {len(symbols)} stocks...")
    ohlc_data = fetcher.fetch_multiple_ohlc(symbols, days=365, delay=0.5)
    fetcher.close()

    if not ohlc_data:
        print("ERROR: No OHLC data fetched. Cannot proceed.")
        sys.exit(1)

    print(f"  Got data for {len(ohlc_data)} stocks.")

    # ---- Step 3: Feature engineering ----
    print("\n[3/5] Engineering features...")
    all_features = []
    all_labels = []

    for symbol, df in ohlc_data.items():
        features_df = engineer_xgboost_features(df)
        if features_df.empty:
            continue

        labels = generate_xgboost_labels(features_df, forward_days=90)

        # Align features and labels (drop NaN labels from forward window)
        valid_mask = labels.notna()
        if valid_mask.sum() < 10:
            continue

        feature_cols = [
            "return_30d",
            "return_60d",
            "volatility_20d",
            "volume_ratio",
            "rsi_14",
            "ma_crossover",
            "dist_from_high",
            "atr_normalized",
        ]

        features_valid = features_df.loc[valid_mask, feature_cols]
        labels_valid = labels[valid_mask].astype(int)

        all_features.append(features_valid)
        all_labels.append(labels_valid)

    if not all_features:
        print("ERROR: No valid features generated. Cannot train model.")
        sys.exit(1)

    X = pd.concat(all_features, ignore_index=True)
    y = pd.concat(all_labels, ignore_index=True)

    # Replace inf values
    X = X.replace([np.inf, -np.inf], np.nan).fillna(0)

    print(f"  Total samples: {len(X)}")
    print(f"  Label distribution:")
    for label_id, label_name in LABEL_NAMES.items():
        count = (y == label_id).sum()
        print(f"    {label_name}: {count} ({count/len(y)*100:.1f}%)")

    # ---- Step 4: Train/validation split (chronological) ----
    print("\n[4/5] Training XGBoost model...")
    split_idx = int(len(X) * 0.8)
    X_train, X_val = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_val = y.iloc[:split_idx], y.iloc[split_idx:]

    print(f"  Train: {len(X_train)} samples, Validation: {len(X_val)} samples")

    # Import xgboost here so we fail fast if dependency missing
    try:
        import xgboost as xgb
    except ImportError:
        print("ERROR: xgboost not installed. Run: pip install xgboost")
        sys.exit(1)

    model = xgb.XGBClassifier(
        objective="multi:softprob",
        num_class=4,
        n_estimators=args.n_estimators,
        max_depth=args.max_depth,
        learning_rate=args.learning_rate,
        eval_metric="mlogloss",
        early_stopping_rounds=20,
        use_label_encoder=False,
        random_state=42,
    )

    model.fit(
        X_train,
        y_train,
        eval_set=[(X_val, y_val)],
        verbose=True,
    )

    # ---- Step 5: Evaluate and save ----
    print("\n[5/5] Evaluating and saving model...")
    y_pred = model.predict(X_val)

    accuracy = accuracy_score(y_val, y_pred)
    f1_macro = f1_score(y_val, y_pred, average="macro", zero_division=0)
    f1_per_class = f1_score(y_val, y_pred, average=None, zero_division=0)
    conf_matrix = confusion_matrix(y_val, y_pred, labels=[0, 1, 2, 3])

    print(f"\n  Accuracy: {accuracy:.4f}")
    print(f"  F1 Macro: {f1_macro:.4f}")
    for i, name in LABEL_NAMES.items():
        f1_val = f1_per_class[i] if i < len(f1_per_class) else 0.0
        print(f"  F1 {name}: {f1_val:.4f}")

    # Save model
    os.makedirs(args.output_dir, exist_ok=True)
    model_path = os.path.join(args.output_dir, "model.json")
    model.save_model(model_path)
    print(f"\n  Model saved to: {model_path}")

    # Save metrics
    duration = time.time() - start_time
    metrics = {
        "model": "xgboost_rating",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_duration_seconds": round(duration, 1),
        "data_source": "BSE India API (historical OHLC)",
        "samples": {"train": len(X_train), "validation": len(X_val)},
        "metrics": {
            "accuracy": round(accuracy, 4),
            "f1_macro": round(f1_macro, 4),
            "per_class_f1": {
                LABEL_NAMES[i]: round(f1_per_class[i], 4) if i < len(f1_per_class) else 0.0
                for i in range(4)
            },
            "confusion_matrix": conf_matrix.tolist(),
        },
        "hyperparameters": {
            "n_estimators": args.n_estimators,
            "max_depth": args.max_depth,
            "learning_rate": args.learning_rate,
        },
        "features": [
            "return_30d",
            "return_60d",
            "volatility_20d",
            "volume_ratio",
            "rsi_14",
            "ma_crossover",
            "dist_from_high",
            "atr_normalized",
        ],
    }

    metrics_path = os.path.join(args.output_dir, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"  Metrics saved to: {metrics_path}")

    print(f"\n  Training completed in {duration:.1f}s")
    print("=" * 60)


if __name__ == "__main__":
    main()
