"""Market data fetching layer using yfinance.

Uses Yahoo Finance (yfinance) for live quotes and historical OHLC data.
Yahoo Finance works reliably from AWS Lambda IPs unlike BSE/NSE direct APIs.
NSE symbols are accessed with .NS suffix (e.g., RELIANCE.NS).
"""

from __future__ import annotations

import csv
import logging
from pathlib import Path
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)

# ponytail: bundled master (~2583 rows) read per-process, not per-request.
# Regen: fetch EQUITY_L.csv, merge market caps. No live NSE call in Lambda (blocked IPs).
_MASTER_CSV = Path(__file__).parent / "data" / "nse_equity_master.csv"
_CACHED_MASTER: Optional[list[dict]] = None

_SECTOR_ESTIMATES = {
    "NIFTY BANK": 52000.0,
    "NIFTY IT": 38000.0,
    "NIFTY PHARMA": 20000.0,
    "NIFTY AUTO": 24000.0,
    "NIFTY FMCG": 56000.0,
}


class NSEClient:
    """Fetches market data using yfinance (Yahoo Finance).

    Maintains the same public interface so app.py works without changes.
    Uses .NS suffix for NSE stock symbols on Yahoo Finance.
    """

    def __init__(self) -> None:
        self._session = None

    def close(self) -> None:
        """No-op for interface compatibility."""
        pass

    def get_live_quote(self, symbol: str) -> dict:
        """Fetch real-time stock quote from Yahoo Finance.

        Returns data structured to match what app.py expects.
        """
        import yfinance as yf

        yf_symbol = f"{symbol.upper()}.NS"

        try:
            ticker = yf.Ticker(yf_symbol)
            info = ticker.info

            last_price = info.get("currentPrice") or info.get("regularMarketPrice") or 0
            prev_close = info.get("previousClose") or info.get("regularMarketPreviousClose") or 0
            open_price = info.get("open") or info.get("regularMarketOpen") or 0
            day_high = info.get("dayHigh") or info.get("regularMarketDayHigh") or 0
            day_low = info.get("dayLow") or info.get("regularMarketDayLow") or 0
            market_cap = info.get("marketCap") or 0
            pe_ratio = info.get("trailingPE") or 0
            company_name = info.get("longName") or info.get("shortName") or symbol

            change = last_price - prev_close if prev_close else 0
            pchange = (change / prev_close * 100) if prev_close else 0

            return {
                "priceInfo": {
                    "lastPrice": last_price,
                    "open": open_price,
                    "close": prev_close,
                    "previousClose": prev_close,
                    "high": day_high,
                    "low": day_low,
                    "change": round(change, 2),
                    "pChange": round(pchange, 2),
                    "vwap": last_price,
                },
                "metadata": {
                    "companyName": company_name,
                    "symbol": symbol,
                    "industry": info.get("industry") or "",
                    "pdSymbolPe": pe_ratio,
                    "isin": info.get("isin") or "",
                },
                "securityInfo": {
                    "issuedSize": info.get("sharesOutstanding") or 0,
                    "yield": info.get("dividendYield") or 0,
                },
                "industryInfo": {
                    "sector": info.get("sector") or "",
                    "industry": info.get("industry") or "",
                },
                "_marketCap": market_cap,
                "_pe": pe_ratio,
                "_roe": info.get("returnOnEquity") or 0,
                "_roce": 0,
                "_dividendYield": round((info.get("dividendYield") or 0) * 100, 2),
            }
        except Exception as exc:
            logger.error("yfinance quote failed for %s: %s", symbol, exc)
            raise ValueError(f"Failed to fetch quote for {symbol}: {exc}")

    def get_historical_ohlc(self, symbol: str, days: int = 30) -> pd.DataFrame:
        """Fetch historical OHLC data from Yahoo Finance.

        Returns DataFrame with DATE, OPEN, HIGH, LOW, CLOSE, VOLUME columns.
        """
        import yfinance as yf

        yf_symbol = f"{symbol.upper()}.NS"

        try:
            df = yf.download(yf_symbol, period=f"{days * 2}d", progress=False, auto_adjust=True)

            if df.empty:
                logger.warning("No historical data for %s", symbol)
                return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])

            # Handle multi-level columns from yfinance
            if isinstance(df.columns, pd.MultiIndex):
                df.columns = df.columns.get_level_values(0)

            result = pd.DataFrame({
                "DATE": df.index,
                "OPEN": df["Open"].values.flatten(),
                "HIGH": df["High"].values.flatten(),
                "LOW": df["Low"].values.flatten(),
                "CLOSE": df["Close"].values.flatten(),
                "VOLUME": df["Volume"].values.flatten() if "Volume" in df.columns else 0,
            })

            result["DATE"] = pd.to_datetime(result["DATE"])
            result = result.dropna(subset=["CLOSE"])
            result = result.sort_values("DATE").reset_index(drop=True)
            return result.tail(days)

        except Exception as exc:
            logger.error("yfinance historical failed for %s: %s", symbol, exc)
            return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])

    def get_quarterly_financials(self, symbol: str) -> list[dict]:
        """Fetch quarterly financials from Yahoo Finance.

        Returns list of quarterly financial dicts.
        """
        import yfinance as yf

        yf_symbol = f"{symbol.upper()}.NS"

        try:
            ticker = yf.Ticker(yf_symbol)
            financials = ticker.quarterly_financials

            if financials is None or financials.empty:
                return []

            results = []
            for col in financials.columns[:4]:  # Last 4 quarters
                quarter_data = financials[col]
                revenue = quarter_data.get("Total Revenue", 0) or 0
                expenses = (quarter_data.get("Total Expenses", 0) or
                           quarter_data.get("Operating Expense", 0) or 0)
                net_profit = quarter_data.get("Net Income", 0) or 0
                operating_profit = revenue - expenses if expenses else net_profit

                margin = (net_profit / revenue * 100) if revenue else 0

                results.append({
                    "quarter": col.strftime("Q%q FY%y") if hasattr(col, 'strftime') else str(col)[:10],
                    "revenue": float(revenue),
                    "expenses": float(expenses),
                    "operating_profit": float(operating_profit),
                    "net_profit": float(net_profit),
                    "margin_pct": round(float(margin), 1),
                })

            return results

        except Exception as exc:
            logger.error("yfinance financials failed for %s: %s", symbol, exc)
            return []

    def get_nifty500_constituents(self) -> list[dict]:
        """Return all NSE equity listings (~2600) from bundled master CSV.

        Keeps the old name so app.py / cache keys work unchanged.
        Shape keeps legacy keys (symbol, meta.companyName) plus
        companyName / market_cap_cr for the /all endpoint.
        """
        global _CACHED_MASTER
        if _CACHED_MASTER is not None:
            return _CACHED_MASTER

        try:
            with open(_MASTER_CSV, newline="", encoding="utf-8") as f:
                out = [
                    {
                        "symbol": r["symbol"],
                        "companyName": r["company_name"] or r["symbol"],
                        "meta": {"companyName": r["company_name"] or r["symbol"]},
                        "isin": r.get("isin", ""),
                        "series": r.get("series", ""),
                        "market_cap_cr": float(r.get("market_cap_cr") or 0),
                        "lastPrice": 0,
                        "pChange": 0,
                    }
                    for r in csv.DictReader(f)
                    if r.get("symbol")
                ]
            if out:
                logger.info("Loaded %d NSE listings from bundled master", len(out))
                _CACHED_MASTER = out
                return out
        except Exception as exc:
            logger.warning("Bundled NSE master unreadable (%s), using fallback", exc)

        fallback = ["RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK"]
        _CACHED_MASTER = [
            {"symbol": s, "companyName": s, "meta": {"companyName": s},
             "lastPrice": 0, "pChange": 0}
            for s in fallback
        ]
        return _CACHED_MASTER

    def get_rbi_repo_rate(self) -> float:
        """Return current RBI repo rate (hardcoded, changes infrequently)."""
        return 6.5

    def get_sector_indices(self) -> dict[str, float]:
        """Return estimated sector index values."""
        return _SECTOR_ESTIMATES.copy()
