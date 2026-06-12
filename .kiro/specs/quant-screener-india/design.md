# Design Document

## Overview

An AI-powered Financial Stock Screening and Analytics Platform focused on the Indian Stock Market (NSE). The platform provides intelligent stock analysis through four ML models (XGBoost, LSTM, TFT, Gemma 3 4B IT via AWS Bedrock), interactive Recharts and TradingView Lightweight Charts visualizations, TanStack Table financial data grids, and a custom text-based query screener. Built as a static SPA (React 19 + Rsbuild + Tailwind CSS) consuming a FastAPI backend that fetches real-time data from NSE India via the `jugaad-data` Python library, targeting deployment on AWS Amplify with full dark/light theme support and Indian localization (₹, Crores, Lakhs, weekend-skipping date axes).

## Architecture

The platform follows a **Client → Data Proxy → NSE India** architecture where the FastAPI backend acts as an intelligent data aggregation proxy with caching, rate limiting, and ML inference:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Browser (React SPA)                                                     │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  Rsbuild → static dist/                                           │  │
│  │  React 19 + TypeScript + Tailwind CSS                             │  │
│  │  Recharts · TradingView Charts · TanStack Table · React Router    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│         ▲                                                                │
│         │  HTTP (JSON)                                                   │
│         ▼                                                                │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │  FastAPI Backend (localhost:8000) — Data Aggregation Proxy         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────────────────┐  │  │
│  │  │ NSE Client  │  │ Cache Layer │  │ ML Inference Pipeline     │  │  │
│  │  │ (jugaad-data│  │ (TTL-based) │  │ XGBoost│LSTM│TFT│Gemma   │  │  │
│  │  │  + httpx)   │  │ (cachetools)│  │ (pre-trained artifacts)  │  │  │
│  │  └──────┬──────┘  └─────────────┘  └──────────────────────────┘  │  │
│  │         │                                                          │  │
│  │         │  Rate-limited requests (session-managed)                 │  │
│  │         ▼                                                          │  │
│  │  ┌───────────────────────────────────────────────────────────┐    │  │
│  │  │  NSE India APIs                                            │    │  │
│  │  │  • NSELive().stock_quote(symbol) → Live quotes             │    │  │
│  │  │  • stock_df(symbol, from, to) → Historical OHLC            │    │  │
│  │  │  • Corporate Info → Quarterly financials                   │    │  │
│  │  │  • equity-stockIndices → Nifty 500 constituents            │    │  │
│  │  │  • RBI module → REPO rate (macro data)                     │    │  │
│  │  └───────────────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
         │
         ▼ (frontend deployment)
   AWS Amplify (static hosting of dist/)
```

- **Frontend**: React 19 SPA built with Rsbuild (Rspack), styled with Tailwind CSS, served as static files.
- **Backend**: FastAPI data aggregation proxy that fetches live data from NSE India, applies caching, rate limiting, and runs ML inference on real data. No database required.
- **Data Source**: NSE India public APIs accessed via `jugaad-data` library with session cookie management.
- **Communication**: RESTful JSON over HTTP. Frontend fetches from `localhost:8000` during development.
- **Deployment**: Frontend `dist/` folder deployed to AWS Amplify. Backend runs as a separate service.

---

## Components and Interfaces

### Route Structure

```
/                       → Main analytics view (default ticker: JNKINDIA)
/:ticker                → Analytics view for a specific ticker
/screener               → Custom Screener query page
```

### Component Tree

```
<App>
├── <ThemeProvider>
│   ├── <NavigationHeader>
│   │   ├── <Logo />
│   │   ├── <TickerSearchBar />
│   │   └── <ThemeToggle />
│   │
│   └── <RouterOutlet>
│       ├── Route: / or /:ticker
│       │   └── <AnalyticsPage>
│       │       ├── <ProfileCardGrid />
│       │       ├── <IntelEngineDashboard>
│       │       │   ├── <PriceChart />          (TradingView Lightweight Charts)
│       │       │   └── <MLScoringPanel>
│       │       │       ├── <TFTScoreGauge />
│       │       │       └── <XGBoostRatingBadge />
│       │       ├── <FinancialTable />          (TanStack Table)
│       │       └── <GemmaSummaryCard />
│       │
│       └── Route: /screener
│           └── <CustomScreenerPage>
│               ├── <QueryInputArea />
│               ├── <HelperPanel />
│               └── <ScreenerResultsGrid />
```

### File Structure

```
├── src/                              (Frontend - React SPA)
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css                     (Tailwind directives)
│   ├── components/
│   │   ├── NavigationHeader.tsx
│   │   ├── TickerSearchBar.tsx
│   │   ├── ThemeToggle.tsx
│   │   ├── ProfileCardGrid.tsx
│   │   ├── IntelEngineDashboard.tsx
│   │   ├── PriceChart.tsx
│   │   ├── TFTScoreGauge.tsx
│   │   ├── XGBoostRatingBadge.tsx
│   │   ├── FinancialTable.tsx
│   │   ├── GemmaSummaryCard.tsx
│   │   ├── CustomScreenerPage.tsx
│   │   ├── QueryInputArea.tsx
│   │   ├── HelperPanel.tsx
│   │   └── ScreenerResultsGrid.tsx
│   ├── hooks/
│   │   ├── useTheme.ts
│   │   ├── useTickerData.ts
│   │   └── useScreenerQuery.ts
│   ├── utils/
│   │   ├── indianFormat.ts
│   │   ├── queryParser.ts
│   │   ├── tradingDates.ts
│   │   └── thresholds.ts
│   ├── types/
│   │   └── index.ts
│   └── api/
│       └── client.ts
├── backend/                          (FastAPI Backend)
│   ├── app.py                        (FastAPI application entry point)
│   ├── nse_client.py                 (NSE data fetching layer)
│   ├── cache.py                      (TTL cache configuration)
│   ├── rate_limiter.py               (Outbound request rate limiter)
│   ├── ml_models/
│   │   ├── __init__.py
│   │   ├── xgboost_model.py          (XGBoost inference wrapper)
│   │   ├── lstm_model.py             (LSTM inference wrapper)
│   │   ├── tft_model.py              (TFT inference wrapper)
│   │   └── gemma_model.py            (Gemma 3 4B IT via AWS Bedrock)
│   ├── model_artifacts/
│   │   ├── xgboost_rating/           (XGBoost model directory)
│   │   │   └── model.json            (Trained XGBoost Booster)
│   │   ├── lstm_price/               (LSTM model directory)
│   │   │   └── (Keras SavedModel)    (Trained LSTM weights)
│   │   └── tft_macro/                (TFT model directory)
│   │       └── model.pt              (Trained TFT state_dict)
│   ├── schemas.py                    (Pydantic response models)
│   └── requirements.txt              (Python dependencies)
├── rsbuild.config.ts
├── tailwind.config.ts
└── package.json
```

---

## NSE Data Fetching Layer

### nse_client.py — Core Data Access

The NSE client manages all interactions with NSE India APIs through `jugaad-data`:

```python
# backend/nse_client.py

from jugaad_data.nse import NSELive, stock_df
from jugaad_data.rbi import RBI
from datetime import date, timedelta
import httpx
import pandas as pd

