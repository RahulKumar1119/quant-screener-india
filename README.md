# Quant Screener India

AI-powered Financial Stock Screening and Analytics Platform for the Indian Stock Market (NSE), inspired by Screener.in.

## Overview

A full-stack platform that fetches **real-time data from NSE India** and applies four ML models to deliver intelligent stock analysis, interactive charting, financial data tables, and a custom query-based screener — all with Indian localization (₹, Crores, Lakhs).

## Architecture

```
Browser (React SPA)  →  FastAPI Backend (Data Proxy)  →  NSE India APIs
                                    ↓
                         ML Inference Pipeline
                    (XGBoost · LSTM · TFT · Gemma 3 27B)
```

- **Frontend**: React 18 + Rsbuild (Rspack) + Tailwind CSS → static SPA (`dist/`) for AWS Amplify
- **Backend**: FastAPI data aggregation proxy with TTL caching, rate limiting, and ML inference
- **Data Source**: NSE India public APIs via `jugaad-data` Python library
- **ML Models**: Pre-trained artifacts loaded at startup, inference on live data

## Tech Stack

### Frontend
- React 18 with TypeScript
- Rsbuild (Rspack-powered) — builds to static `dist/`
- Tailwind CSS with dark/light theme (`class` strategy)
- ApexCharts for price visualization
- TanStack Table (React Table) for financial data grids
- React Router for client-side routing

### Backend
- FastAPI + Uvicorn
- `jugaad-data` for NSE live quotes, historical OHLC, RBI data
- `cachetools` for 5-tier TTL caching
- `xgboost`, `tensorflow` (LSTM), `pytorch` (TFT) for ML inference
- Gemma 3 27B via Ollama for narrative generation
- `httpx` for custom NSE API calls
- `pandas` + `numpy` for data manipulation

## Features

### Analytics Dashboard
- **Profile Ratios Card Grid** — Market Cap (₹ Cr), P/E, ROE%, ROCE%, Dividend Yield% with color-coded threshold badges
- **AI Technical Horizon Chart** — 30-day historical prices + 7-day LSTM projection (Royal Blue dotted line), weekends excluded
- **ML Scoring Panel** — TFT Macro Resilience Score gauge (0–100) + XGBoost rating badge (STRONG BUY/BUY/HOLD/SELL)
- **Quarterly Financial Table** — Screener.in-style sortable table with Indian Crores formatting
- **AI Narrative Summary** — Gemma 3 27B SEBI-style fundamental analysis

### Custom Screener
- Text-based fundamental query language (e.g., `PE < 25 AND ROE > 15 AND AI_Rating = "STRONG BUY"`)
- Helper panel with available fields and operators
- Paginated, sortable results grid across Nifty 500 stocks

### Localization
- Indian numbering system (Lakhs, Crores) with ₹ symbol
- NSE stock symbols and market conventions
- Trading-day-aware date axes (weekends excluded)

## ML Models

| Model | Input | Output |
|-------|-------|--------|
| XGBoost | Quarterly financials (revenue, margins, growth) | Rating (STRONG BUY/BUY/HOLD/SELL) + confidence |
| LSTM | 30-day historical OHLC | 7-day price projection |
| TFT (Temporal Fusion Transformer) | RBI REPO rate + Nifty sector indices | Macro Resilience Score (0–100) + trend outlook |
| Gemma 3 27B | Financial data + quote + rating | SEBI-style narrative summary |

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
├── backend/                      # FastAPI Backend
│   ├── app.py                    # FastAPI application
│   ├── nse_client.py             # NSE data fetching (jugaad-data)
│   ├── cache.py                  # TTL cache manager (5 tiers)
│   ├── rate_limiter.py           # Token bucket rate limiter
│   ├── schemas.py                # Pydantic response models
│   ├── ml_models/                # ML inference wrappers
│   │   ├── xgboost_model.py
│   │   ├── lstm_model.py
│   │   ├── tft_model.py
│   │   └── gemma_model.py
│   ├── model_artifacts/          # Pre-trained model weights
│   └── requirements.txt          # Python dependencies
├── rsbuild.config.ts             # Rsbuild configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── package.json                  # Frontend dependencies
└── tsconfig.json                 # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- Ollama (for Gemma 3 27B inference) — optional

### Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Place pre-trained model artifacts in backend/model_artifacts/
# - xgboost_rating.json
# - lstm_price.h5
# - tft_macro.pt

# Start the backend server
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend Setup

```bash
npm install

# Start the dev server (port 3000, proxies API to localhost:8000)
npm run dev
```

### Production Build

```bash
npm run build
# Output: dist/ — deploy to AWS Amplify
```

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

## Constraints

- **No Next.js / SSR** — 100% static client-side SPA
- **No Docker / Kubernetes** — serverless-first architecture
- **No mock data** — all data sourced live from NSE India
- **Rate limited** — max 5 req/s to NSE to avoid IP blocking
- **Graceful degradation** — ML fields are nullable; frontend handles partial responses

## License

MIT
