# ML Model Training Pipeline

Training scripts for the Quant Screener India ML models. Fetches historical market data from BSE India API and trains two models:

1. **XGBoost Rating Classifier** — Predicts stock ratings (SELL/HOLD/BUY/STRONG BUY) from price momentum features
2. **TFT Macro Resilience Scorer** — Scores market macro resilience from sector momentum patterns

## Prerequisites

```bash
pip install -r requirements.txt
```

Requires Python 3.9+ and the following libraries:
- scikit-learn, xgboost (XGBoost model)
- torch/PyTorch (TFT model)
- pandas, numpy, matplotlib (shared)
- httpx (BSE API data fetching)

## Quick Start

Train all models with default settings:

```bash
cd backend/training
python train_all.py
```

This will:
1. Fetch stock data from BSE India API (api.bseindia.com)
2. Train each model sequentially
3. Save artifacts to `backend/model_artifacts/`

## Individual Training Scripts

### XGBoost Rating Classifier

```bash
python train_xgboost.py \
    --n-estimators 200 \
    --max-depth 6 \
    --learning-rate 0.1 \
    --top-n 100 \
    --output-dir ../model_artifacts/xgboost_rating/
```

**Features used**: 30-day return, 60-day return, volatility, volume ratio, RSI, MA crossover, distance from high, ATR.

**Labels**: Based on 90-day forward returns (SELL <-10%, HOLD -10% to +5%, BUY +5% to +20%, STRONG BUY >+20%).

**Output**: `model.json` + `metrics.json`

### TFT Macro Resilience Scorer

```bash
python train_tft.py \
    --epochs 100 \
    --batch-size 16 \
    --learning-rate 0.001 \
    --window 30 \
    --output-dir ../model_artifacts/tft_macro/
```

**Architecture**: LSTM encoder → MultiheadAttention(4 heads) → FC → Sigmoid

**Output**: `model.pt` (PyTorch state_dict) + `metrics.json`

## Data Source

All data is fetched from **BSE India API** (`api.bseindia.com`), which works reliably from cloud IPs without session cookie issues.

- **Stock list**: `ListofScripData` endpoint (active equity segment)
- **Historical OHLC**: `StockPriceCSVDownload` endpoint
- **Symbol mapping**: NSE symbols mapped to BSE scrip codes via ISIN cross-reference using NSE equity master CSV (`archives.nseindia.com/content/equities/EQUITY_L.csv`)

## Output Structure

```
backend/model_artifacts/
├── xgboost_rating/
│   ├── model.json        # XGBoost serialized model
│   └── metrics.json      # Training metrics and config
└── tft_macro/
    ├── model.pt          # PyTorch state_dict
    └── metrics.json
```

## Metrics JSON Format

Each training script produces a `metrics.json` with:

```json
{
  "model": "model_name",
  "trained_at": "ISO 8601 timestamp",
  "training_duration_seconds": 145,
  "data_source": "BSE India API",
  "samples": { "train": 3200, "validation": 800 },
  "metrics": { ... },
  "hyperparameters": { ... }
}
```

## Notes

- Training uses chronological train/validation split (80/20) to prevent look-ahead bias
- BSE API rate limiting: 0.5s delay between requests
- If BSE API is unreachable, scripts exit with clear error messages
- XGBoost features are derived from price data (momentum/technical indicators) since BSE API doesn't provide quarterly financials
- Sector proxy stocks (HDFCBANK, TCS, SUNPHARMA, MARUTI, HINDUNILVR) are used for TFT training since BSE doesn't expose Nifty sector indices directly
