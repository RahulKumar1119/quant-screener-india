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

# Display name -> Yahoo Finance symbol for headline market indices.
INDEX_SYMBOLS = {
    "NIFTY 50": "^NSEI",
    "SENSEX": "^BSESN",
    "NIFTY BANK": "^NSEBANK",
    "NIFTY IT": "^CNXIT",
    "NIFTY PHARMA": "^CNXPHARMA",
    "NIFTY AUTO": "^CNXAUTO",
}



_BSE_TO_NSE: Optional[dict] = None


def resolve_symbol(identifier: str) -> str:
    """Map a 6-digit BSE scrip code to its NSE symbol; pass other input through.

    Unknown codes are returned unchanged so the caller's normal not-found path runs.
    """
    global _BSE_TO_NSE
    identifier = identifier.strip().upper()
    if not (len(identifier) == 6 and identifier.isdigit()):
        return identifier
    if _BSE_TO_NSE is None:
        _BSE_TO_NSE = {
            r["bse_code"]: r["symbol"]
            for r in NSEClient().get_nifty500_constituents()
            if r.get("bse_code")
        }
    return _BSE_TO_NSE.get(identifier, identifier)


def fiscal_quarter_label(period_end) -> str:
    """Label a quarter-end date in the Indian fiscal year (April to March).

    Jun -> Q1, Sep -> Q2, Dec -> Q3, Mar -> Q4. FY is named by the year in
    which it ends, so Dec 2025 is "Q3 FY26".
    """
    month = period_end.month
    quarter = ((month - 4) % 12) // 3 + 1
    fy_end_year = period_end.year + 1 if month >= 4 else period_end.year
    return f"Q{quarter} FY{fy_end_year % 100:02d}"


def _first_value(df: pd.DataFrame, names: tuple, column) -> Optional[float]:
    for name in names:
        if name in df.index:
            value = df.at[name, column]
            if pd.notna(value):
                return float(value)
    return None


def compute_roce(financials: Optional[pd.DataFrame], balance_sheet: Optional[pd.DataFrame]) -> float:
    """ROCE % = trailing EBIT / (total assets - current liabilities).

    Uses the last four quarters of EBIT, annualised when fewer are available,
    and the most recent balance sheet. Returns 0.0 when it cannot be computed.
    """
    try:
        if financials is None or financials.empty or balance_sheet is None or balance_sheet.empty:
            return 0.0
        ebits = [
            v for v in (
                _first_value(financials, ("EBIT", "Operating Income"), col)
                for col in financials.columns[:4]
            ) if v is not None
        ]
        if not ebits:
            return 0.0
        latest = balance_sheet.columns[0]
        assets = _first_value(balance_sheet, ("Total Assets",), latest)
        current_liabilities = _first_value(balance_sheet, ("Current Liabilities",), latest)
        if assets is None or current_liabilities is None:
            return 0.0
        capital_employed = assets - current_liabilities
        if capital_employed <= 0:
            return 0.0
        annual_ebit = sum(ebits) * (4 / len(ebits))
        return round(annual_ebit / capital_employed * 100, 2)
    except Exception as exc:
        logger.warning("ROCE computation failed: %s", exc)
        return 0.0


def dividend_yield_pct(info: dict, last_price: float) -> float:
    """Dividend yield in percent.

    Derived from the annual dividend per share and price, which does not
    depend on whether the data source reports yield as a fraction or a percent.
    """
    rate = info.get("dividendRate") or 0
    if rate and last_price:
        return round(float(rate) / float(last_price) * 100, 2)
    return 0.0




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
                    "yield": dividend_yield_pct(info, last_price),
                },
                "industryInfo": {
                    "sector": info.get("sector") or "",
                    "industry": info.get("industry") or "",
                },
                "_marketCap": market_cap,
                "_pe": pe_ratio,
                "_roe": info.get("returnOnEquity") or 0,
                "_roce": compute_roce(ticker.quarterly_financials, ticker.quarterly_balance_sheet),
                "_dividendYield": dividend_yield_pct(info, last_price),
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
                    "quarter": fiscal_quarter_label(col) if hasattr(col, 'month') else str(col)[:10],
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
                        "bse_code": r.get("bse_code", ""),
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

    def get_market_indices(self) -> list[dict]:
        """Fetch live headline index levels from Yahoo Finance.

        Returns one dict per index in INDEX_SYMBOLS order with keys
        name, value, change_pct. Indices that fail to fetch are skipped
        so a single Yahoo failure never blanks the whole tape.
        """
        import yfinance as yf

        results = []
        for name, yf_symbol in INDEX_SYMBOLS.items():
            try:
                hist = yf.Ticker(yf_symbol).history(period="5d", interval="1d")
                if hist is None or hist.empty or len(hist) < 1:
                    continue
                closes = hist["Close"].dropna()
                if len(closes) < 1:
                    continue
                latest = float(closes.iloc[-1])
                prev = float(closes.iloc[-2]) if len(closes) >= 2 else latest
                change_pct = ((latest - prev) / abs(prev) * 100) if prev else 0.0
                results.append(
                    {"name": name, "value": round(latest, 2), "change_pct": round(change_pct, 2)}
                )
            except Exception as exc:
                logger.warning("index fetch failed for %s (%s): %s", name, yf_symbol, exc)
                continue
        return results
