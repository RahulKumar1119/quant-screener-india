# Implementation Plan: Quant Screener India

## Overview

Full-stack implementation of an AI-powered Financial Stock Screening platform consuming real-time NSE India data. The backend is a FastAPI data aggregation proxy using `jugaad-data` for live NSE feeds, `cachetools` for TTL caching, and pre-trained ML model wrappers (XGBoost, LSTM, TFT, Gemma). The frontend is a React 19 SPA built with Rsbuild, Tailwind CSS, Recharts, TradingView Lightweight Charts, and TanStack Table with Indian localization and dark/light theme support.

## Tasks

- [x] 1. Project scaffolding and configuration
  - [x] 1.1 Initialize frontend project with Rsbuild, React 19, TypeScript, and Tailwind CSS
    - Create `package.json` with dependencies: react, react-dom, react-router-dom, recharts, lightweight-charts, @tanstack/react-table, tailwindcss
    - Create `rsbuild.config.ts` with dev server on port 3000 and API proxy to localhost:8000
    - Create `tailwind.config.ts` with `darkMode: "class"` and default Tailwind breakpoints
    - Create `src/index.css` with Tailwind directives (`@tailwind base; components; utilities`)
    - Create `src/main.tsx` entry point rendering `<App />` into `#root`
    - _Requirements: 10.1, 10.3, 10.4, 10.5, 10.6_

  - [x] 1.2 Initialize backend project with FastAPI, jugaad-data, and ML dependencies
    - Create `backend/requirements.txt` with: fastapi, uvicorn, jugaad-data, httpx, pandas, numpy, xgboost, tensorflow, torch, cachetools, pydantic, boto3
    - Create `backend/` directory structure: `app.py`, `nse_client.py`, `cache.py`, `rate_limiter.py`, `schemas.py`, `ml_models/__init__.py`
    - Create `backend/model_artifacts/` directory with placeholder `.gitkeep` files for model weights
    - _Requirements: 9.10, 9.18_

- [x] 2. Backend: NSE data client and session management
  - [x] 2.1 Implement `backend/nse_client.py` with NSELive integration
    - Create `NSEClient` class with `_ensure_session()` method for NSE cookie management
    - Implement `get_live_quote(symbol)` using `NSELive().stock_quote(symbol)` returning priceInfo and metadata
    - Implement `get_historical_ohlc(symbol, days=30)` using `stock_df()` from jugaad-data
    - Implement `get_quarterly_financials(symbol)` fetching from NSE corporate info API
    - Implement `get_nifty500_constituents()` fetching from equity-stockIndices API
    - Implement `get_rbi_repo_rate()` using jugaad-data RBI module
    - Implement `get_sector_indices()` fetching Nifty sector index values
    - Include session refresh logic on 401/403 responses
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.7, 9.8_

- [x] 3. Backend: TTL caching layer
  - [x] 3.1 Implement `backend/cache.py` with 5-tier TTL caching
    - Create `CacheManager` class with `threading.Lock` for thread-safety
    - Configure `live_quotes` TTLCache: maxsize=1000, ttl=300 (5 min)
    - Configure `historical` TTLCache: maxsize=500, ttl=86400 (24 hr)
    - Configure `financials` TTLCache: maxsize=500, ttl=86400 (24 hr)
    - Configure `ml_predictions` TTLCache: maxsize=1000, ttl=3600 (1 hr)
    - Configure `nifty500` TTLCache: maxsize=1, ttl=86400 (24 hr)
    - Implement `get_or_fetch(cache, key, fetcher)` method with lock-free fetch pattern
    - _Requirements: 9.6_

  - [x]* 3.2 Write property test for cache TTL expiry (Property 13)
    - **Property 13: Cache TTL expiry guarantees freshness**
    - **Validates: Requirements 9.6**

