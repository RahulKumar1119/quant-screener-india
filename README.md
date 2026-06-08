# Quant Screener India

AI-powered Financial Stock Screening and Analytics Platform for the Indian Stock Market (NSE), inspired by Screener.in.

## Overview

A full-stack platform that fetches **real-time data from NSE India** and applies four ML models to deliver intelligent stock analysis, interactive charting, financial data tables, and a custom query-based screener — all with Indian localization (₹, Crores, Lakhs).

## Architecture

Split architecture separating the lightweight API layer (Lambda) from heavy ML inference (SageMaker Serverless):

```
Browser → Amplify (static SPA)
              ↓ /api/*
         API Gateway → Lambda (FastAPI + Mangum)
              ↓                    ↓                    ↓
         NSE India APIs    SageMaker Endpoints    AWS Bedrock
         (jugaad-data)     (XGBoost, LSTM, TFT)  (Gemma 3 4B IT)
              ↓
         DynamoDB (cache)
```

- **Frontend**: React 19 + Rsbuild (Rspack) + Tailwind CSS → static SPA (`dist/`) on AWS Amplify
- **Backend (Lambda)**: FastAPI + Mangum, lightweight (<250MB) — handles API routing, NSE data fetching, DynamoDB caching, and ML endpoint orchestration
- **ML Inference (SageMaker)**: XGBoost, LSTM, and TFT models run on SageMaker Serverless Inference Endpoints — auto-scales to zero when idle
- **LLM (Bedrock)**: Gemma 3 4B IT via AWS Bedrock for narrative summary generation
- **Data Source**: NSE India public APIs via `jugaad-data` Python library

## Tech Stack

### Frontend
- React 19 with TypeScript
- Rsbuild (Rspack-powered) — builds to static `dist/`
- Tailwind CSS with dark/light theme (`class` strategy)
- Recharts for gauges and supplementary charts
- TradingView Lightweight Charts for price visualization
- TanStack Table (React Table) for financial data grids
- React Router for client-side routing

### Backend (Lambda)
- FastAPI + Mangum (AWS Lambda adapter)
- `jugaad-data` for NSE live quotes, historical OHLC, RBI data
- `cachetools` for in-memory TTL caching
- `boto3` for SageMaker Runtime + Bedrock Runtime invocations
- `httpx` for custom NSE API calls
- `pandas` + `numpy` for data manipulation
- DynamoDB for persistent caching layer

### ML Models (SageMaker Serverless Inference)
- XGBoost — stock rating from quarterly financials
- LSTM (TensorFlow) — 7-day price projection from historical OHLC
- TFT (PyTorch) — Macro Resilience Score from RBI REPO rate + sector indices
- Each endpoint uses `ServerlessConfig` with `MaxConcurrency: 5`, `MemorySizeInMB: 2048`

### LLM (AWS Bedrock)
- Gemma 3 4B IT — SEBI-style fundamental analysis narrative generation

## Features

### Analytics Dashboard
- **Profile Ratios Card Grid** — Market Cap (₹ Cr), P/E, ROE%, ROCE%, Dividend Yield% with color-coded threshold badges
- **AI Technical Horizon Chart** — 30-day historical prices + 7-day LSTM projection (Royal Blue dotted line), weekends excluded
- **ML Scoring Panel** — TFT Macro Resilience Score gauge (0–100) + XGBoost rating badge (STRONG BUY/BUY/HOLD/SELL)
- **Quarterly Financial Table** — Screener.in-style sortable table with Indian Crores formatting
- **AI Narrative Summary** — Gemma 3 4B IT (AWS Bedrock) SEBI-style fundamental analysis

### Custom Screener
- Text-based fundamental query language (e.g., `PE < 25 AND ROE > 15 AND AI_Rating = "STRONG BUY"`)
- Helper panel with available fields and operators
- Paginated, sortable results grid across Nifty 500 stocks

### Localization
- Indian numbering system (Lakhs, Crores) with ₹ symbol
- NSE stock symbols and market conventions
- Trading-day-aware date axes (weekends excluded)

## ML Models

| Model | Runtime | Input | Output |
|-------|---------|-------|--------|
| XGBoost | SageMaker Serverless | Quarterly financials (revenue, margins, growth) | Rating (STRONG BUY/BUY/HOLD/SELL) + confidence |
| LSTM | SageMaker Serverless | 30-day historical OHLC | 7-day price projection |
| TFT | SageMaker Serverless | RBI REPO rate + Nifty sector indices | Macro Resilience Score (0–100) + trend outlook |
| Gemma 3 4B IT | AWS Bedrock | Financial data + quote + rating | SEBI-style narrative summary |

