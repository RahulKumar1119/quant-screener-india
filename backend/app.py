"""FastAPI application entry point for the Quant Screener India backend.

Provides endpoints for ticker-level analytics with ML inference and
a bulk endpoint for Nifty 500 constituents used by the custom screener.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from cache import CacheManager
from ml_models import GemmaModel, LSTMModel, TFTModel, XGBoostModel
from nse_client import NSEClient
from rate_limiter import RateLimiter
from schemas import (
    AllTickersResponse,
    HistoricalData,
    LSTMProjection,
    QuarterlyFinancial,
    TFTOutput,
    TickerProfile,
    TickerResponse,
    TickerSummary,
    XGBoostOutput,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan: load models and initialize services at startup
# ---------------------------------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all ML models and initialize shared services at startup."""
    # ML models
    app.state.xgboost = XGBoostModel("model_artifacts/xgboost_rating.json")
    app.state.lstm = LSTMModel("model_artifacts/lstm_price.h5")
    app.state.tft = TFTModel("model_artifacts/tft_macro.pt")
    app.state.gemma = GemmaModel()

    # Data services
    app.state.nse_client = NSEClient()
    app.state.cache = CacheManager()
    app.state.rate_limiter = RateLimiter(max_requests=5, window_seconds=1.0)

    logger.info("Application startup complete. All models and services initialized.")
    yield

    # Cleanup
    if hasattr(app.state.nse_client, "_session") and app.state.nse_client._session:
        try:
            app.state.nse_client._session.close()
        except Exception:
            pass
    logger.info("Application shutdown complete.")


# ---------------------------------------------------------------------------
# App creation
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Quant Screener India API",
    description="AI-powered stock screening and analytics for Indian markets (NSE)",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS: allow frontend at localhost:3000
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Helper: safe ML prediction wrapper
# ---------------------------------------------------------------------------