- [x] 4. Backend: Rate limiter
  - [x] 4.1 Implement `backend/rate_limiter.py` with token bucket algorithm
    - Create `RateLimiter` class with asyncio lock and deque of timestamps
    - Configure max 5 requests per 1-second window
    - Implement `acquire()` async method that waits for available slot
    - Implement exponential backoff on NSE 429 responses (2^n seconds, max 60s)
    - _Requirements: 9.17_

- [x] 5. Backend: Pydantic response schemas
  - [x] 5.1 Implement `backend/schemas.py` with all response models
    - Define `TickerProfile` model (market_cap, pe_ratio, roe, roce, dividend_yield)
    - Define `XGBoostOutput` model (rating: Literal enum, confidence: float 0-1)
    - Define `LSTMProjection` model (dates: list[str], prices: list[float])
    - Define `TFTOutput` model (score: int 0-100, trend_outlook: Literal enum)
    - Define `QuarterlyFinancial` model (quarter, revenue, expenses, operating_profit, net_profit, margin_pct)
    - Define `HistoricalData` model (dates: list[str], close_prices: list[float])
    - Define `TickerResponse` model with nullable ML fields (xgboost, lstm_projection, tft_score as Optional)
    - Define `TickerSummary` and `AllTickersResponse` models for /api/screener/all
    - Define `ErrorResponse` model (detail: str, retry_after: Optional[int])
    - _Requirements: 9.1, 9.5_

- [x] 6. Backend: ML model wrappers
  - [x] 6.1 Implement `backend/ml_models/xgboost_model.py`
    - Create `XGBoostModel` class loading pre-trained model from JSON artifact
    - Implement `predict(financials)` extracting features from quarterly data and returning rating + confidence
    - Define rating_map: {0: "SELL", 1: "HOLD", 2: "BUY", 3: "STRONG BUY"}
    - Implement `_extract_features()` computing revenue growth, margins, profit trends
    - _Requirements: 9.12_

  - [x] 6.2 Implement `backend/ml_models/lstm_model.py`
    - Create `LSTMModel` class loading Keras .h5 model
    - Implement `predict(historical_df)` normalizing 30-day OHLC and auto-regressively predicting 7 days
    - Implement `_generate_trading_dates(count)` producing weekday-only future dates
    - _Requirements: 9.13_

  - [x] 6.3 Implement `backend/ml_models/tft_model.py`
    - Create `TFTModel` class loading PyTorch .pt model
    - Implement `predict(repo_rate, sector_indices)` producing score (0-100) and trend outlook
    - Implement `_score_to_trend(score)` mapping: ≥65 Bullish, ≤35 Bearish, else Neutral
    - _Requirements: 9.14_

  - [x] 6.4 Implement `backend/ml_models/gemma_model.py`
    - Create `GemmaModel` class connecting to AWS Bedrock (Gemma 3 4B IT)
    - Use `boto3` client for `bedrock-runtime` to invoke Gemma 3 4B IT model
    - Implement `generate_summary(ticker, financials, quote, rating)` with SEBI-style prompt
    - Handle boto3 exceptions and timeouts gracefully (return empty string)
    - _Requirements: 9.15_

  - [x] 6.5 Create `backend/ml_models/__init__.py` exporting all model classes
    - Export XGBoostModel, LSTMModel, TFTModel, GemmaModel
    - _Requirements: 9.11_

  - [ ]* 6.6 Write property test for XGBoost output domain validity (Property 12)
    - **Property 12: XGBoost output domain validity**
    - **Validates: Requirements 9.12**