class NSEClient:
    """Manages NSE India data fetching with session management."""

    def __init__(self):
        self._nse_live = NSELive()
        self._session: httpx.Client | None = None

    def _ensure_session(self) -> httpx.Client:
        """Maintain valid NSE session with required cookies/headers."""
        if self._session is None:
            self._session = httpx.Client(
                headers={
                    "User-Agent": "Mozilla/5.0 ...",
                    "Accept": "application/json",
                },
                follow_redirects=True,
            )
            # Hit NSE homepage to obtain session cookies
            self._session.get("https://www.nseindia.com")
        return self._session

    def get_live_quote(self, symbol: str) -> dict:
        """Fetch real-time stock quote from NSE.

        Returns: priceInfo (lastPrice, open, close, vwap, weekHighLow),
                 metadata (companyName, industry)
        """
        return self._nse_live.stock_quote(symbol)

    def get_historical_ohlc(self, symbol: str, days: int = 30) -> pd.DataFrame:
        """Fetch historical OHLC data for N trading days.

        Returns: DataFrame with DATE, OPEN, HIGH, LOW, CLOSE, VOLUME columns
        """
        end_date = date.today()
        # Fetch extra calendar days to ensure we get N trading days
        start_date = end_date - timedelta(days=days * 2)
        df = stock_df(symbol, start_date, end_date, series="EQ")
        # Take last N trading days
        return df.tail(days)

    def get_quarterly_financials(self, symbol: str) -> list[dict]:
        """Fetch quarterly corporate financial results from NSE."""
        session = self._ensure_session()
        resp = session.get(
            f"https://www.nseindia.com/api/corporateInfo?symbol={symbol}&market=equities"
        )
        resp.raise_for_status()
        return resp.json().get("financialResults", [])

    def get_nifty500_constituents(self) -> list[dict]:
        """Fetch all Nifty 500 index constituents."""
        session = self._ensure_session()
        resp = session.get(
            "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%20500"
        )
        resp.raise_for_status()
        return resp.json().get("data", [])

    def get_rbi_repo_rate(self) -> float:
        """Fetch current RBI REPO rate via jugaad-data RBI module."""
        rbi = RBI()
        repo_data = rbi.get_data("repo_rate")
        return float(repo_data.iloc[-1]["Rate"])

    def get_sector_indices(self) -> dict[str, float]:
        """Fetch Nifty sector index values for TFT macro input."""
        session = self._ensure_session()
        sectors = ["NIFTY BANK", "NIFTY IT", "NIFTY PHARMA", "NIFTY AUTO", "NIFTY FMCG"]
        results = {}
        for sector in sectors:
            resp = session.get(
                f"https://www.nseindia.com/api/equity-stockIndices?index={sector.replace(' ', '%20')}"
            )
            if resp.status_code == 200:
                data = resp.json().get("metadata", {})
                results[sector] = data.get("last", 0.0)
        return results
```

### Session Management Strategy

NSE India requires valid session cookies obtained from an initial page load:

1. On first request, hit `https://www.nseindia.com` to obtain session cookies
2. Reuse the same `httpx.Client` instance for subsequent API calls
3. If a request returns 401/403, refresh the session by re-visiting the homepage
4. Session refresh is thread-safe using an asyncio lock

---

## Caching Strategy

### cache.py — TTL-Based In-Memory Cache

```python
# backend/cache.py

from cachetools import TTLCache
import threading

class CacheManager:
    """Centralized TTL cache management for all data sources."""

    def __init__(self):
        self._lock = threading.Lock()

        # Live quotes: 5-minute TTL (data changes frequently during market hours)
        self.live_quotes: TTLCache = TTLCache(maxsize=1000, ttl=300)

        # Historical OHLC: 24-hour TTL (changes only at market close)
        self.historical: TTLCache = TTLCache(maxsize=500, ttl=86400)

        # Financial results: 24-hour TTL (quarterly updates)
        self.financials: TTLCache = TTLCache(maxsize=500, ttl=86400)

        # ML predictions: 1-hour TTL (recomputed periodically)
        self.ml_predictions: TTLCache = TTLCache(maxsize=1000, ttl=3600)

        # Nifty 500 constituents: 24-hour TTL (index changes rarely)
        self.nifty500: TTLCache = TTLCache(maxsize=1, ttl=86400)

    def get_or_fetch(self, cache: TTLCache, key: str, fetcher):
        """Thread-safe cache lookup with fallback to fetcher function."""
        with self._lock:
            if key in cache:
                return cache[key]
        # Fetch outside lock to avoid blocking
        value = fetcher()
        with self._lock:
            cache[key] = value
        return value
```

### Cache Tiers

| Data Type | TTL | Max Size | Rationale |
|-----------|-----|----------|-----------|
| Live Quotes | 5 min (300s) | 1000 | Balance freshness with NSE rate limits |
| Historical OHLC | 24 hr (86400s) | 500 | Only changes at market close |
| Financial Results | 24 hr (86400s) | 500 | Quarterly updates only |
| ML Predictions | 1 hr (3600s) | 1000 | Model output tied to input data freshness |
| Nifty 500 List | 24 hr (86400s) | 1 | Index composition changes rarely |

### Cache Invalidation Rules

- Cache entries expire automatically via TTL (no manual invalidation needed)
- On NSE session failure, only the affected cache keys are skipped (stale data is NOT served)
- ML prediction cache keys include a hash of input data — if input changes, cache misses naturally

---

## ML Inference Pipeline

### Model Loading (Startup)

All pre-trained model artifacts are loaded into memory at FastAPI startup:

```python
# backend/app.py (lifespan)

from contextlib import asynccontextmanager
from ml_models import XGBoostModel, LSTMModel, TFTModel, GemmaModel

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load models at startup
    app.state.xgboost = XGBoostModel("model_artifacts/xgboost_rating/model.json")
    app.state.lstm = LSTMModel("model_artifacts/lstm_price/")
    app.state.tft = TFTModel("model_artifacts/tft_macro/model.pt")
    app.state.gemma = GemmaModel()  # Connects to AWS Bedrock
    app.state.nse_client = NSEClient()
    app.state.cache = CacheManager()
    yield
    # Cleanup
    app.state.nse_client.close()
```

### XGBoost Model — Rating from Real Financials

```python
# backend/ml_models/xgboost_model.py

import xgboost as xgb
import numpy as np

class XGBoostModel:
    """Produces stock rating from quarterly financial data."""

    def __init__(self, model_path: str):
        self.model = xgb.Booster()
        self.model.load_model(model_path)
        self.rating_map = {0: "SELL", 1: "HOLD", 2: "BUY", 3: "STRONG BUY"}

    def predict(self, financials: list[dict]) -> dict:
        """
        Input: List of quarterly financial dicts with revenue, expenses,
               operating_profit, net_profit, margin_pct
        Output: {"rating": "STRONG BUY"|"BUY"|"HOLD"|"SELL", "confidence": 0.0-1.0}
        """
        features = self._extract_features(financials)
        dmatrix = xgb.DMatrix(np.array([features]))
        probabilities = self.model.predict(dmatrix)[0]
        predicted_class = int(np.argmax(probabilities))
        confidence = float(probabilities[predicted_class])
        return {
            "rating": self.rating_map[predicted_class],
            "confidence": round(confidence, 2),
        }

    def _extract_features(self, financials: list[dict]) -> list[float]:
        """Extract feature vector: revenue growth, profit margins, trends."""
        # Revenue growth rate, margin trends, profit consistency, etc.
        ...
```

