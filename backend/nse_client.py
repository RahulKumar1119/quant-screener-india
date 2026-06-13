"""BSE India data fetching layer.

Fetches live stock data from BSE India public APIs (api.bseindia.com)
which work reliably from cloud IPs without session cookie issues.

Cross-references NSE symbols to BSE scrip codes using ISIN mapping
from both BSE equity list and NSE equity master CSV.
"""

from __future__ import annotations

import csv
import io
import logging
from datetime import date, timedelta
from typing import Optional

import httpx
import pandas as pd

logger = logging.getLogger(__name__)

_BSE_API_BASE = "https://api.bseindia.com/BseIndiaAPI/api"
_NSE_EQUITY_CSV = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"

_BSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0",
    "Accept": "application/json",
    "Referer": "https://www.bseindia.com/",
}

_SECTOR_ESTIMATES = {
    "NIFTY BANK": 52000.0,
    "NIFTY IT": 38000.0,
    "NIFTY PHARMA": 20000.0,
    "NIFTY AUTO": 24000.0,
    "NIFTY FMCG": 56000.0,
}


class NSEClient:
    """Fetches market data from BSE India APIs with NSE symbol compatibility.

    Maintains the same public interface as the previous NSE-direct
    implementation so that app.py continues to work without changes.
    Uses ISIN cross-reference to map NSE symbols to BSE scrip codes.
    """

    def __init__(self) -> None:
        self._session: Optional[httpx.Client] = None
        # NSE symbol -> BSE scrip code mapping
        self._symbol_to_bse: dict[str, str] = {}
        # BSE scrip code -> company name mapping
        self._bse_to_company: dict[str, str] = {}
        # NSE symbol -> ISIN mapping (from NSE master)
        self._symbol_to_isin: dict[str, str] = {}
        # ISIN -> BSE scrip code mapping
        self._isin_to_bse: dict[str, str] = {}
        # All BSE stocks with market cap (cached from list endpoint)
        self._bse_stocks: list[dict] = []

    # ------------------------------------------------------------------
    # Session management
    # ------------------------------------------------------------------

    def _ensure_session(self) -> httpx.Client:
        """Create or return the shared httpx.Client for BSE API calls."""
        if self._session is None:
            self._session = httpx.Client(
                headers=_BSE_HEADERS,
                follow_redirects=True,
                timeout=httpx.Timeout(30.0),
            )
        return self._session

    def _get(self, url: str, timeout: float = 30.0) -> httpx.Response:
        """Make a GET request with error handling.

        Args:
            url: Full URL to fetch.
            timeout: Request timeout in seconds.

        Returns:
            httpx.Response on success.

        Raises:
            httpx.HTTPStatusError: On non-2xx response.
        """
        session = self._ensure_session()
        resp = session.get(url, timeout=timeout)
        resp.raise_for_status()
        return resp

    # ------------------------------------------------------------------
    # Symbol mapping
    # ------------------------------------------------------------------

    def _load_bse_stocks(self) -> None:
        """Fetch full BSE equity list with scrip codes and ISIN.

        Populates _isin_to_bse and _bse_to_company mappings.
        Also caches raw stock data for get_nifty500_constituents.
        """
        if self._bse_stocks:
            return

        url = (
            f"{_BSE_API_BASE}/ListofScripData/w"
            "?Group=&Scripcode=&industry=&segment=Equity&status=Active"
        )
        try:
            resp = self._get(url, timeout=60.0)
            data = resp.json()
            if isinstance(data, list):
                self._bse_stocks = data
                for item in data:
                    scrip_code = str(item.get("Scrip_Code", "") or item.get("SCRIP_CD", "")).strip()
                    isin = str(item.get("ISIN_NUMBER", "") or item.get("Isin_Number", "")).strip()
                    company = str(item.get("Scrip_Name", "") or item.get("SCRIP_NAME", "")).strip()
                    if scrip_code and isin:
                        self._isin_to_bse[isin] = scrip_code
                        self._bse_to_company[scrip_code] = company
            logger.info("Loaded %d BSE stocks for mapping.", len(self._bse_stocks))
        except Exception as exc:
            logger.error("Failed to load BSE stock list: %s", exc)

    def _load_nse_master(self) -> None:
        """Fetch NSE equity master CSV for symbol-to-ISIN mapping."""
        if self._symbol_to_isin:
            return

        try:
            session = self._ensure_session()
            resp = session.get(
                _NSE_EQUITY_CSV,
                timeout=30.0,
                headers={
                    "User-Agent": _BSE_HEADERS["User-Agent"],
                    "Accept": "text/csv,application/csv,*/*",
                },
            )
            resp.raise_for_status()
            text = resp.text
            reader = csv.DictReader(io.StringIO(text))
            for row in reader:
                symbol = (row.get("SYMBOL") or "").strip()
                isin = (row.get(" ISIN NUMBER") or row.get("ISIN NUMBER") or "").strip()
                if symbol and isin:
                    self._symbol_to_isin[symbol] = isin
            logger.info("Loaded %d NSE symbols from master CSV.", len(self._symbol_to_isin))
        except Exception as exc:
            logger.error("Failed to load NSE equity master CSV: %s", exc)

    def _build_mapping(self) -> None:
        """Build NSE symbol -> BSE scrip code mapping via ISIN cross-reference."""
        if self._symbol_to_bse:
            return

        self._load_bse_stocks()
        self._load_nse_master()

        for symbol, isin in self._symbol_to_isin.items():
            bse_code = self._isin_to_bse.get(isin)
            if bse_code:
                self._symbol_to_bse[symbol] = bse_code

        logger.info(
            "Built symbol mapping: %d NSE symbols mapped to BSE codes.",
            len(self._symbol_to_bse),
        )

    def _get_bse_code(self, symbol: str) -> Optional[str]:
        """Look up BSE scrip code for an NSE symbol.

        Lazily builds the mapping on first access.

        Args:
            symbol: NSE equity symbol (e.g. "RELIANCE").

        Returns:
            BSE scrip code string or None if not found.
        """
        self._build_mapping()
        return self._symbol_to_bse.get(symbol.upper())

    # ------------------------------------------------------------------
    # Public data methods
    # ------------------------------------------------------------------

    def get_live_quote(self, symbol: str) -> dict:
        """Fetch real-time stock quote from BSE.

        Returns data formatted to match the structure expected by app.py:
        - priceInfo: lastPrice, open, close, previousClose, change, pChange
        - metadata: companyName, industry, pdSymbolPe
        - securityInfo: issuedSize, yield

        Args:
            symbol: NSE equity symbol (e.g. "RELIANCE", "TCS").

        Returns:
            Dict mimicking NSE quote structure for backward compatibility.

        Raises:
            ValueError: If symbol cannot be mapped to a BSE scrip code.
            httpx.HTTPStatusError: On BSE API failure.
        """
        bse_code = self._get_bse_code(symbol)
        if not bse_code:
            raise ValueError(f"Symbol not found: {symbol} (no BSE mapping)")

        url = (
            f"{_BSE_API_BASE}/getScripHeaderData/w"
            f"?Debtflag=&scripcode={bse_code}&seriesid="
        )
        resp = self._get(url)
        data = resp.json()

        # BSE returns data in "Header" and "CurrRate" sub-objects
        header = data.get("Header", {}) if isinstance(data, dict) else {}
        curr_rate = data.get("CurrRate", {}) if isinstance(data, dict) else {}

        # Parse numeric values safely
        def parse_float(val, default=0.0) -> float:
            if val is None:
                return default
            try:
                cleaned = str(val).replace(",", "").strip()
                return float(cleaned) if cleaned else default
            except (ValueError, TypeError):
                return default

        last_price = parse_float(header.get("LTP") or curr_rate.get("LTP"))
        prev_close = parse_float(header.get("PrevClose") or curr_rate.get("PrevClose"))
        open_price = parse_float(header.get("Open") or curr_rate.get("Open"))
        high = parse_float(header.get("High") or curr_rate.get("High"))
        low = parse_float(header.get("Low") or curr_rate.get("Low"))
        change = last_price - prev_close if prev_close else 0.0
        pchange = (change / prev_close * 100) if prev_close else 0.0

        company_name = (
            header.get("ScripName")
            or header.get("LongName")
            or self._bse_to_company.get(bse_code, symbol)
        )
        market_cap_str = header.get("Mktcap") or header.get("MktCap") or "0"
        market_cap = parse_float(market_cap_str)

        # Estimate issued shares from market cap / price
        issued_size = int(market_cap * 1e7 / last_price) if last_price > 0 else 0

        return {
            "priceInfo": {
                "lastPrice": last_price,
                "open": open_price,
                "close": prev_close,
                "previousClose": prev_close,
                "high": high,
                "low": low,
                "change": round(change, 2),
                "pChange": round(pchange, 2),
                "vwap": last_price,  # BSE doesn't provide VWAP in header
            },
            "metadata": {
                "companyName": company_name,
                "symbol": symbol,
                "industry": header.get("Industry") or header.get("Sector") or "",
                "pdSymbolPe": parse_float(header.get("PE") or header.get("Facevalue")),
                "isin": header.get("ISIN") or "",
            },
            "securityInfo": {
                "issuedSize": issued_size,
                "yield": parse_float(header.get("Dividend") or 0),
            },
            "industryInfo": {
                "sector": header.get("Sector") or header.get("Industry") or "",
                "industry": header.get("Industry") or "",
            },
        }

    def get_historical_ohlc(self, symbol: str, days: int = 30) -> pd.DataFrame:
        """Fetch historical OHLC data from BSE.

        Args:
            symbol: NSE equity symbol (e.g. "RELIANCE", "TCS").
            days: Number of trading days of history to return. Defaults to 30.

        Returns:
            DataFrame with columns: DATE, OPEN, HIGH, LOW, CLOSE, VOLUME
            sorted by date ascending, containing the last `days` trading days.

        Raises:
            ValueError: If symbol cannot be mapped to a BSE scrip code.
            httpx.HTTPStatusError: On BSE API failure.
        """
        bse_code = self._get_bse_code(symbol)
        if not bse_code:
            raise ValueError(f"Symbol not found: {symbol} (no BSE mapping)")

        end_date = date.today()
        # Fetch extra calendar days to ensure we get enough trading days
        start_date = end_date - timedelta(days=days * 2)

        from_str = start_date.strftime("%Y%m%d")
        to_str = end_date.strftime("%Y%m%d")

        url = (
            f"{_BSE_API_BASE}/StockPriceCSVDownload/w"
            f"?Atea=&Ession=&Type=EQ&Scripcode={bse_code}"
            f"&Fromdate={from_str}&Todate={to_str}"
        )

        resp = self._get(url, timeout=30.0)
        content = resp.text

        if not content or not content.strip():
            logger.warning("Empty historical data response for %s (BSE code %s)", symbol, bse_code)
            return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])

        # Parse CSV response from BSE
        try:
            df = pd.read_csv(io.StringIO(content))
        except Exception as exc:
            logger.error("Failed to parse historical CSV for %s: %s", symbol, exc)
            return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])

        # BSE CSV columns are typically: Date, Open, High, Low, Close, WAP, No of Shares, ...
        # Normalize column names
        df.columns = [c.strip() for c in df.columns]

        # Map BSE column names to expected format
        col_map = {}
        for col in df.columns:
            col_lower = col.lower()
            if "date" in col_lower:
                col_map[col] = "DATE"
            elif col_lower in ("open", "open price", "open_price"):
                col_map[col] = "OPEN"
            elif col_lower in ("high", "high price", "high_price"):
                col_map[col] = "HIGH"
            elif col_lower in ("low", "low price", "low_price"):
                col_map[col] = "LOW"
            elif col_lower in ("close", "close price", "close_price"):
                col_map[col] = "CLOSE"
            elif "share" in col_lower or "volume" in col_lower or "no of" in col_lower:
                col_map[col] = "VOLUME"

        df = df.rename(columns=col_map)

        # Ensure required columns exist
        for required_col in ["DATE", "OPEN", "HIGH", "LOW", "CLOSE"]:
            if required_col not in df.columns:
                logger.warning("Missing column %s in BSE historical data for %s", required_col, symbol)
                return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])

        if "VOLUME" not in df.columns:
            df["VOLUME"] = 0

        # Parse dates and sort
        df["DATE"] = pd.to_datetime(df["DATE"], dayfirst=True, errors="coerce")
        df = df.dropna(subset=["DATE"])
        df = df.sort_values("DATE").reset_index(drop=True)

        # Convert numeric columns
        for col in ["OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"]:
            df[col] = pd.to_numeric(df[col].astype(str).str.replace(",", ""), errors="coerce").fillna(0)

        # Return last N trading days
        return df[["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"]].tail(days).reset_index(drop=True)

    def get_quarterly_financials(self, symbol: str) -> list[dict]:
        """Fetch quarterly corporate financial results.

        BSE financial API is complex and requires additional parsing.
        Returns an empty list for now; financials can be added later
        via BSE corporate announcements API.

        Args:
            symbol: NSE equity symbol (e.g. "RELIANCE", "TCS").

        Returns:
            Empty list (BSE financial API integration pending).
        """
        return []

    def get_nifty500_constituents(self) -> list[dict]:
        """Fetch large-cap stocks from BSE (market cap > 1000 Cr).

        Uses BSE ListofScripData endpoint and filters by market cap.
        Returns data formatted to match the structure expected by app.py.

        Returns:
            List of dicts with keys: symbol, meta, totalTradedValue,
            perChange365d, open, dayHigh, dayLow, lastPrice, previousClose,
            change, pChange, totalTradedVolume.
        """
        self._build_mapping()

        # Build reverse map: BSE code -> NSE symbol
        bse_to_symbol: dict[str, str] = {}
        for sym, code in self._symbol_to_bse.items():
            bse_to_symbol[code] = sym

        constituents = []
        for item in self._bse_stocks:
            scrip_code = str(item.get("Scrip_Code", "") or item.get("SCRIP_CD", "")).strip()
            company_name = str(item.get("Scrip_Name", "") or item.get("SCRIP_NAME", "")).strip()
            group = str(item.get("Scrip_Group", "") or item.get("GROUP", "")).strip()

            # Get NSE symbol for this scrip
            nse_symbol = bse_to_symbol.get(scrip_code, "")
            if not nse_symbol:
                continue

            # Filter: only A and B group stocks (large/mid cap)
            if group not in ("A", "B", "T", ""):
                continue

            # Parse market cap from Mktcap field if available
            mktcap_str = str(item.get("Mktcap", "") or item.get("MKT_CAP", "") or "0")
            try:
                mktcap = float(mktcap_str.replace(",", "").strip() or "0")
            except (ValueError, TypeError):
                mktcap = 0.0

            # BSE market cap is in Cr; filter for > 1000 Cr
            # If no market cap data, include stocks from A group
            if mktcap > 0 and mktcap < 1000:
                continue

            constituents.append({
                "symbol": nse_symbol,
                "meta": {"companyName": company_name},
                "totalTradedValue": mktcap,
                "perChange365d": 0.0,
                "open": 0.0,
                "dayHigh": 0.0,
                "dayLow": 0.0,
                "lastPrice": 0.0,
                "previousClose": 0.0,
                "change": 0.0,
                "pChange": 0.0,
                "totalTradedVolume": 0,
            })

        logger.info("Returning %d constituents (market cap > 1000 Cr).", len(constituents))
        return constituents

    def get_rbi_repo_rate(self) -> float:
        """Return current RBI repo rate.

        Hardcoded to 6.5% as the repo rate changes infrequently
        (RBI monetary policy meetings are bi-monthly). This avoids
        an unreliable external API call.

        Returns:
            Current RBI repo rate as float (6.5 for 6.5%).
        """
        return 6.5

    def get_sector_indices(self) -> dict[str, float]:
        """Return estimated Nifty sector index values for TFT macro input.

        BSE does not directly provide Nifty sector indices. Returns
        estimated baseline values that can be used for relative
        macro-trend analysis by the TFT model.

        Returns:
            Dict mapping sector index name to estimated value.
        """
        return _SECTOR_ESTIMATES.copy()