- [x] 7. Backend: FastAPI application with endpoints, lifespan, and error handling
  - [x] 7.1 Implement `backend/app.py` with lifespan, endpoints, and CORS
    - Create FastAPI app with `lifespan` context manager loading all ML models, NSEClient, CacheManager, RateLimiter at startup
    - Implement `GET /api/screener/{ticker}` endpoint: rate-limit → fetch quote → fetch historical → fetch financials → run ML inference → return TickerResponse
    - Implement `GET /api/screener/all` endpoint: fetch Nifty 500 constituents with summary data
    - Implement `safe_predict()` helper wrapping ML inference with try/except returning None on failure
    - Add CORS middleware allowing origin `http://localhost:3000`
    - Add HTTPException handlers for 404 (ticker not found), 503 (NSE unreachable), 429 (rate limited)
    - Include `Retry-After` header in 503 and 429 responses
    - _Requirements: 9.1, 9.5, 9.8, 9.9, 9.10, 9.11, 9.16, 9.17_

  - [ ]* 7.2 Write property test for API response schema conformance (Property 10)
    - **Property 10: API response schema conformance with live data**
    - **Validates: Requirements 9.1, 9.5**

- [x] 8. Checkpoint - Backend complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Frontend: TypeScript types
  - [x] 9.1 Implement `src/types/index.ts` with all type definitions
    - Define AIRating, TrendOutlook literal union types
    - Define TickerProfile, XGBoostOutput, LSTMProjection, TFTOutput interfaces
    - Define QuarterlyFinancial, HistoricalData interfaces
    - Define TickerResponse with nullable ML fields (xgboost: XGBoostOutput | null, etc.)
    - Define TickerSummary, AllTickersResponse interfaces
    - Define ErrorResponse interface with optional retry_after
    - Define ComparisonOperator, LogicalOperator, QueryCondition, ParsedQuery, QueryParseError, QueryParseResult types
    - Define Theme type ("dark" | "light")
    - _Requirements: 13.4_

- [x] 10. Frontend: Utility modules
  - [x] 10.1 Implement `src/utils/indianFormat.ts`
    - Implement `formatIndianCurrency(value)`: ≥1Cr → "₹X.XX Cr", ≥1L → "₹X.XX L", else Indian comma grouping
    - Implement `indianCommaGrouping(value)`: rightmost 3 digits, then groups of 2
    - Implement `formatPercentage(value)`: "X.X%"
    - _Requirements: 3.2, 6.2, 11.1, 11.2_

  - [ ]* 10.2 Write property test for Indian currency formatting (Property 3)
    - **Property 3: Indian currency formatting correctness**
    - **Validates: Requirements 3.2, 6.2, 11.1, 11.2**

  - [x] 10.3 Implement `src/utils/tradingDates.ts`
    - Implement `generateTradingDates(startDate, count)`: produces weekday-only date strings
    - Implement `isWeekday(dateStr)`: returns true for Mon-Fri
    - _Requirements: 4.4, 11.4_

  - [x]* 10.4 Write property test for trading date axis (Property 5)
    - **Property 5: Trading date axis excludes weekends**
    - **Validates: Requirements 4.4, 11.4**

  - [x] 10.5 Implement `src/utils/queryParser.ts`
    - Implement `parseQuery(input)`: tokenize → parse conditions → validate fields → return ParsedQuery or QueryParseError
    - Implement `evaluateQuery(query, ticker)`: evaluate conditions against ticker fields with AND/OR logic
    - Support fields: Market Cap, PE, ROE, ROCE, Dividend Yield, AI_Rating, AI_Confidence, TFT_Score
    - Support operators: >, <, >=, <=, =, !=
    - Return error with position on invalid input
    - _Requirements: 8.2, 8.4, 8.6, 8.7_

  - [x]* 10.6 Write property test for screener query filtering (Property 8)
    - **Property 8: Custom screener query filtering**
    - **Validates: Requirements 8.4, 8.6**

  - [x]* 10.7 Write property test for invalid query error reporting (Property 9)
    - **Property 9: Invalid query error reporting**
    - **Validates: Requirements 8.7**

  - [x] 10.8 Implement `src/utils/thresholds.ts`
    - Implement `getBadgeColor(field, value)` with threshold rules: PE<25 green, ROE>15 green, ROCE>15 green, Dividend Yield>1.5 green
    - Export ThresholdRule type and ratingColorMap for XGBoost badge colors
    - _Requirements: 3.3, 5.3_

  - [x]* 10.9 Write property test for threshold badge color mapping (Property 4)
    - **Property 4: Threshold badge color mapping**
    - **Validates: Requirements 3.3**