### LSTM Model — 7-Day Price Projection from Historical OHLC

```python
# backend/ml_models/lstm_model.py

import numpy as np
from tensorflow import keras

class LSTMModel:
    """Produces 7-day price projection from 30-day historical OHLC."""

    def __init__(self, model_path: str):
        self.model = keras.models.load_model(model_path)
        self.sequence_length = 30

    def predict(self, historical_df) -> dict:
        """
        Input: DataFrame with 30 rows of OHLC data (DATE, OPEN, HIGH, LOW, CLOSE)
        Output: {"dates": [...7 trading dates...], "prices": [...7 floats...]}
        """
        close_prices = historical_df["CLOSE"].values.astype(np.float32)
        # Normalize
        mean_price = close_prices.mean()
        std_price = close_prices.std()
        normalized = (close_prices - mean_price) / std_price

        # Reshape for LSTM: (1, 30, 1)
        input_seq = normalized.reshape(1, self.sequence_length, 1)

        # Predict 7 steps
        predictions = []
        current_seq = input_seq.copy()
        for _ in range(7):
            pred = self.model.predict(current_seq, verbose=0)[0, 0]
            predictions.append(pred)
            current_seq = np.roll(current_seq, -1, axis=1)
            current_seq[0, -1, 0] = pred

        # Denormalize
        prices = [(p * std_price + mean_price) for p in predictions]
        dates = self._generate_trading_dates(7)
        return {"dates": dates, "prices": [round(p, 2) for p in prices]}
```

### TFT Model — Macro Resilience Score

```python
# backend/ml_models/tft_model.py

import torch
import numpy as np

class TFTModel:
    """Produces Macro Resilience Score from RBI REPO rate + sector indices."""

    def __init__(self, model_path: str):
        self.model = torch.load(model_path, map_location="cpu")
        self.model.eval()

    def predict(self, repo_rate: float, sector_indices: dict[str, float]) -> dict:
        """
        Input: RBI REPO rate (float), sector index values (dict)
        Output: {"score": 0-100, "trend_outlook": "Bullish"|"Bearish"|"Neutral"}
        """
        features = self._build_feature_tensor(repo_rate, sector_indices)
        with torch.no_grad():
            output = self.model(features)

        score = int(torch.clamp(output[0] * 100, 0, 100).item())
        trend = self._score_to_trend(score)
        return {"score": score, "trend_outlook": trend}

    def _score_to_trend(self, score: int) -> str:
        if score >= 65:
            return "Bullish"
        elif score <= 35:
            return "Bearish"
        return "Neutral"
```

### Gemma 3 4B IT — Narrative Summary (AWS Bedrock)

```python
# backend/ml_models/gemma_model.py

import boto3
import json

class GemmaModel:
    """Generates SEBI-style narrative summary via AWS Bedrock (Gemma 3 4B IT)."""

    def __init__(self, region: str = "us-east-1"):
        self.client = boto3.client("bedrock-runtime", region_name=region)
        self.model_id = "google/gemma-3-4b-it"

    def generate_summary(self, ticker: str, financials: list[dict],
                         quote: dict, rating: dict) -> str:
        """
        Input: Ticker symbol, quarterly financials, live quote data, XGBoost rating
        Output: SEBI-style narrative summary string
        """
        prompt = self._build_prompt(ticker, financials, quote, rating)
        try:
            response = self.client.invoke_model(
                modelId=self.model_id,
                contentType="application/json",
                accept="application/json",
                body=json.dumps({
                    "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                    "generationConfig": {"maxOutputTokens": 300, "temperature": 0.3},
                }),
            )
            result = json.loads(response["body"].read())
            return result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
        except Exception:
            return ""  # Graceful fallback — summary field will be empty

    def _build_prompt(self, ticker, financials, quote, rating) -> str:
        return f"""You are a SEBI-registered research analyst. Write a 3-4 sentence
        fundamental analysis summary for {ticker} based on:
        - Latest quarter revenue: ₹{financials[0]['revenue']/1e7:.0f} Cr
        - Net profit margin: {financials[0]['margin_pct']:.1f}%
        - Current price: ₹{quote.get('lastPrice', 'N/A')}
        - AI Rating: {rating['rating']} (confidence: {rating['confidence']})
        Keep it factual, concise, and suitable for retail investors."""
```

---

## Rate Limiting

### rate_limiter.py — Outbound Request Throttling

```python
# backend/rate_limiter.py

import asyncio
import time
from collections import deque

class RateLimiter:
    """Token bucket rate limiter for outbound NSE requests."""

    def __init__(self, max_requests: int = 5, window_seconds: float = 1.0):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._timestamps: deque = deque()
        self._lock = asyncio.Lock()

    async def acquire(self):
        """Wait until a request slot is available."""
        async with self._lock:
            now = time.monotonic()
            # Remove timestamps outside the window
            while self._timestamps and (now - self._timestamps[0]) > self.window_seconds:
                self._timestamps.popleft()

            if len(self._timestamps) >= self.max_requests:
                # Wait until the oldest request exits the window
                wait_time = self.window_seconds - (now - self._timestamps[0])
                await asyncio.sleep(wait_time)
                self._timestamps.popleft()

            self._timestamps.append(time.monotonic())
```

### Rate Limit Configuration

- **Outbound to NSE**: Max 5 requests per second (avoids IP blocking)
- **Inbound from clients**: No limit on frontend requests (cache absorbs load)
- **Backoff on 429**: If NSE returns 429, exponential backoff with 2^n seconds (max 60s)

---

## API Schema and Contracts

### Endpoint: `GET /api/screener/{ticker}`

Returns full live data for a single ticker, fetched from NSE and enriched with ML inference.

**Response Schema:**

```typescript
// GET /api/screener/JNKINDIA → 200 OK
{
  "ticker": "JNKINDIA",
  "company_name": "JNK India Limited",
  "profile": {
    "market_cap": 458700000000,   // raw number in ₹ (from NSE live quote)
    "pe_ratio": 22.4,
    "roe": 18.7,
    "roce": 21.3,
    "dividend_yield": 1.2
  },
  "xgboost": {
    "rating": "STRONG BUY",       // "STRONG BUY" | "BUY" | "HOLD" | "SELL"
    "confidence": 0.87            // computed from real quarterly financials
  },
  "lstm_projection": {
    "dates": ["2025-01-20", "2025-01-21", ...],  // 7 trading days
    "prices": [245.5, 248.2, ...]                 // from real 30-day OHLC
  },
  "tft_score": {
    "score": 72,                  // 0–100 (from real RBI REPO + sector indices)
    "trend_outlook": "Bullish"    // "Bullish" | "Bearish" | "Neutral"
  },
  "gemma_summary": "Based on current fundamentals, JNKINDIA demonstrates...",
  "historical": {
    "dates": ["2024-12-18", "2024-12-19", ...],  // 30 trading days (weekdays only)
    "close_prices": [230.0, 232.5, ...]           // from NSE historical API
  },
  "quarterly_financials": [
    {
      "quarter": "Q3 FY25",
      "revenue": 12500000000,
      "expenses": 9800000000,
      "operating_profit": 2700000000,
      "net_profit": 1900000000,
      "margin_pct": 15.2
    }
    // ... from NSE corporate info endpoint
  ]
}
```