def safe_predict(predict_fn, *args, **kwargs) -> Optional[dict]:
    """Wrap ML inference in try/except, returning None on failure.

    This ensures that ML model failures never crash the request and
    instead result in nullable fields in the response.
    """
    try:
        result = predict_fn(*args, **kwargs)
        return result
    except Exception as e:
        logger.warning("ML prediction failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom handler that includes Retry-After header for 503 and 429."""
    headers = {}
    body = {"detail": exc.detail}

    if exc.status_code in (503, 429):
        retry_after = getattr(exc, "headers", {}).get("Retry-After", "30") if exc.headers else "30"
        headers["Retry-After"] = str(retry_after)
        body["retry_after"] = int(retry_after)

    return JSONResponse(
        status_code=exc.status_code,
        content=body,
        headers=headers,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.get("/api/screener/all", response_model=AllTickersResponse)
async def get_all_tickers(request: Request):
    """Fetch Nifty 500 constituents with summary data.

    Returns summary financial metrics and AI ratings for all Nifty 500
    constituent stocks. Data is cached for 24 hours.
    """
    nse_client: NSEClient = request.app.state.nse_client
    cache: CacheManager = request.app.state.cache

    try:
        constituents = cache.get_or_fetch(
            cache.nifty500,
            "nifty500_constituents",
            nse_client.get_nifty500_constituents,
        )
    except httpx.HTTPStatusError as e:
        raise HTTPException(
            status_code=503,
            detail="NSE India data source is currently unavailable. Please retry later.",
            headers={"Retry-After": "30"},
        )
    except Exception as e:
        logger.error("Failed to fetch Nifty 500 constituents: %s", e)
        raise HTTPException(
            status_code=503,
            detail="NSE India data source is currently unavailable. Please retry later.",
            headers={"Retry-After": "30"},
        )

    tickers = []
    for item in constituents:
        symbol = item.get("symbol", "")
        if not symbol:
            continue

        tickers.append(
            TickerSummary(
                ticker=symbol,
                company_name=item.get("meta", {}).get("companyName", symbol)
                if isinstance(item.get("meta"), dict)
                else symbol,
                market_cap=float(item.get("totalTradedValue", 0)),
                pe_ratio=float(item.get("perChange365d", 0)),
                roe=0.0,
                roce=0.0,
                dividend_yield=0.0,
                ai_rating=None,
                ai_confidence=None,
                tft_score=None,
                tft_trend=None,
            )
        )

    return AllTickersResponse(tickers=tickers)


@app.get("/api/screener/{ticker}", response_model=TickerResponse)
async def get_ticker(ticker: str, request: Request):
    """Fetch full analytics data for a single ticker.

    Pipeline: rate-limit → fetch quote → fetch historical → fetch financials
    → run ML inference → return TickerResponse.
    """
    ticker = ticker.upper()
    nse_client: NSEClient = request.app.state.nse_client
    cache: CacheManager = request.app.state.cache
    rate_limiter: RateLimiter = request.app.state.rate_limiter

    # Rate limiting for outbound NSE requests
    try:
        await rate_limiter.acquire()
    except Exception:
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait before retrying.",
            headers={"Retry-After": "5"},
        )

    # --- Fetch live quote ---
    try:
        quote = cache.get_or_fetch(
            cache.live_quotes,
            f"quote_{ticker}",
            lambda: nse_client.get_live_quote(ticker),
        )
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 404:
            raise HTTPException(
                status_code=404,
                detail=f"Ticker not found on NSE: {ticker}",
            )
        raise HTTPException(
            status_code=503,
            detail="NSE India data source is currently unavailable. Please retry later.",
            headers={"Retry-After": "30"},
        )
    except Exception as e:
        error_msg = str(e).lower()
        if "not found" in error_msg or "invalid" in error_msg:
            raise HTTPException(
                status_code=404,
                detail=f"Ticker not found on NSE: {ticker}",
            )
        raise HTTPException(
            status_code=503,
            detail="NSE India data source is currently unavailable. Please retry later.",
            headers={"Retry-After": "30"},
        )

    # --- Fetch historical OHLC ---
    try:
        historical_df = cache.get_or_fetch(
            cache.historical,
            f"historical_{ticker}",
            lambda: nse_client.get_historical_ohlc(ticker, days=30),
        )
    except Exception as e:
        logger.warning("Failed to fetch historical data for %s: %s", ticker, e)
        raise HTTPException(
            status_code=503,
            detail="NSE India data source is currently unavailable. Please retry later.",
            headers={"Retry-After": "30"},
        )

    # --- Fetch quarterly financials ---
    try:
        raw_financials = cache.get_or_fetch(
            cache.financials,
            f"financials_{ticker}",
            lambda: nse_client.get_quarterly_financials(ticker),
        )
    except Exception as e:
        logger.warning("Failed to fetch financials for %s: %s", ticker, e)
        raise HTTPException(
            status_code=503,
            detail="NSE India data source is currently unavailable. Please retry later.",
            headers={"Retry-After": "30"},
        )

    # --- Extract profile from quote data ---
    price_info = quote.get("priceInfo", {})
    metadata = quote.get("metadata", {})
    security_info = quote.get("securityInfo", {})

    company_name = metadata.get("companyName", ticker)

    profile = TickerProfile(
        market_cap=float(security_info.get("issuedSize", 0)) * float(price_info.get("lastPrice", 0)),
        pe_ratio=float(metadata.get("pdSymbolPe", 0) or 0),
        roe=0.0,  # Not directly available from live quote; populated from financials if available
        roce=0.0,
        dividend_yield=float(security_info.get("yield", 0) or 0),
    )

    # --- Build historical data response ---
    historical = HistoricalData(
        dates=[d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d) for d in historical_df["DATE"].tolist()],
        close_prices=[float(p) for p in historical_df["CLOSE"].tolist()],
    )

    # --- Build quarterly financials response ---
    quarterly_financials = []
    for item in raw_financials[:8]:  # Limit to last 8 quarters
        quarterly_financials.append(
            QuarterlyFinancial(
                quarter=item.get("quarter", item.get("period", "N/A")),
                revenue=float(item.get("revenue", item.get("income", 0)) or 0),
                expenses=float(item.get("expenses", item.get("expenditure", 0)) or 0),
                operating_profit=float(item.get("operating_profit", item.get("operatingProfit", 0)) or 0),
                net_profit=float(item.get("net_profit", item.get("netProfit", 0)) or 0),
                margin_pct=float(item.get("margin_pct", item.get("netProfitMargin", 0)) or 0),
            )
        )

    # --- ML Inference ---
    xgboost_model: XGBoostModel = request.app.state.xgboost
    lstm_model: LSTMModel = request.app.state.lstm
    tft_model: TFTModel = request.app.state.tft
    gemma_model: GemmaModel = request.app.state.gemma

    # XGBoost: rating from financials
    xgboost_result = safe_predict(xgboost_model.predict, raw_financials)
    xgboost_output: Optional[XGBoostOutput] = None
    if xgboost_result:
        xgboost_output = XGBoostOutput(
            rating=xgboost_result["rating"],
            confidence=xgboost_result["confidence"],
        )

    # LSTM: 7-day price projection from historical OHLC
    lstm_result = safe_predict(lstm_model.predict, historical_df)
    lstm_output: Optional[LSTMProjection] = None
    if lstm_result:
        lstm_output = LSTMProjection(
            dates=lstm_result["dates"],
            prices=lstm_result["prices"],
        )

    # TFT: macro resilience score
    tft_output: Optional[TFTOutput] = None
    try:
        repo_rate = nse_client.get_rbi_repo_rate()
        sector_indices = nse_client.get_sector_indices()
        tft_result = safe_predict(tft_model.predict, repo_rate, sector_indices)
        if tft_result:
            tft_output = TFTOutput(
                score=tft_result["score"],
                trend_outlook=tft_result["trend_outlook"],
            )
    except Exception as e:
        logger.warning("TFT macro data fetch failed: %s", e)

    # Gemma: narrative summary
    gemma_summary = ""
    try:
        rating_for_gemma = xgboost_result or {"rating": "N/A", "confidence": 0}
        gemma_summary = gemma_model.generate_summary(
            ticker=ticker,
            financials=raw_financials,
            quote=price_info,
            rating=rating_for_gemma,
        ) or ""
    except Exception as e:
        logger.warning("Gemma summary generation failed for %s: %s", ticker, e)

    # --- Build full response ---
    return TickerResponse(
        ticker=ticker,
        company_name=company_name,
        profile=profile,
        xgboost=xgboost_output,
        lstm_projection=lstm_output,
        tft_score=tft_output,
        gemma_summary=gemma_summary,
        historical=historical,
        quarterly_financials=quarterly_financials,
    )