- [x] 11. Frontend: API client with error handling
  - [x] 11.1 Implement `src/api/client.ts`
    - Implement `fetchTickerData(ticker)`: GET /api/screener/{ticker}, parse JSON, handle 503/429/404 errors
    - Implement `fetchAllTickers()`: GET /api/screener/all, parse JSON
    - Return typed ErrorResponse on HTTP errors with retry_after extraction
    - Handle network timeouts with descriptive error messages
    - _Requirements: 9.1, 9.16_

- [x] 12. Frontend: Theme system
  - [x] 12.1 Implement `src/hooks/useTheme.ts` and ThemeProvider context
    - Create ThemeContext with `theme` state and `toggleTheme` function
    - On mount: read localStorage("theme") → if present use it, else read `prefers-color-scheme` media query
    - On toggle: flip theme, update `<html>` class (add/remove "dark"), persist to localStorage
    - _Requirements: 2.1, 2.3, 2.4, 2.5_

  - [ ]* 12.2 Write property test for theme persistence round-trip (Property 2)
    - **Property 2: Theme persistence round-trip**
    - **Validates: Requirements 2.4**

- [x] 13. Frontend: Navigation header with ticker search
  - [x] 13.1 Implement `src/components/NavigationHeader.tsx`
    - Render sticky header with Logo, TickerSearchBar, and ThemeToggle
    - Use Tailwind `sticky top-0 z-50` positioning
    - Responsive: search bar collapses to icon on mobile
    - _Requirements: 1.1, 1.6, 2.2_

  - [x] 13.2 Implement `src/components/TickerSearchBar.tsx`
    - Render search input with typeahead suggestions filtered from Nifty 500 list
    - Filter suggestions as case-insensitive substring match on ticker symbol
    - On selection: navigate to `/:ticker` route using React Router
    - _Requirements: 1.2, 1.3, 1.4_

  - [ ]* 13.3 Write property test for search suggestion filtering (Property 1)
    - **Property 1: Search suggestion filtering**
    - **Validates: Requirements 1.3**

  - [x] 13.4 Implement `src/components/ThemeToggle.tsx`
    - Render toggle button consuming useTheme hook
    - Display sun/moon icon based on current theme
    - _Requirements: 2.2, 2.3_