### Endpoint: `GET /api/screener/all`

Returns summary data for all Nifty 500 constituents (used by the Custom Screener).

**Response Schema:**

```typescript
// GET /api/screener/all → 200 OK
{
  "tickers": [
    {
      "ticker": "JNKINDIA",
      "company_name": "JNK India Limited",
      "market_cap": 458700000000,
      "pe_ratio": 22.4,
      "roe": 18.7,
      "roce": 21.3,
      "dividend_yield": 1.2,
      "ai_rating": "STRONG BUY",
      "ai_confidence": 0.87,
      "tft_score": 72,
      "tft_trend": "Bullish"
    }
    // ... Nifty 500 constituents
  ]
}
```

### Error Responses

```typescript
// Ticker not found on NSE → 404
{
  "detail": "Ticker not found on NSE: INVALID"
}

// NSE unreachable → 503
{
  "detail": "NSE India data source is currently unavailable. Please retry later.",
  "retry_after": 30
}

// Rate limit exceeded → 429
{
  "detail": "Rate limit exceeded. Please wait before retrying.",
  "retry_after": 5
}

// ML model failure → 200 (partial response)
{
  "ticker": "JNKINDIA",
  "company_name": "JNK India Limited",
  "profile": { ... },            // always present if NSE reachable
  "xgboost": null,               // null when model fails
  "lstm_projection": null,       // null when model fails
  "tft_score": null,             // null when model fails
  "gemma_summary": "",           // empty string when model fails
  "historical": { ... },         // always present if NSE reachable
  "quarterly_financials": [...]  // always present if NSE reachable
}
```

---

## Data Models

```typescript
// src/types/index.ts

export type AIRating = "STRONG BUY" | "BUY" | "HOLD" | "SELL";
export type TrendOutlook = "Bullish" | "Bearish" | "Neutral";

export interface TickerProfile {
  market_cap: number;
  pe_ratio: number;
  roe: number;
  roce: number;
  dividend_yield: number;
}

export interface XGBoostOutput {
  rating: AIRating;
  confidence: number;
}

export interface LSTMProjection {
  dates: string[];
  prices: number[];
}

export interface TFTOutput {
  score: number;
  trend_outlook: TrendOutlook;
}

export interface QuarterlyFinancial {
  quarter: string;
  revenue: number;
  expenses: number;
  operating_profit: number;
  net_profit: number;
  margin_pct: number;
}

export interface HistoricalData {
  dates: string[];
  close_prices: number[];
}

export interface TickerResponse {
  ticker: string;
  company_name: string;
  profile: TickerProfile;
  xgboost: XGBoostOutput | null;
  lstm_projection: LSTMProjection | null;
  tft_score: TFTOutput | null;
  gemma_summary: string;
  historical: HistoricalData;
  quarterly_financials: QuarterlyFinancial[];
}

export interface TickerSummary {
  ticker: string;
  company_name: string;
  market_cap: number;
  pe_ratio: number;
  roe: number;
  roce: number;
  dividend_yield: number;
  ai_rating: AIRating;
  ai_confidence: number;
  tft_score: number;
  tft_trend: TrendOutlook;
}

export interface AllTickersResponse {
  tickers: TickerSummary[];
}

// Error response types
export interface ErrorResponse {
  detail: string;
  retry_after?: number;
}

// Query Parser types
export type ComparisonOperator = ">" | "<" | ">=" | "<=" | "=" | "!=";
export type LogicalOperator = "AND" | "OR";

export interface QueryCondition {
  field: string;
  operator: ComparisonOperator;
  value: number | string;
}

export interface ParsedQuery {
  conditions: QueryCondition[];
  logicalOperators: LogicalOperator[];
}

export interface QueryParseError {
  message: string;
  position: number;
}

export type QueryParseResult =
  | { success: true; parsed: ParsedQuery }
  | { success: false; error: QueryParseError };

// Theme types
export type Theme = "dark" | "light";
```

---

## State Management Approach

The application uses **React Context + custom hooks** for state management. No external state library (Redux, Zustand) is needed given the app's scope.

### State Domains

| Domain | Mechanism | Persistence |
|--------|-----------|-------------|
| Theme | `ThemeContext` + `useTheme` hook | localStorage |
| Current Ticker | URL param (React Router) | URL |
| Ticker Data | `useTickerData` hook (fetch + cache) | In-memory |
| Screener Query | Local component state | None |
| Screener Results | `useScreenerQuery` hook | In-memory |

### ThemeContext

```typescript
interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}
```

- On mount: check localStorage for `"theme"` key → if found, use it; else read `window.matchMedia("(prefers-color-scheme: dark)")`.
- On toggle: flip theme, persist to localStorage, apply/remove `dark` class on `<html>`.

### useTickerData Hook

```typescript
function useTickerData(ticker: string): {
  data: TickerResponse | null;
  loading: boolean;
  error: ErrorResponse | null;
  isPartial: boolean;  // true when ML fields are null (partial response)
}
```

- Fetches from `/api/screener/{ticker}` on ticker change.
- Caches responses in a `useRef` map to avoid refetching within session.
- Handles 503 (data source unavailable) and 429 (rate limited) with appropriate UI states.
- Detects partial responses (ML fields null) and sets `isPartial` flag.

### useScreenerQuery Hook

```typescript
function useScreenerQuery(): {
  results: TickerSummary[];
  error: QueryParseError | null;
  loading: boolean;
  executeQuery: (queryText: string) => void;
}
```

- Fetches `/api/screener/all` once on mount (caches full dataset).
- On `executeQuery`: parses the query string → filters the cached dataset → sets results.

---

## Theme System Design

### Implementation

Tailwind CSS dark mode with `class` strategy:

```typescript
// tailwind.config.ts
export default {
  darkMode: "class",
  // ...
}
```

### Flow

1. **Initial Load**:
   - Read `localStorage.getItem("theme")`
   - If present → apply that theme
   - Else → read `window.matchMedia("(prefers-color-scheme: dark)").matches`
   - Apply by adding/removing `class="dark"` on `<html>`

2. **Toggle**:
   - Flip current theme
   - Update `<html>` class
   - Write to `localStorage.setItem("theme", newTheme)`

3. **CSS Usage**:
   ```css
   bg-white dark:bg-gray-900
   text-gray-900 dark:text-gray-100
   ```

### Color Palette

| Token | Light | Dark |
|-------|-------|------|
| Background | `white` | `gray-900` |
| Surface | `gray-50` | `gray-800` |
| Text Primary | `gray-900` | `gray-100` |
| Text Secondary | `gray-600` | `gray-400` |
| Border | `gray-200` | `gray-700` |
| Accent | `indigo-600` | `indigo-400` |

