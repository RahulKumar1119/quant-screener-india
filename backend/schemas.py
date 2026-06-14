"""Pydantic response models for API endpoints."""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class TickerProfile(BaseModel):
    """Key financial ratios for a ticker."""

    market_cap: float = Field(
        ...,
        description="Market capitalization in INR",
        examples=[458700000000],
    )
    pe_ratio: float = Field(
        ...,
        description="Price-to-Earnings ratio",
        examples=[22.4],
    )
    roe: float = Field(
        ...,
        description="Return on Equity percentage",
        examples=[18.7],
    )
    roce: float = Field(
        ...,
        description="Return on Capital Employed percentage",
        examples=[21.3],
    )
    dividend_yield: float = Field(
        ...,
        description="Dividend Yield percentage",
        examples=[1.2],
    )


class XGBoostOutput(BaseModel):
    """XGBoost model rating output."""

    rating: Literal["STRONG BUY", "BUY", "HOLD", "SELL"] = Field(
        ...,
        description="AI-generated stock rating",
        examples=["STRONG BUY"],
    )
    confidence: float = Field(
        ...,
        ge=0,
        le=1,
        description="Model confidence score between 0 and 1",
        examples=[0.87],
    )


class TFTOutput(BaseModel):
    """Temporal Fusion Transformer macro resilience output."""

    score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Macro Resilience Score from 0 to 100",
        examples=[72],
    )
    trend_outlook: Literal["Bullish", "Bearish", "Neutral"] = Field(
        ...,
        description="Market trend outlook based on macro signals",
        examples=["Bullish"],
    )


class QuarterlyFinancial(BaseModel):
    """Single quarter financial data from NSE corporate info."""

    quarter: str = Field(
        ...,
        description="Quarter identifier (e.g., Q3 FY25)",
        examples=["Q3 FY25"],
    )
    revenue: float = Field(
        ...,
        description="Total revenue in INR",
        examples=[12500000000],
    )
    expenses: float = Field(
        ...,
        description="Total expenses in INR",
        examples=[9800000000],
    )
    operating_profit: float = Field(
        ...,
        description="Operating profit in INR",
        examples=[2700000000],
    )
    net_profit: float = Field(
        ...,
        description="Net profit in INR",
        examples=[1900000000],
    )
    margin_pct: float = Field(
        ...,
        description="Net profit margin percentage",
        examples=[15.2],
    )


class HistoricalData(BaseModel):
    """30-day historical OHLC closing price data."""

    dates: List[str] = Field(
        ...,
        description="List of historical trading dates (YYYY-MM-DD, weekdays only)",
        examples=[["2024-12-18", "2024-12-19", "2024-12-20"]],
    )
    close_prices: List[float] = Field(
        ...,
        description="List of historical closing prices in INR",
        examples=[[230.0, 232.5, 231.8]],
    )


class TickerResponse(BaseModel):
    """Full response for GET /api/screener/{ticker}."""

    ticker: str = Field(
        ...,
        description="NSE stock symbol",
        examples=["JNKINDIA"],
    )
    company_name: str = Field(
        ...,
        description="Full company name",
        examples=["JNK India Limited"],
    )
    profile: TickerProfile
    xgboost: Optional[XGBoostOutput] = Field(
        None,
        description="XGBoost rating output, null if ML inference unavailable",
    )
    tft_score: Optional[TFTOutput] = Field(
        None,
        description="TFT macro resilience score, null if ML inference unavailable",
    )
    gemma_summary: str = Field(
        "",
        description="AI-generated SEBI-style narrative summary",
        examples=["Based on current fundamentals, JNKINDIA demonstrates..."],
    )
    historical: HistoricalData
    quarterly_financials: List[QuarterlyFinancial] = Field(
        ...,
        description="List of quarterly financial results from NSE corporate info",
    )


class TickerSummary(BaseModel):
    """Summary data for a single ticker in the /api/screener/all response."""

    ticker: str = Field(
        ...,
        description="NSE stock symbol",
        examples=["JNKINDIA"],
    )
    company_name: str = Field(
        ...,
        description="Full company name",
        examples=["JNK India Limited"],
    )
    market_cap: float = Field(
        ...,
        description="Market capitalization in INR",
        examples=[458700000000],
    )
    pe_ratio: float = Field(
        ...,
        description="Price-to-Earnings ratio",
        examples=[22.4],
    )
    roe: float = Field(
        ...,
        description="Return on Equity percentage",
        examples=[18.7],
    )
    roce: float = Field(
        ...,
        description="Return on Capital Employed percentage",
        examples=[21.3],
    )
    dividend_yield: float = Field(
        ...,
        description="Dividend Yield percentage",
        examples=[1.2],
    )
    ai_rating: Optional[Literal["STRONG BUY", "BUY", "HOLD", "SELL"]] = Field(
        None,
        description="XGBoost AI rating",
        examples=["STRONG BUY"],
    )
    ai_confidence: Optional[float] = Field(
        None,
        ge=0,
        le=1,
        description="XGBoost confidence score",
        examples=[0.87],
    )
    tft_score: Optional[int] = Field(
        None,
        ge=0,
        le=100,
        description="TFT Macro Resilience Score",
        examples=[72],
    )
    tft_trend: Optional[Literal["Bullish", "Bearish", "Neutral"]] = Field(
        None,
        description="TFT trend outlook",
        examples=["Bullish"],
    )


class AllTickersResponse(BaseModel):
    """Response for GET /api/screener/all."""

    tickers: List[TickerSummary] = Field(
        ...,
        description="List of all Nifty 500 constituent summaries",
    )


class ErrorResponse(BaseModel):
    """Error response returned on API failures."""

    detail: str = Field(
        ...,
        description="Human-readable error message",
        examples=["Ticker not found on NSE: INVALID"],
    )
    retry_after: Optional[int] = Field(
        None,
        description="Suggested retry delay in seconds (for 503/429 responses)",
        examples=[30],
    )