### Graceful Degradation

- XGBoost/LSTM: return `null` if SageMaker endpoint unavailable (frontend handles nullable fields)
- TFT: falls back to heuristic scoring using sector index averages and repo rate positioning
- Gemma: returns empty string on Bedrock failure

## Project Structure

```
├── src/                          # Frontend (React SPA)
│   ├── components/               # UI components (15 modules)
│   ├── hooks/                    # Custom hooks (useTheme, useTickerData, useScreenerQuery)
│   ├── utils/                    # Utilities (indianFormat, tradingDates, queryParser, thresholds)
│   ├── types/                    # TypeScript interfaces
│   ├── api/                      # API client
│   ├── App.tsx                   # Root component with routing
│   └── main.tsx                  # Entry point
├── backend/                      # Lambda Function (FastAPI)
│   ├── app.py                    # FastAPI application + Mangum handler
│   ├── nse_client.py             # NSE data fetching (jugaad-data)
│   ├── cache.py                  # TTL cache manager (5 tiers)
│   ├── rate_limiter.py           # Token bucket rate limiter
│   ├── schemas.py                # Pydantic response models
│   ├── ml_models/                # ML endpoint invocation wrappers
│   │   ├── xgboost_model.py     # → SageMaker (quant-screener-xgboost)
│   │   ├── lstm_model.py        # → SageMaker (quant-screener-lstm)
│   │   ├── tft_model.py         # → SageMaker (quant-screener-tft)
│   │   └── gemma_model.py       # → AWS Bedrock (Gemma 3 4B IT)
│   ├── training/                 # ML model training scripts
│   │   ├── train_all.py         # Orchestrator
│   │   ├── train_xgboost.py    # XGBoost training
│   │   ├── train_lstm.py       # LSTM training
│   │   ├── train_tft.py        # TFT training
│   │   ├── data_fetcher.py     # Shared NSE data fetching
│   │   ├── feature_engineering.py # Shared feature engineering
│   │   └── requirements.txt    # Training dependencies
│   ├── deploy.sh                 # Lambda packaging script
│   ├── requirements.txt          # Lightweight deps (no ML frameworks)
│   └── template.yaml             # SAM template for Lambda + API Gateway
├── infra/                        # Infrastructure as Code
│   ├── sagemaker-endpoints.yaml  # CloudFormation: SageMaker Serverless Endpoints
│   ├── dynamodb-cache-table.yaml # CloudFormation: DynamoDB cache table
│   └── dynamodb-table.yaml       # CloudFormation: DynamoDB data table
├── rsbuild.config.ts             # Rsbuild configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── package.json                  # Frontend dependencies
└── tsconfig.json                 # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- AWS CLI configured with appropriate permissions
- AWS SAM CLI (for Lambda deployment)
- AWS account with:
  - Bedrock access (Gemma 3 4B IT)
  - SageMaker access (for serverless endpoints)
  - S3 bucket for model artifacts

### Backend Setup (Local Development)

```bash
cd backend
pip install -r requirements.txt

# Set environment variables for SageMaker endpoints
export XGBOOST_ENDPOINT=quant-screener-xgboost
export LSTM_ENDPOINT=quant-screener-lstm
export TFT_ENDPOINT=quant-screener-tft
export AWS_REGION=us-east-1

# Start the backend server locally
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

```bash
npm install

# Start the dev server (port 3000, proxies API to localhost:8000)
npm run dev
```

### Production Build (Frontend)

```bash
npm run build
# Output: dist/ — deploy to AWS Amplify
```

## Deployment

### 1. Deploy SageMaker Endpoints

Upload model artifacts to S3, then deploy the SageMaker stack:

```bash
# Upload model artifacts
aws s3 cp model_artifacts/xgboost_rating.json s3://quant-screener-india-models/xgboost/model.tar.gz
aws s3 cp model_artifacts/lstm_price.h5 s3://quant-screener-india-models/lstm/model.tar.gz
aws s3 cp model_artifacts/tft_macro.pt s3://quant-screener-india-models/tft/model.tar.gz

# Deploy SageMaker endpoints (serverless, scales to zero when idle)
aws cloudformation deploy \
    --template-file infra/sagemaker-endpoints.yaml \
    --stack-name quant-screener-sagemaker \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameter-overrides \
        S3BucketName=quant-screener-india-models
```