---

## Custom Screener Query Parsing Logic

### Grammar

```
query       := condition (logical_op condition)*
condition   := field comparator value
field       := "Market Cap" | "PE" | "ROE" | "ROCE" | "Dividend Yield"
             | "AI_Rating" | "AI_Confidence" | "TFT_Score"
comparator  := ">" | "<" | ">=" | "<=" | "=" | "!="
value       := number | string_literal
logical_op  := "AND" | "OR"
number      := [0-9]+(\.[0-9]+)?
string_literal := '"' [^"]* '"'
```

### Field Mapping

| Query Field | Maps To | Type |
|-------------|---------|------|
| `Market Cap` | `market_cap` | number |
| `PE` | `pe_ratio` | number |
| `ROE` | `roe` | number |
| `ROCE` | `roce` | number |
| `Dividend Yield` | `dividend_yield` | number |
| `AI_Rating` | `ai_rating` | string |
| `AI_Confidence` | `ai_confidence` | number |
| `TFT_Score` | `tft_score` | number |

### Parser Design

```typescript
// src/utils/queryParser.ts

export function parseQuery(input: string): QueryParseResult {
  // 1. Tokenize: split by whitespace respecting quoted strings
  // 2. Parse tokens into conditions + logical operators
  // 3. Validate field names against allowed set
  // 4. Validate operator syntax
  // 5. Return ParsedQuery or QueryParseError with position
}

export function evaluateQuery(
  query: ParsedQuery,
  ticker: TickerSummary
): boolean {
  // Evaluate each condition against the ticker's fields
  // Combine with AND/OR logic (left-to-right, AND binds tighter)
  // Return true if ticker passes the filter
}
```

### Example Queries

```
PE < 25 AND ROE > 15
Market Cap > 10000000000 AND AI_Rating = "STRONG BUY"
TFT_Score >= 70 OR AI_Confidence > 0.8
```

### Error Handling

For invalid queries, the parser returns:
- The error message (e.g., "Unknown field: MarketCap. Did you mean 'Market Cap'?")
- The character position where parsing failed

---

## Indian Number Formatting Utility

### Design

```typescript
// src/utils/indianFormat.ts

/**
 * Formats a number using the Indian numbering system.
 * Values ≥ 1 Crore → display as "₹X.XX Cr"
 * Values ≥ 1 Lakh → display as "₹X.XX L"
 * Values < 1 Lakh → display as "₹X,XX,XXX" (Indian comma grouping)
 */
export function formatIndianCurrency(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (absValue >= 1_00_00_000) {
    // Crores (1,00,00,000)
    const crores = absValue / 1_00_00_000;
    return `${sign}₹${crores.toFixed(2)} Cr`;
  }

  if (absValue >= 1_00_000) {
    // Lakhs (1,00,000)
    const lakhs = absValue / 1_00_000;
    return `${sign}₹${lakhs.toFixed(2)} L`;
  }

  // Below 1 Lakh: Indian comma grouping (1,23,456)
  return `${sign}₹${indianCommaGrouping(absValue)}`;
}

/**
 * Applies Indian comma grouping: rightmost 3 digits, then groups of 2.
 * Example: 1234567 → "12,34,567"
 */
function indianCommaGrouping(value: number): string {
  const str = Math.round(value).toString();
  if (str.length <= 3) return str;

  const lastThree = str.slice(-3);
  const remaining = str.slice(0, -3);
  const grouped = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${grouped},${lastThree}`;
}

/**
 * Formats a percentage value.
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
```

### Invariants

- Output always starts with `₹` for monetary values
- Values ≥ 1 Crore always display with "Cr" suffix
- Values ≥ 1 Lakh (but < 1 Crore) always display with "L" suffix
- Indian comma grouping: first group from right is 3 digits, subsequent groups are 2 digits

---

## Chart Configuration with Weekend-Skipping Logic

### Trading Dates Utility

```typescript
// src/utils/tradingDates.ts

/**
 * Generates an array of trading dates (skipping Saturday=6, Sunday=0)
 * starting from a given date.
 */
export function generateTradingDates(
  startDate: Date,
  count: number
): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);

  while (dates.length < count) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(current.toISOString().split("T")[0]);
    }
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Returns true if a date string (YYYY-MM-DD) falls on a weekday.
 */
export function isWeekday(dateStr: string): boolean {
  const day = new Date(dateStr).getDay();
  return day !== 0 && day !== 6;
}
```

### TradingView Lightweight Charts Configuration

```typescript
// PriceChart.tsx — TradingView Lightweight Charts setup

import { createChart, LineSeries } from "lightweight-charts";

// Chart initialization
const chart = createChart(containerRef.current, {
  width: containerWidth,
  height: 350,
  layout: {
    background: { color: isDark ? "#111827" : "#ffffff" },
    textColor: isDark ? "#f3f4f6" : "#374151",
  },
  grid: {
    vertLines: { color: isDark ? "#374151" : "#e5e7eb" },
    horzLines: { color: isDark ? "#374151" : "#e5e7eb" },
  },
  timeScale: {
    timeVisible: false,
    borderColor: isDark ? "#4b5563" : "#d1d5db",
  },
});

// Historical price series (solid gray line)
const historicalSeries = chart.addSeries(LineSeries, {
  color: "#374151",
  lineWidth: 2,
  lineStyle: 0, // Solid
});
historicalSeries.setData(
  historicalDates.map((date, i) => ({
    time: date, // YYYY-MM-DD format (weekdays only)
    value: historicalPrices[i],
  }))
);

// LSTM Projection series (dotted Royal Blue line)
const projectionSeries = chart.addSeries(LineSeries, {
  color: "#4169E1",
  lineWidth: 2,
  lineStyle: 2, // Dashed
});
projectionSeries.setData(
  projectionDates.map((date, i) => ({
    time: date,
    value: projectionPrices[i],
  }))
);

// Responsive resize
const resizeObserver = new ResizeObserver((entries) => {
  const { width } = entries[0].contentRect;
  chart.applyOptions({ width });
});
resizeObserver.observe(containerRef.current);
```

### Key Design Decisions

- **Category axis** (not datetime): This naturally skips weekends since we only provide weekday date strings. TradingView Lightweight Charts handles `YYYY-MM-DD` strings natively and skips gaps.
- **Two series**: Historical as solid line, LSTM projection as dashed line with Royal Blue color.
- **Separate series**: The projection series starts from the last historical date, making the transition clear.
- **Responsive**: ResizeObserver adjusts chart width automatically.

---

## Responsive Layout Strategy

### Breakpoint System (Tailwind Defaults)

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Default | < 768px | Single column, stacked layout |
| `md` | ≥ 768px | Two-column layouts begin |
| `lg` | ≥ 1024px | Full desktop layouts |
| `xl` | ≥ 1280px | Max-width containers |

### Layout Rules

1. **NavigationHeader**: Full width, sticky top. Search bar collapses to icon on mobile.
2. **ProfileCardGrid**: `grid-cols-2 md:grid-cols-3 lg:grid-cols-5` — 2 cards per row on mobile, expanding to 5 on desktop.
3. **IntelEngineDashboard**: `flex flex-col lg:flex-row` — chart stacks above ML panel on mobile, side-by-side on desktop (70/30 split).
4. **FinancialTable**: Full width with `overflow-x-auto` wrapper on mobile for horizontal scrolling.
5. **CustomScreenerPage**: `flex flex-col md:flex-row` — query area and helper panel stack on mobile, side-by-side on desktop (70/30 split).
6. **Container**: `max-w-7xl mx-auto px-4` for consistent content width.

### Threshold Badge Design (ProfileCardGrid)

```typescript
// src/utils/thresholds.ts