- [x] 14. Checkpoint - Core structure and utilities complete
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15. Frontend: Analytics page components
  - [x] 15.1 Implement `src/hooks/useTickerData.ts`
    - Fetch from `/api/screener/{ticker}` on ticker change using `fetchTickerData`
    - Cache responses in `useRef` map to avoid refetching within session
    - Expose `data`, `loading`, `error`, `isPartial` state (isPartial=true when ML fields are null)
    - Handle 503 and 429 errors with appropriate error state
    - _Requirements: 1.5, 9.1, 9.16_

  - [x] 15.2 Implement `src/components/ProfileCardGrid.tsx`
    - Render 5 metric cards: Market Cap, PE, ROE, ROCE, Dividend Yield
    - Format values using `formatIndianCurrency` and `formatPercentage`
    - Apply color-coded badges using `getBadgeColor` from thresholds utility
    - Responsive grid: `grid-cols-2 md:grid-cols-3 lg:grid-cols-5`
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 15.3 Implement `src/components/PriceChart.tsx` with TradingView Lightweight Charts
    - Render line chart with 30-day historical closing prices (solid gray line)
    - Render LSTM projection as dashed Royal Blue line extending 7 trading days
    - Use YYYY-MM-DD date strings (weekday-only, TradingView skips gaps natively)
    - Separate series for historical and projection with clear transition point
    - Handle null `lstm_projection` gracefully (show historical only)
    - Responsive via ResizeObserver: 350px desktop, 250px mobile
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 15.4 Implement `src/components/TFTScoreGauge.tsx`
    - Render gauge visualization for TFT Macro Resilience Score (0-100)
    - Display trend outlook label (Bullish/Bearish/Neutral)
    - Handle null `tft_score` with "ML analysis unavailable" placeholder
    - _Requirements: 5.1_

  - [x] 15.5 Implement `src/components/XGBoostRatingBadge.tsx`
    - Render badge with rating text and confidence percentage
    - Apply color from ratingColorMap: emerald-600 STRONG BUY, green-500 BUY, amber-500 HOLD, red-600 SELL
    - Handle null `xgboost` with "Rating unavailable" placeholder
    - _Requirements: 5.2, 5.3_

  - [ ]* 15.6 Write property test for XGBoost rating badge color (Property 6)
    - **Property 6: XGBoost rating badge color correctness**
    - **Validates: Requirements 5.3**

  - [x] 15.7 Implement `src/components/IntelEngineDashboard.tsx`
    - Compose PriceChart + TFTScoreGauge + XGBoostRatingBadge in split layout
    - Desktop: `lg:flex-row` with 70/30 chart/scoring split
    - Mobile: `flex-col` stacking chart above scoring
    - _Requirements: 5.4, 5.5_

  - [x] 15.8 Implement `src/components/FinancialTable.tsx` with TanStack Table
    - Render quarterly financial data: Revenue, Expenses, Operating Profit, Net Profit, Margin %
    - Format monetary values with `formatIndianCurrency` (Crores)
    - Apply alternating row shading, right-align numeric columns
    - Enable column-based sorting via TanStack Table `getSortedRowModel`
    - Mobile: `overflow-x-auto` wrapper for horizontal scrolling
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [ ]* 15.9 Write property test for financial table column sorting (Property 7)
    - **Property 7: Financial table column sorting**
    - **Validates: Requirements 6.5**

  - [x] 15.10 Implement `src/components/GemmaSummaryCard.tsx`
    - Render SEBI-style narrative summary in a distinct callout card
    - Label clearly as "AI-Generated Analysis"
    - Handle empty gemma_summary string with "Summary unavailable" placeholder
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 15.11 Implement `src/components/AnalyticsPage.tsx`
    - Compose ProfileCardGrid → IntelEngineDashboard → FinancialTable → GemmaSummaryCard
    - Read ticker from URL param (default to "JNKINDIA")
    - Use `useTickerData` hook for data fetching
    - Show loading skeleton, error states (503 banner with retry, 404 message), and partial response handling
    - _Requirements: 1.5, 9.16_

- [ ] 16. Frontend: Custom screener page
  - [ ] 16.1 Implement `src/hooks/useScreenerQuery.ts`
    - Fetch `/api/screener/all` once on mount, cache full dataset
    - Expose `executeQuery(queryText)`: parse → filter cached dataset → set results
    - Expose `results`, `error`, `loading` state
    - _Requirements: 8.4_

  - [ ] 16.2 Implement `src/components/QueryInputArea.tsx`
    - Render multiline text input for query entry
    - Submit button triggers `executeQuery`
    - Display inline error messages with position indicator on parse failure
    - _Requirements: 8.2, 8.7_

  - [ ] 16.3 Implement `src/components/HelperPanel.tsx`
    - Display all available query fields (Market Cap, PE, ROE, ROCE, Dividend Yield, AI_Rating, AI_Confidence, TFT_Score)
    - Display supported operators (>, <, >=, <=, =, !=, AND, OR)
    - Show example queries
    - _Requirements: 8.3_

  - [ ] 16.4 Implement `src/components/ScreenerResultsGrid.tsx`
    - Render filtered results in a paginated, sortable TanStack Table grid
    - Display ticker, company name, market cap, PE, ROE, AI rating, TFT score columns
    - Format values with Indian localization
    - Implement client-side pagination
    - _Requirements: 8.5_

  - [ ]* 16.5 Write property test for screener results pagination (Property 11)
    - **Property 11: Screener results pagination**
    - **Validates: Requirements 8.5**

  - [ ] 16.6 Implement `src/components/CustomScreenerPage.tsx`
    - Compose QueryInputArea + HelperPanel + ScreenerResultsGrid
    - Desktop: `md:flex-row` with 70/30 query/helper split
    - Mobile: stack vertically
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 17. Frontend: App routing and layout
  - [ ] 17.1 Implement `src/App.tsx` with React Router and ThemeProvider
    - Wrap app in ThemeProvider context
    - Define routes: `/` → AnalyticsPage (default JNKINDIA), `/:ticker` → AnalyticsPage, `/screener` → CustomScreenerPage
    - Render NavigationHeader above RouterOutlet on all routes
    - Apply `max-w-7xl mx-auto px-4` container
    - _Requirements: 1.5, 8.1, 10.6_

