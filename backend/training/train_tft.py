"""TFT macro resilience scorer training script.

Trains a simplified Temporal Fusion Transformer (LSTM encoder + attention)
to predict market macro resilience scores from sector momentum features.
Uses sector proxy data fetched from BSE India API.

Usage:
    python train_tft.py --epochs 100 --batch-size 16 --learning-rate 0.001
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
from feature_engineering import engineer_tft_features, generate_tft_labels


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train TFT macro resilience scorer")
    parser.add_argument(
        "--epochs", type=int, default=100, help="Training epochs"
    )
    parser.add_argument(
        "--batch-size", type=int, default=16, help="Batch size"
    )
    parser.add_argument(
        "--learning-rate", type=float, default=0.001, help="Learning rate"
    )
    parser.add_argument(
        "--window", type=int, default=30, help="Sequence window size"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(Path(__file__).resolve().parent.parent / "model_artifacts" / "tft_macro"),
        help="Directory to save model and metrics",
    )
    return parser.parse_args()


def create_sequences(features: np.ndarray, labels: np.ndarray, window: int):
    """Create overlapping sequences for temporal model training.

    Args:
        features: 2D array (timesteps, n_features).
        labels: 1D array of target values.
        window: Sequence length.

    Returns:
        Tuple of (X, y) arrays.
    """
    X, y = [], []
    for i in range(window, len(features)):
        X.append(features[i - window : i])
        y.append(labels[i])
    return np.array(X, dtype=np.float32), np.array(y, dtype=np.float32)


def main() -> None:
    args = parse_args()
    start_time = time.time()

    print("=" * 60)
    print("TFT Macro Resilience Scorer - Training")
    print("=" * 60)
    print(f"  epochs:        {args.epochs}")
    print(f"  batch_size:    {args.batch_size}")
    print(f"  learning_rate: {args.learning_rate}")
    print(f"  window:        {args.window}")
    print(f"  output_dir:    {args.output_dir}")
    print()

    # ---- Step 1: Fetch sector proxy data ----
    print("[1/4] Fetching sector proxy data from BSE...")
    fetcher = TrainingDataFetcher()

    try:
        sector_data = fetcher.fetch_sector_proxy_data(days=365)
    except SystemExit as exc:
        print(f"FATAL: {exc}")
        sys.exit(1)
    finally:
        fetcher.close()

    if not sector_data:
        print("ERROR: No sector data fetched. Cannot proceed.")
        sys.exit(1)

    print(f"  Got data for {len(sector_data)} sectors: {list(sector_data.keys())}")

    # ---- Step 2: Feature engineering ----
    print("\n[2/4] Engineering temporal features...")
    features_df = engineer_tft_features(sector_data)

    if features_df.empty or len(features_df) < args.window + 30:
        print("ERROR: Insufficient feature data for training.")
        sys.exit(1)

    labels = generate_tft_labels(features_df, forward_days=30)

    # Select numeric feature columns (exclude DATE)
    feature_cols = [c for c in features_df.columns if c != "DATE"]
    features_array = features_df[feature_cols].values.astype(np.float32)

    # Align labels with features (drop trailing NaN from forward window)
    valid_mask = labels.notna()
    features_array = features_array[valid_mask.values]
    labels_array = labels[valid_mask].values.astype(np.float32)

    # Replace NaN/inf
    features_array = np.nan_to_num(features_array, nan=0.0, posinf=0.0, neginf=0.0)
    labels_array = np.nan_to_num(labels_array, nan=0.5)

    print(f"  Feature shape: {features_array.shape}")
    print(f"  Labels range: [{labels_array.min():.3f}, {labels_array.max():.3f}]")
    print(f"  Feature columns: {feature_cols}")

    # Create sequences
    X, y = create_sequences(features_array, labels_array, window=args.window)

    if len(X) < 20:
        print(f"ERROR: Too few sequences ({len(X)}). Need at least 20.")
        sys.exit(1)

    print(f"  Sequences: {X.shape[0]}, window: {X.shape[1]}, features: {X.shape[2]}")

    # ---- Step 3: Train model ----
    print("\n[3/4] Training TFT model...")

    # Train/val split (chronological)
    split_idx = int(len(X) * 0.8)
    X_train, X_val = X[:split_idx], X[split_idx:]
    y_train, y_val = y[:split_idx], y[split_idx:]

    print(f"  Train: {len(X_train)}, Validation: {len(X_val)}")

    # Import PyTorch
    try:
        import torch
        import torch.nn as nn
        from torch.utils.data import DataLoader, TensorDataset
    except ImportError:
        print("ERROR: torch not installed. Run: pip install torch")
        sys.exit(1)

    # Define model
    input_dim = X.shape[2]

    class TFTMacroModel(nn.Module):
        """Simplified TFT: LSTM encoder → multi-head attention → FC → Sigmoid."""

        def __init__(self, input_dim: int, hidden_dim: int = 64, num_heads: int = 4):
            super().__init__()
            self.encoder = nn.LSTM(input_dim, hidden_dim, batch_first=True)
            self.attention = nn.MultiheadAttention(hidden_dim, num_heads, batch_first=True)
            self.fc = nn.Sequential(
                nn.Linear(hidden_dim, 32),
                nn.ReLU(),
                nn.Linear(32, 1),
                nn.Sigmoid(),
            )

        def forward(self, x):
            lstm_out, _ = self.encoder(x)
            attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)
            return self.fc(attn_out[:, -1, :]).squeeze(-1)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"  Device: {device}")

    model = TFTMacroModel(input_dim=input_dim, hidden_dim=64, num_heads=4).to(device)

    # DataLoaders
    train_dataset = TensorDataset(
        torch.tensor(X_train, dtype=torch.float32),
        torch.tensor(y_train, dtype=torch.float32),
    )
    val_dataset = TensorDataset(
        torch.tensor(X_val, dtype=torch.float32),
        torch.tensor(y_val, dtype=torch.float32),
    )

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=False)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False)

    # Training setup
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=args.learning_rate, weight_decay=0.01
    )
    criterion = nn.MSELoss()

    best_val_loss = float("inf")
    patience = 15
    patience_counter = 0
    best_state = None

    for epoch in range(args.epochs):
        # Train
        model.train()
        train_loss = 0.0
        for batch_X, batch_y in train_loader:
            batch_X, batch_y = batch_X.to(device), batch_y.to(device)
            optimizer.zero_grad()
            pred = model(batch_X)
            loss = criterion(pred, batch_y)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()

        train_loss /= len(train_loader)

        # Validate
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for batch_X, batch_y in val_loader:
                batch_X, batch_y = batch_X.to(device), batch_y.to(device)
                pred = model(batch_X)
                loss = criterion(pred, batch_y)
                val_loss += loss.item()

        val_loss /= len(val_loader)

        if (epoch + 1) % 10 == 0 or epoch == 0:
            print(
                f"  Epoch {epoch+1:3d}/{args.epochs} - "
                f"train_loss: {train_loss:.6f}, val_loss: {val_loss:.6f}"
            )

        # Early stopping
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            best_state = model.state_dict().copy()
        else:
            patience_counter += 1
            if patience_counter >= patience:
                print(f"  Early stopping at epoch {epoch+1}")
                break

    # Restore best weights
    if best_state is not None:
        model.load_state_dict(best_state)

    # ---- Step 4: Evaluate and save ----
    print("\n[4/4] Evaluating and saving model...")

    model.eval()
    all_preds, all_true = [], []
    with torch.no_grad():
        for batch_X, batch_y in val_loader:
            batch_X = batch_X.to(device)
            pred = model(batch_X)
            all_preds.append(pred.cpu().numpy())
            all_true.append(batch_y.numpy())

    y_pred = np.concatenate(all_preds)
    y_true = np.concatenate(all_true)

    mse = float(np.mean((y_true - y_pred) ** 2))
    mae = float(np.mean(np.abs(y_true - y_pred)))
    # R² score
    ss_res = np.sum((y_true - y_pred) ** 2)
    ss_tot = np.sum((y_true - y_true.mean()) ** 2)
    r2 = float(1 - ss_res / ss_tot) if ss_tot > 0 else 0.0

    print(f"\n  Validation MSE: {mse:.6f}")
    print(f"  Validation MAE: {mae:.6f}")
    print(f"  Validation R²:  {r2:.4f}")

    # Save model
    os.makedirs(args.output_dir, exist_ok=True)
    model_path = os.path.join(args.output_dir, "model.pt")
    torch.save(model.state_dict(), model_path)
    print(f"\n  Model saved to: {model_path}")

    # Save metrics
    duration = time.time() - start_time
    metrics = {
        "model": "tft_macro",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_duration_seconds": round(duration, 1),
        "data_source": "BSE India API (sector proxy OHLC)",
        "sectors_used": list(sector_data.keys()),
        "samples": {"train": len(X_train), "validation": len(X_val)},
        "metrics": {
            "mse": round(mse, 6),
            "mae": round(mae, 6),
            "r2": round(r2, 4),
        },
        "hyperparameters": {
            "epochs_configured": args.epochs,
            "epochs_run": epoch + 1,
            "batch_size": args.batch_size,
            "learning_rate": args.learning_rate,
            "window_size": args.window,
            "hidden_dim": 64,
            "num_heads": 4,
            "architecture": "LSTM(input_dim,64)->MultiheadAttention(64,4)->FC(64,32)->FC(32,1)->Sigmoid",
        },
        "feature_columns": feature_cols,
    }

    metrics_path = os.path.join(args.output_dir, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=2)
    print(f"  Metrics saved to: {metrics_path}")

    print(f"\n  Training completed in {duration:.1f}s")
    print("=" * 60)


if __name__ == "__main__":
    main()
