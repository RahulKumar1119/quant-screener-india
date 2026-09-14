"""Nightly batch scorer — Lambda handler invoked by EventBridge at 6pm IST.

Scores the top-N NSE listings by market cap (default 50, env
RATINGS_UNIVERSE_SIZE) with the same XGBoost + TFT models as the live API,
minus the Gemma narrative (no per-ticker LLM cost in batch). Results
overwrite the ratings table, which serves GET /api/ratings/strong-buys.

~4s per ticker sequential: 50 tickers fit comfortably in a 15-min timeout.
One ticker failing never stops the run.
"""

from __future__ import annotations

import logging
import os
import time
from datetime import datetime, timedelta, timezone

from ml_models import TFTModel, XGBoostModel
from nse_client import NSEClient
from ratings_store import RatingStore

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

IST = timezone(timedelta(hours=5, minutes=30), "IST")
UNIVERSE_SIZE = int(os.environ.get("RATINGS_UNIVERSE_SIZE", "50"))


def _score_one(
    client: NSEClient,
    xgb: XGBoostModel,
    tft: TFTModel,
    repo_rate: float,
    sectors: dict,
    symbol: str,
    company_name: str,
    as_of: str,
) -> dict | None:
    """Score a single ticker. Returns a ratings-table item or None."""
    try:
        quote = client.get_live_quote(symbol)
        financials = client.get_quarterly_financials(symbol)
    except Exception as e:
        logger.warning("skip %s: data fetch failed: %s", symbol, e)
        return None

    try:
        price_info = quote.get("priceInfo", {})
        metadata = quote.get("metadata", {})

        try:
            pe = float(quote.get("_pe", 0) or 0)
        except (TypeError, ValueError):
            pe = 0.0
        try:
            roe = float(quote.get("_roe", 0) or 0)
        except (TypeError, ValueError):
            roe = 0.0
        # yfinance returns ROE as a fraction (0.18) for many tickers and as
        # a percent for others — same normalization as the live API (app.py)
        if 0 < roe < 1:
            roe *= 100

        stock_data = {
            "symbol": symbol,
            "pe_ratio": pe,
            "roe": roe,
            "price_change": float(price_info.get("pChange", 0) or 0),
        }

        xgb_result = xgb.predict(financials, stock_data)
        tft_result = tft.predict(
            repo_rate,
            sectors,
            {**stock_data, "sector": metadata.get("industry", "")},
        )

        return {
            "ticker": symbol,
            "company_name": metadata.get("companyName", company_name or symbol),
            "rating": xgb_result["rating"],
            "confidence": xgb_result["confidence"],
            "tft_score": tft_result["score"],
            "tft_trend": tft_result["trend_outlook"],
            "as_of": as_of,
        }
    except Exception as e:
        logger.warning("skip %s: scoring failed: %s", symbol, e)
        return None


def handler(event, context) -> dict:
    """Lambda entrypoint. Event content ignored (scheduled run)."""
    started = time.time()
    as_of = datetime.now(IST).strftime("%Y-%m-%d")
    logger.info("ratings batch start: top-%d, as_of=%s", UNIVERSE_SIZE, as_of)

    client = NSEClient()
    xgb = XGBoostModel()
    tft = TFTModel()
    repo_rate = client.get_rbi_repo_rate()
    sectors = client.get_sector_indices()

    constituents = client.get_nifty500_constituents()

    def market_cap(item: dict) -> float:
        try:
            return float(item.get("market_cap_cr") or 0)
        except (TypeError, ValueError):
            return 0.0

    universe = sorted(constituents, key=market_cap, reverse=True)[:UNIVERSE_SIZE]

    scored: list[dict] = []
    for item in universe:
        symbol = item.get("symbol", "")
        if not symbol:
            continue
        result = _score_one(
            client, xgb, tft, repo_rate, sectors,
            symbol, item.get("companyName") or symbol, as_of,
        )
        if result:
            scored.append(result)
        time.sleep(0.3)  # courtesy gap for Yahoo Finance

    written = RatingStore().save_ratings(scored)
    strong = [s["ticker"] for s in scored if s["rating"] == "STRONG BUY"]
    elapsed = int(time.time() - started)
    logger.info(
        "ratings batch done: scored=%d written=%d strong_buys=%d elapsed=%ds",
        len(scored), written, len(strong), elapsed,
    )
    return {"scored": len(scored), "written": written, "strong_buys": strong, "as_of": as_of}