- [ ] 18. Checkpoint - Full frontend and backend wired together
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 19. Integration tests and backend connectivity
  - [ ]* 19.1 Write integration tests for backend NSE connectivity
    - Test backend fetches valid live quote for known tickers (RELIANCE, TCS, INFY)
    - Test backend returns 503 when NSE session cannot be established
    - Test cache returns fresh data after TTL expiry
    - Test rate limiter enforces max 5 requests/second
    - Test ML models produce valid output shapes from real NSE data
    - Test CORS headers present for localhost:3000 origin
    - Test /api/screener/all returns Nifty 500 constituents with required fields
    - _Requirements: 9.1, 9.6, 9.9, 9.16, 9.17_

- [ ] 20. Responsive design polish
  - [ ] 20.1 Apply responsive design refinements across all components
    - Verify NavigationHeader collapses search to icon on mobile
    - Verify ProfileCardGrid flows 2→3→5 columns across breakpoints
    - Verify IntelEngineDashboard stacks chart above ML panel on mobile
    - Verify FinancialTable has horizontal scrolling on mobile
    - Verify CustomScreenerPage stacks query/helper panels on mobile
    - Test all layouts at 320px, 768px, 1024px, 1280px, 1920px widths
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 1.6, 3.4, 4.5, 5.5, 6.6_

- [ ] 21. Final checkpoint - All features complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (13 properties total)
- The backend uses NO mock data — all data comes from live NSE India APIs via jugaad-data
- ML model artifacts must be pre-trained and placed in `backend/model_artifacts/` before running
- Gemma 3 4B IT runs via AWS Bedrock (requires AWS credentials with Bedrock access)
- Frontend handles nullable ML fields gracefully — partial responses show available data with "unavailable" placeholders

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "5.1", "9.1"] },
    { "id": 2, "tasks": ["3.1", "4.1", "6.1", "6.2", "6.3", "6.4", "6.5", "10.1", "10.3", "10.5", "10.8"] },
    { "id": 3, "tasks": ["3.2", "6.6", "10.2", "10.4", "10.6", "10.7", "10.9", "11.1"] },
    { "id": 4, "tasks": ["7.1", "12.1"] },
    { "id": 5, "tasks": ["7.2", "12.2", "13.1", "13.2", "13.4"] },
    { "id": 6, "tasks": ["13.3", "15.1", "16.1"] },
    { "id": 7, "tasks": ["15.2", "15.3", "15.4", "15.5", "15.7", "15.8", "15.10", "16.2", "16.3", "16.4"] },
    { "id": 8, "tasks": ["15.6", "15.9", "15.11", "16.5", "16.6"] },
    { "id": 9, "tasks": ["17.1"] },
    { "id": 10, "tasks": ["19.1", "20.1"] }
  ]
}
```