interface ThresholdRule {
  field: keyof TickerProfile;
  favorable: (value: number) => boolean;
}

const thresholdRules: ThresholdRule[] = [
  { field: "pe_ratio", favorable: (v) => v < 25 },
  { field: "roe", favorable: (v) => v > 15 },
  { field: "roce", favorable: (v) => v > 15 },
  { field: "dividend_yield", favorable: (v) => v > 1.5 },
];

export function getBadgeColor(field: string, value: number): "green" | "red" | "neutral" {
  const rule = thresholdRules.find((r) => r.field === field);
  if (!rule) return "neutral";
  return rule.favorable(value) ? "green" : "red";
}
```

### XGBoost Rating Color Mapping

```typescript
const ratingColorMap: Record<AIRating, string> = {
  "STRONG BUY": "bg-emerald-600 text-white",
  "BUY": "bg-green-500 text-white",
  "HOLD": "bg-amber-500 text-white",
  "SELL": "bg-red-600 text-white",
};
```

---

## Error Handling

| Scenario | HTTP Status | Frontend Handling |
|----------|-------------|-------------------|
| NSE India unreachable | 503 + `retry_after` header | Show "Data source unavailable" banner with countdown timer, retry button |
| Ticker not found on NSE | 404 | Display "Ticker not found on NSE" message, keep navigation functional |
| Rate limit exceeded (outbound to NSE) | 429 + `retry_after` | Show "Too many requests, retrying in Xs" with auto-retry |
| ML model inference failure | 200 (partial) | Render available data; show "ML analysis unavailable" placeholder for null fields |
| Invalid screener query | N/A (frontend) | Display inline error message with position indicator |
| Network timeout (frontend → backend) | N/A | Show timeout message with retry option |
| NSE session expired | Transparent retry | Backend refreshes session automatically; client unaware |

### Backend Error Handling Flow

```python
# backend/app.py — error handling pattern

@app.get("/api/screener/{ticker}")
async def get_ticker(ticker: str):
    try:
        # 1. Fetch live data from NSE (with rate limiting)
        await rate_limiter.acquire()
        quote = cache.get_or_fetch(
            cache.live_quotes, ticker,
            lambda: nse_client.get_live_quote(ticker)
        )
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(404, detail=f"Ticker not found on NSE: {ticker}")
        raise HTTPException(503, detail="NSE India data source is currently unavailable.",
                          headers={"Retry-After": "30"})
    except (httpx.ConnectError, httpx.TimeoutException):
        raise HTTPException(503, detail="NSE India data source is currently unavailable.",
                          headers={"Retry-After": "30"})

    # 2. Fetch historical + financials (cached, may also fail)
    historical = cache.get_or_fetch(cache.historical, ticker, ...)
    financials = cache.get_or_fetch(cache.financials, ticker, ...)

    # 3. Run ML inference (graceful degradation — errors yield null)
    xgboost_result = safe_predict(xgboost_model, financials)
    lstm_result = safe_predict(lstm_model, historical)
    tft_result = safe_predict(tft_model, repo_rate, sector_indices)
    gemma_result = safe_generate(gemma_model, ticker, financials, quote, xgboost_result)

    return build_response(ticker, quote, historical, financials,
                         xgboost_result, lstm_result, tft_result, gemma_result)


def safe_predict(model, *args):
    """Run model prediction with graceful failure → None."""
    try:
        return model.predict(*args)
    except Exception:
        return None