### 2. Deploy Lambda Backend

```bash
cd backend

# Build the lightweight Lambda package (<250MB, no ML frameworks)
chmod +x deploy.sh
./deploy.sh

# Deploy to AWS via SAM
./deploy.sh --deploy
```

### 3. Deploy Frontend

```bash
npm run build
# Deploy dist/ to AWS Amplify via console or CLI
```

## Environment Variables (Lambda)

| Variable | Description | Default |
|----------|-------------|---------|
| `XGBOOST_ENDPOINT` | SageMaker endpoint name for XGBoost | `quant-screener-xgboost` |
| `LSTM_ENDPOINT` | SageMaker endpoint name for LSTM | `quant-screener-lstm` |
| `TFT_ENDPOINT` | SageMaker endpoint name for TFT | `quant-screener-tft` |
| `AWS_REGION` | AWS region for all services | `us-east-1` |

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/screener/{ticker}` | Full analytics data for a single NSE ticker |
| `GET /api/screener/all` | Summary data for all Nifty 500 constituents |

### Response Schema (single ticker)

```json
{
  "ticker": "RELIANCE",
  "company_name": "Reliance Industries Limited",
  "profile": { "market_cap": ..., "pe_ratio": ..., "roe": ..., "roce": ..., "dividend_yield": ... },
  "xgboost": { "rating": "BUY", "confidence": 0.82 },
  "lstm_projection": { "dates": [...], "prices": [...] },
  "tft_score": { "score": 68, "trend_outlook": "Bullish" },
  "gemma_summary": "Based on current fundamentals...",
  "historical": { "dates": [...], "close_prices": [...] },
  "quarterly_financials": [...]
}
```

## Caching Strategy

| Data Type | TTL | Rationale |
|-----------|-----|-----------|
| Live Quotes | 5 min | Balance freshness with NSE rate limits |
| Historical OHLC | 24 hr | Changes only at market close |
| Financial Results | 24 hr | Quarterly updates |
| ML Predictions | 1 hr | Tied to input data freshness |
| Nifty 500 List | 24 hr | Index composition changes rarely |

## ML Model Training

The platform includes training scripts to produce model artifacts from real NSE data.

### Prerequisites

```bash
cd backend/training
pip install -r requirements.txt
```

### Train All Models

```bash
python backend/training/train_all.py
```

### Train Individual Models

```bash
# XGBoost: Rating classifier from quarterly financials
python backend/training/train_xgboost.py \
    --n-estimators 200 \
    --max-depth 6 \
    --learning-rate 0.1

# LSTM: 7-day price projection from historical OHLC
python backend/training/train_lstm.py \
    --epochs 50 \
    --batch-size 32 \
    --tickers "RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK"

# TFT: Macro Resilience Score from RBI + sector data
python backend/training/train_tft.py \
    --epochs 100 \
    --batch-size 16 \
    --learning-rate 0.001
```

### Training Output

Each script produces:
- Model artifact in `backend/model_artifacts/{model_name}/`
- `metrics.json` with validation performance and hyperparameters

### Training Data Sources

| Model | Data Source | Volume |
|-------|------------|--------|
| XGBoost | Nifty 500 quarterly financials (8 quarters) | ~4000 samples |
| LSTM | Historical OHLC (1 year, top 50 tickers) | ~12,500 sequences |
| TFT | RBI REPO rate + 5 sector indices (1 year) | ~250 time steps |

## Cost Optimization

- **SageMaker Serverless**: Endpoints scale to zero when idle — you pay only for inference time and data processed. Cold starts (~30-60s) occur on first request after idle period.
- **Lambda**: Pay per invocation. Package stays well under 250MB without ML frameworks.
- **Bedrock**: Pay per token for Gemma 3 4B IT inference.
- **DynamoDB**: On-demand pricing for cache table.

## Constraints

- **No Next.js / SSR** — 100% static client-side SPA
- **No Docker / Kubernetes** — serverless-first architecture
- **No mock data** — all data sourced live from NSE India
- **Rate limited** — max 5 req/s to NSE to avoid IP blocking
- **Graceful degradation** — ML fields are nullable; frontend handles partial responses
- **Lambda size limit** — backend package stays <250MB (ML deps offloaded to SageMaker)

## License

MIT