```

### Graceful Degradation Strategy

The backend follows a **data-first, ML-optional** approach:
1. If NSE is reachable → always return price data, profile, historical, financials
2. ML models may fail independently → each ML field is nullable in the response
3. Frontend checks for `null` ML fields and renders "unavailable" placeholders
4. Only when NSE itself is unreachable does the backend return 503

---

## Testing Strategy

### Unit Tests (Example-Based)
- Navigation renders default ticker JNKINDIA on first load
- Theme toggle switches between dark/light classes
- Recharts receives correct series configuration for TFT gauge
- TradingView chart renders historical + projection series
- TFT gauge renders with score 0–100
- Gemma summary card displays AI-generated label
- Custom screener route is accessible at /screener
- Helper panel lists all available query fields
- Frontend handles 503 response with retry UI
- Frontend handles null ML fields gracefully (partial response)
- Frontend displays 404 error for unknown tickers

### Property-Based Tests
- All 13 correctness properties below are tested with minimum 100 random iterations each
- Generators cover: arbitrary numbers (for formatting), arbitrary date ranges (for trading dates), arbitrary valid/invalid query strings (for parser), arbitrary ticker datasets (for screener filtering), arbitrary financial data (for ML output validation)

### Integration Tests (Backend + NSE)
- Backend fetches and returns valid live quote for known tickers (RELIANCE, TCS, INFY)
- Backend returns 503 when NSE session cannot be established
- Cache returns stale-free data after TTL expiry
- Rate limiter enforces max 5 requests/second to NSE
- ML models produce valid output shapes from real NSE data
- CORS headers present for localhost:3000 origin
- /api/screener/all returns Nifty 500 constituents with required fields

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Search suggestion filtering

For any input string typed into the ticker search bar and for any ticker in the suggestion list, that ticker's symbol must contain the input string as a case-insensitive substring.

**Validates: Requirements 1.3**

### Property 2: Theme persistence round-trip

For any theme value ("dark" or "light") selected via the toggle, reading localStorage immediately after the toggle must return the same theme value that was selected.

**Validates: Requirements 2.4**

### Property 3: Indian currency formatting correctness

For any non-negative number, the `formatIndianCurrency` function must: (a) produce a string that starts with "₹", (b) for values ≥ 1,00,00,000 (1 Crore), include the suffix "Cr", (c) for values ≥ 1,00,000 but < 1 Crore, include the suffix "L", and (d) for values < 1,00,000, use Indian comma grouping where the rightmost group is 3 digits and all subsequent groups are 2 digits.

**Validates: Requirements 3.2, 6.2, 11.1, 11.2**

### Property 4: Threshold badge color mapping

For any numeric metric value and its corresponding field (PE, ROE, ROCE, Dividend Yield), the `getBadgeColor` function must return "green" if and only if the value satisfies the favorable condition for that field, and "red" otherwise.

**Validates: Requirements 3.3**

### Property 5: Trading date axis excludes weekends

For any start date and any positive count, every date string in the array returned by `generateTradingDates` must correspond to a weekday (Monday through Friday); no Saturday or Sunday shall ever appear.

**Validates: Requirements 4.4, 11.4**

### Property 6: XGBoost rating badge color correctness

For any AIRating value in {"STRONG BUY", "BUY", "HOLD", "SELL"}, the color class resolved from the rating map must be: emerald-600 for STRONG BUY, green-500 for BUY, amber-500 for HOLD, and red-600 for SELL.

**Validates: Requirements 5.3**

### Property 7: Financial table column sorting

For any column in the financial table and any array of QuarterlyFinancial rows, sorting by that column in ascending order must produce a sequence where each element is less than or equal to its successor according to the column's comparator.

**Validates: Requirements 6.5**

### Property 8: Custom screener query filtering

For any valid parsed query and for any ticker in the result set returned by `evaluateQuery`, every condition in the query must be satisfied by that ticker's field values when combined with the specified logical operators.

**Validates: Requirements 8.4, 8.6**

### Property 9: Invalid query error reporting

For any syntactically invalid query string (containing unknown fields, malformed operators, or incomplete expressions), the `parseQuery` function must return a failure result containing a non-empty error message and a position value ≥ 0 indicating where parsing failed.

**Validates: Requirements 8.7**

### Property 10: API response schema conformance with live data

For any valid NSE ticker symbol, the response from `/api/screener/{ticker}` must contain all required top-level fields (ticker, company_name, profile, historical, quarterly_financials) with correct types. The fields `xgboost`, `lstm_projection`, and `tft_score` must be either a valid object matching their respective schema or `null`. The `quarterly_financials` array must be non-empty, and `historical.dates` must contain only weekday date strings.

**Validates: Requirements 9.1, 9.5**

### Property 11: Screener results pagination

For any non-empty result set and any page size > 0, the total number of items across all pages must equal the total result count, and no item shall appear on more than one page.

**Validates: Requirements 8.5**

### Property 12: XGBoost output domain validity

For any valid quarterly financial input data (non-empty array of financial records with positive revenue values), the XGBoost model must produce a rating that is exactly one of {"STRONG BUY", "BUY", "HOLD", "SELL"} and a confidence value in the range [0.0, 1.0].

**Validates: Requirements 9.12**

### Property 13: Cache TTL expiry guarantees freshness

For any cache entry with a configured TTL, a lookup performed after the TTL has elapsed must not return the previously cached value — it must either trigger a fresh fetch or return a cache miss.

**Validates: Requirements 9.6**

---

## ML Model Training Pipeline

### Overview

The training pipeline fetches real historical data from NSE India via `jugaad-data` and trains three ML models locally. Training scripts live in `backend/training/` and produce model artifacts consumed by the inference wrappers in `backend/ml_models/`.

### Training Architecture

```
backend/training/
├── train_all.py              # Orchestrator: runs all training scripts
├── train_xgboost.py          # XGBoost rating classifier
├── train_lstm.py             # LSTM price projection model
├── train_tft.py              # TFT macro resilience scorer
├── data_fetcher.py           # Shared NSE data fetching utilities
├── feature_engineering.py    # Shared feature engineering functions
├── requirements.txt          # Training-specific Python dependencies
└── README.md                 # Training instructions and documentation
```

### Data Flow

```
NSE India APIs (via jugaad-data)
    │
    ├── Quarterly Financials (Nifty 500) → XGBoost Training
    │       ↓
    │   Feature Engineering (revenue growth, margins, trends)
    │       ↓
    │   XGBoost Multi-class Classifier (4 classes: SELL/HOLD/BUY/STRONG BUY)
    │       ↓
    │   → backend/model_artifacts/xgboost_rating/model.json
    │
    ├── Historical OHLC (1 year, configurable tickers) → LSTM Training
    │       ↓
    │   MinMaxScaler + Sliding Window (30-day sequences)
    │       ↓
    │   LSTM Sequence Model (predict next-day close)
    │       ↓
    │   → backend/model_artifacts/lstm_price/ (SavedModel)
    │
    └── RBI REPO Rate + Sector Indices (historical) → TFT Training
            ↓
        Temporal Feature Engineering (rate changes, momentum)
            ↓
        TFT Regression Model (output: resilience score 0-1)
            ↓
        → backend/model_artifacts/tft_macro/model.pt
```

### XGBoost Training Details

**Data Source**: Quarterly financial results for Nifty 500 stocks fetched from NSE corporate info endpoints.

**Feature Engineering** (`feature_engineering.py`):
- Revenue growth rate (QoQ and YoY)
- Net profit margin and operating profit margin
- Expense ratio (expenses / revenue)
- Quarter-over-quarter profit consistency (standard deviation)
- ROE and ROCE computed from available financials
- Dividend yield trends

**Label Generation**:
- Labels derived from forward-looking 90-day price performance after each quarterly result:
  - SELL: price declined > 10%
  - HOLD: price change between -10% and +5%
  - BUY: price increased 5-20%
  - STRONG BUY: price increased > 20%

**Model Configuration**:
```python
xgb_params = {
    "objective": "multi:softprob",
    "num_class": 4,
    "max_depth": 6,
    "learning_rate": 0.1,
    "n_estimators": 200,
    "eval_metric": "mlogloss",
    "early_stopping_rounds": 20,
}
```

**Output**: `model.json` (XGBoost Booster serialized) + `metrics.json` (accuracy, F1-score per class, confusion matrix).

### LSTM Training Details

**Data Source**: 1 year of daily OHLC data for a configurable set of tickers (default: top 50 Nifty stocks by market cap).

**Preprocessing**:
- MinMaxScaler normalization per ticker (fit on training set only)
- Sliding window: 30 trading days input → 1 day output (next close)
- Train/validation split: 80/20 chronological (no shuffle for time series)

**Model Architecture**:
```python
model = keras.Sequential([
    keras.layers.LSTM(64, input_shape=(30, 1), return_sequences=True),
    keras.layers.Dropout(0.2),
    keras.layers.LSTM(32),
    keras.layers.Dropout(0.2),
    keras.layers.Dense(1),
])
model.compile(optimizer="adam", loss="mse", metrics=["mae"])
```

**Training Config**:
- Epochs: 50 (default, configurable via CLI)
- Batch size: 32
- Early stopping on validation loss (patience=10)
- Learning rate reduction on plateau (factor=0.5, patience=5)

**Output**: Keras SavedModel directory + `metrics.json` (MSE, MAE, MAPE on validation set).

### TFT Training Details

**Data Source**: 
- RBI REPO rate history (via jugaad-data RBI module)
- Nifty sector index historical values (BANK, IT, PHARMA, AUTO, FMCG) via NSE API

**Feature Engineering**:
- REPO rate change velocity (rate of change over 30/60/90 day windows)
- Sector index momentum (percentage change over 7/14/30 day windows)
- Cross-sector correlation features
- Normalized sector index ratios (relative to Nifty 50 benchmark)

**Label Generation**:
- Target: market-wide resilience score (0-1) derived from Nifty 50 forward 30-day performance relative to sector dispersion

**Model Architecture**:
```python
class TFTMacroModel(nn.Module):
    def __init__(self, input_dim=11, hidden_dim=64, num_heads=4):
        super().__init__()
        self.encoder = nn.LSTM(input_dim, hidden_dim, batch_first=True)
        self.attention = nn.MultiheadAttention(hidden_dim, num_heads)
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )
    
    def forward(self, x):
        lstm_out, _ = self.encoder(x)
        attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)
        return self.fc(attn_out[:, -1, :])
```

**Training Config**:
- Epochs: 100 (default, configurable via CLI)
- Batch size: 16
- Optimizer: AdamW (lr=0.001, weight_decay=0.01)
- Loss: MSE
- Early stopping on validation loss (patience=15)

**Output**: `model.pt` (PyTorch state_dict) + `metrics.json` (MSE, MAE, R² on validation set).

### Shared Data Fetcher

```python
# backend/training/data_fetcher.py

class TrainingDataFetcher:
    """Fetches and caches training data from NSE India."""

    def fetch_nifty500_financials(self, quarters: int = 8) -> pd.DataFrame:
        """Fetch last N quarters of financials for all Nifty 500 stocks."""
        ...

    def fetch_historical_ohlc(self, tickers: list[str], days: int = 365) -> dict[str, pd.DataFrame]:
        """Fetch 1 year of OHLC data for given tickers."""
        ...

    def fetch_rbi_repo_history(self, years: int = 5) -> pd.DataFrame:
        """Fetch RBI REPO rate history."""
        ...

    def fetch_sector_index_history(self, days: int = 365) -> dict[str, pd.DataFrame]:
        """Fetch historical values for Nifty sector indices."""
        ...
```

### Training CLI Interface

Each training script accepts CLI arguments:

```bash
# Train XGBoost
python backend/training/train_xgboost.py \
    --n-estimators 200 \
    --max-depth 6 \
    --learning-rate 0.1 \
    --output-dir backend/model_artifacts/xgboost_rating/

# Train LSTM
python backend/training/train_lstm.py \
    --epochs 50 \
    --batch-size 32 \
    --tickers "RELIANCE,TCS,INFY,HDFCBANK,ICICIBANK" \
    --output-dir backend/model_artifacts/lstm_price/

# Train TFT
python backend/training/train_tft.py \
    --epochs 100 \
    --batch-size 16 \
    --learning-rate 0.001 \
    --output-dir backend/model_artifacts/tft_macro/

# Train all models with defaults
python backend/training/train_all.py
```

### Training Metrics Output

Each training script produces a `metrics.json` alongside the model artifact:

```json
{
  "model": "xgboost_rating",
  "trained_at": "2026-06-08T14:30:00Z",
  "training_duration_seconds": 145,
  "data_source": "NSE India (Nifty 500 quarterly financials)",
  "samples": { "train": 3200, "validation": 800 },
  "metrics": {
    "accuracy": 0.72,
    "f1_macro": 0.68,
    "per_class_f1": { "SELL": 0.65, "HOLD": 0.70, "BUY": 0.71, "STRONG BUY": 0.66 }
  },
  "hyperparameters": {
    "n_estimators": 200,
    "max_depth": 6,
    "learning_rate": 0.1
  }
}
```

---

## User Authentication (JWT)

### Architecture

```
Frontend (React SPA)
    │
    ├── /signup → SignUpPage component
    ├── /signin → SignInPage component
    │
    ↓ POST /api/auth/signup or /api/auth/signin
    │
FastAPI Backend
    │
    ├── bcrypt password hashing
    ├── PyJWT token generation (HS256, 24hr expiry)
    ├── DynamoDB Users table (PK: email)
    │
    ↓ Response: { "token": "eyJ...", "user": { "email": "...", "user_id": "..." } }
    │
Frontend stores token in localStorage
    → Subsequent API requests include: Authorization: Bearer <token>
```

### DynamoDB Users Table Schema

```
Table: quant-screener-users
  PK: email (String)
  Attributes:
    - user_id (String, UUID)
    - password_hash (String, bcrypt)
    - created_at (String, ISO 8601)
```

### API Endpoints

#### POST /api/auth/signup
```json
// Request
{ "email": "user@example.com", "password": "securepass123" }

// Response 201
{ "token": "eyJ...", "user": { "email": "user@example.com", "user_id": "uuid-here" } }

// Response 409 (email exists)
{ "detail": "An account with this email already exists." }

// Response 422 (validation error)
{ "detail": "Password must be at least 8 characters." }
```

#### POST /api/auth/signin
```json
// Request
{ "email": "user@example.com", "password": "securepass123" }

// Response 200
{ "token": "eyJ...", "user": { "email": "user@example.com", "user_id": "uuid-here" } }

// Response 401
{ "detail": "Invalid email or password." }
```

#### GET /api/auth/me
```
Authorization: Bearer eyJ...

// Response 200
{ "email": "user@example.com", "user_id": "uuid-here", "created_at": "2026-06-10T..." }

// Response 401
{ "detail": "Invalid or expired token." }
```

### Backend Implementation

```python
# backend/auth.py

import bcrypt
import jwt
import uuid
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
import boto3

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

router = APIRouter(prefix="/api/auth")
dynamodb = boto3.resource("dynamodb")
users_table = dynamodb.Table("quant-screener-users")

class SignUpRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)

class SignInRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    token: str
    user: dict

def create_token(email: str, user_id: str) -> str:
    payload = {
        "email": email,
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

@router.post("/signup", status_code=201)
async def signup(req: SignUpRequest) -> AuthResponse:
    # Check if user exists
    existing = users_table.get_item(Key={"email": req.email}).get("Item")
    if existing:
        raise HTTPException(409, "An account with this email already exists.")
    
    # Create user
    user_id = str(uuid.uuid4())
    password_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    users_table.put_item(Item={
        "email": req.email,
        "user_id": user_id,
        "password_hash": password_hash,
        "created_at": datetime.utcnow().isoformat(),
    })
    
    token = create_token(req.email, user_id)
    return AuthResponse(token=token, user={"email": req.email, "user_id": user_id})

@router.post("/signin")
async def signin(req: SignInRequest) -> AuthResponse:
    item = users_table.get_item(Key={"email": req.email}).get("Item")
    if not item or not bcrypt.checkpw(req.password.encode(), item["password_hash"].encode()):
        raise HTTPException(401, "Invalid email or password.")
    
    token = create_token(req.email, item["user_id"])
    return AuthResponse(token=token, user={"email": req.email, "user_id": item["user_id"]})

@router.get("/me")
async def get_me(token: str = Depends(get_current_user)):
    return token  # Returns decoded JWT payload
```

### Frontend Components

```
src/components/
├── SignUpPage.tsx       # Registration form
├── SignInPage.tsx       # Login form
src/hooks/
├── useAuth.ts          # Auth context (token, user, login, logout, isAuthenticated)
src/api/
├── auth.ts             # API calls: signup(), signin(), getMe()
```

### Auth Context (useAuth hook)

```typescript
interface AuthContextValue {
  user: { email: string; user_id: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: { email: string; user_id: string }) => void;
  logout: () => void;
}
```

- On mount: read token from localStorage, validate with /api/auth/me
- On login: store token in localStorage, set user state
- On logout: remove token from localStorage, clear user state, navigate to /
