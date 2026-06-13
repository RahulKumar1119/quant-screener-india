"""Shared data fetching utilities for ML model training.

Fetches historical stock data from BSE India APIs (api.bseindia.com)
which work reliably from cloud IPs. Uses NSE equity master CSV for
symbol-to-BSE-scrip-code mapping via ISIN cross-reference.
"""

from __future__ import annotations

import csv
import io
import time
from datetime import date, timedelta
from typing import Optional

import httpx
import pandas as pd

_BSE_API_BASE = "https://api.bseindia.com/BseIndiaAPI/api"
_NSE_EQUITY_CSV = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"

_BSE_HEADERS = {
    "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120.0.0.0",
    "Accept": "application/json",
    "Referer": "https://www.bseindia.com/",
}


class TrainingDataFetcher:
    """Fetches and caches training data from BSE India APIs.

    Provides methods for:
    - Fetching the list of active BSE stocks with market cap filtering
    - Downloading historical OHLC data for individual scrip codes
    - Mapping NSE symbols to BSE scrip codes via ISIN cross-reference
    """

    def __init__(self) -> None:
        self._client: Optional[httpx.Client] = None
        self._symbol_to_isin: dict[str, str] = {}
        self._isin_to_bse: dict[str, str] = {}
        self._symbol_to_bse: dict[str, str] = {}
        self._bse_stocks: list[dict] = []

    def _ensure_client(self) -> httpx.Client:
        """Create or return the shared httpx.Client."""
        if self._client is None:
            self._client = httpx.Client(
                headers=_BSE_HEADERS,
                follow_redirects=True,
                timeout=httpx.Timeout(60.0),
            )
        return self._client

    def _get(self, url: str, timeout: float = 60.0) -> httpx.Response:
        """Make a GET request with error handling."""
        client = self._ensure_client()
        resp = client.get(url, timeout=timeout)
        resp.raise_for_status()
        return resp

    def close(self) -> None:
        """Close the HTTP client."""
        if self._client is not None:
            self._client.close()
            self._client = None

    # ------------------------------------------------------------------
    # Symbol mapping
    # ------------------------------------------------------------------

    def _load_nse_master(self) -> None:
        """Fetch NSE equity master CSV for symbol-to-ISIN mapping."""
        if self._symbol_to_isin:
            return

        print("[data_fetcher] Loading NSE equity master CSV...")
        try:
            client = self._ensure_client()
            resp = client.get(
                _NSE_EQUITY_CSV,
                timeout=30.0,
                headers={
                    "User-Agent": _BSE_HEADERS["User-Agent"],
                    "Accept": "text/csv,application/csv,*/*",
                },
            )
            resp.raise_for_status()
            reader = csv.DictReader(io.StringIO(resp.text))
            for row in reader:
                symbol = (row.get("SYMBOL") or "").strip()
                isin = (row.get(" ISIN NUMBER") or row.get("ISIN NUMBER") or "").strip()
                if symbol and isin:
                    self._symbol_to_isin[symbol] = isin
            print(f"[data_fetcher] Loaded {len(self._symbol_to_isin)} NSE symbols.")
        except Exception as exc:
            print(f"[data_fetcher] ERROR: Failed to load NSE equity master: {exc}")

    def _load_bse_stocks(self) -> None:
        """Fetch full BSE equity list with scrip codes and ISIN."""
        if self._bse_stocks:
            return

        print("[data_fetcher] Loading BSE stock list...")
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
                    scrip_code = str(
                        item.get("Scrip_Code", "") or item.get("SCRIP_CD", "")
                    ).strip()
                    isin = str(
                        item.get("ISIN_NUMBER", "") or item.get("Isin_Number", "")
                    ).strip()
                    if scrip_code and isin:
                        self._isin_to_bse[isin] = scrip_code
            print(f"[data_fetcher] Loaded {len(self._bse_stocks)} BSE stocks.")
        except Exception as exc:
            print(f"[data_fetcher] ERROR: Failed to load BSE stock list: {exc}")
            raise SystemExit(
                "Cannot proceed without BSE stock list. Check network connectivity."
            )

    def fetch_nse_to_bse_mapping(self) -> dict[str, str]:
        """Build and return NSE symbol -> BSE scrip code mapping via ISIN.

        Returns:
            Dict mapping NSE symbol (e.g. 'RELIANCE') to BSE scrip code (e.g. '500325').
        """
        if self._symbol_to_bse:
            return self._symbol_to_bse

        self._load_bse_stocks()
        self._load_nse_master()

        for symbol, isin in self._symbol_to_isin.items():
            bse_code = self._isin_to_bse.get(isin)
            if bse_code:
                self._symbol_to_bse[symbol] = bse_code

        print(
            f"[data_fetcher] Mapped {len(self._symbol_to_bse)} NSE symbols to BSE codes."
        )
        return self._symbol_to_bse

    def fetch_stock_list(self, min_market_cap_cr: float = 1000.0) -> list[dict]:
        """Fetch list of stocks with market cap > threshold.

        Returns list of dicts with keys: symbol (NSE), bse_code, company_name, market_cap.

        Args:
            min_market_cap_cr: Minimum market cap in Crores. Default 1000 Cr.

        Returns:
            List of stock dicts sorted by market cap descending.
        """
        self._load_bse_stocks()
        mapping = self.fetch_nse_to_bse_mapping()

        # Build reverse: BSE code -> NSE symbol
        bse_to_symbol: dict[str, str] = {}
        for sym, code in mapping.items():
            bse_to_symbol[code] = sym

        stocks = []
        for item in self._bse_stocks:
            scrip_code = str(
                item.get("Scrip_Code", "") or item.get("SCRIP_CD", "")
            ).strip()
            company = str(
                item.get("Scrip_Name", "") or item.get("SCRIP_NAME", "")
            ).strip()
            group = str(
                item.get("Scrip_Group", "") or item.get("GROUP", "")
            ).strip()

            nse_symbol = bse_to_symbol.get(scrip_code, "")
            if not nse_symbol:
                continue

            # Only A and B group (large/mid cap)
            if group not in ("A", "B", "T", ""):
                continue

            mktcap_str = str(item.get("Mktcap", "") or item.get("MKT_CAP", "") or "0")
            try:
                mktcap = float(mktcap_str.replace(",", "").strip() or "0")
            except (ValueError, TypeError):
                mktcap = 0.0

            if mktcap > 0 and mktcap < min_market_cap_cr:
                continue

            stocks.append({
                "symbol": nse_symbol,
                "bse_code": scrip_code,
                "company_name": company,
                "market_cap": mktcap,
            })

        # Sort by market cap descending
        stocks.sort(key=lambda x: x["market_cap"], reverse=True)
        print(f"[data_fetcher] Found {len(stocks)} stocks with market cap > {min_market_cap_cr} Cr.")
        return stocks

    # ------------------------------------------------------------------
    # Historical OHLC
    # ------------------------------------------------------------------

    def fetch_historical_ohlc(self, bse_code: str, days: int = 365) -> pd.DataFrame:
        """Fetch historical OHLC data from BSE StockPriceCSVDownload API.

        Args:
            bse_code: BSE scrip code (e.g. '500325' for Reliance).
            days: Number of calendar days of history. Default 365.

        Returns:
            DataFrame with columns: DATE, OPEN, HIGH, LOW, CLOSE, VOLUME
            sorted by date ascending.
        """
        end_date = date.today()
        start_date = end_date - timedelta(days=days)

        from_str = start_date.strftime("%Y%m%d")
        to_str = end_date.strftime("%Y%m%d")

        url = (
            f"{_BSE_API_BASE}/StockPriceCSVDownload/w"
            f"?Atea=&Ession=&Type=EQ&Scripcode={bse_code}"
            f"&Fromdate={from_str}&Todate={to_str}"
        )

        try:
            resp = self._get(url, timeout=30.0)
            content = resp.text

            if not content or not content.strip():
                print(f"[data_fetcher] WARNING: Empty response for BSE code {bse_code}")
                return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])

            df = pd.read_csv(io.StringIO(content))
            df.columns = [c.strip() for c in df.columns]

            # Map BSE column names to standard format
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

            for required_col in ["DATE", "OPEN", "HIGH", "LOW", "CLOSE"]:
                if required_col not in df.columns:
                    print(
                        f"[data_fetcher] WARNING: Missing column {required_col} for BSE code {bse_code}"
                    )
                    return pd.DataFrame(
                        columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"]
                    )

            if "VOLUME" not in df.columns:
                df["VOLUME"] = 0

            # Parse dates and sort
            df["DATE"] = pd.to_datetime(df["DATE"], dayfirst=True, errors="coerce")
            df = df.dropna(subset=["DATE"])
            df = df.sort_values("DATE").reset_index(drop=True)

            # Convert numeric columns
            for col in ["OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"]:
                df[col] = (
                    pd.to_numeric(
                        df[col].astype(str).str.replace(",", ""), errors="coerce"
                    )
                    .fillna(0)
                )

            return df[["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"]].reset_index(drop=True)

        except httpx.HTTPStatusError as exc:
            print(f"[data_fetcher] HTTP error fetching OHLC for BSE {bse_code}: {exc}")
            return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])
        except Exception as exc:
            print(f"[data_fetcher] ERROR fetching OHLC for BSE {bse_code}: {exc}")
            return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])

    def fetch_historical_ohlc_by_symbol(
        self, symbol: str, days: int = 365
    ) -> pd.DataFrame:
        """Fetch historical OHLC using NSE symbol (resolves to BSE code).

        Args:
            symbol: NSE equity symbol (e.g. 'RELIANCE').
            days: Number of calendar days of history.

        Returns:
            DataFrame with OHLC data, or empty DataFrame if symbol not found.
        """
        mapping = self.fetch_nse_to_bse_mapping()
        bse_code = mapping.get(symbol.upper())
        if not bse_code:
            print(f"[data_fetcher] WARNING: No BSE mapping for symbol {symbol}")
            return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])

        return self.fetch_historical_ohlc(bse_code, days=days)

    def fetch_multiple_ohlc(
        self, symbols: list[str], days: int = 365, delay: float = 0.5
    ) -> dict[str, pd.DataFrame]:
        """Fetch OHLC for multiple symbols with rate limiting.

        Args:
            symbols: List of NSE symbols.
            days: Number of calendar days of history.
            delay: Seconds to wait between requests (rate limiting).

        Returns:
            Dict mapping symbol to DataFrame.
        """
        mapping = self.fetch_nse_to_bse_mapping()
        results: dict[str, pd.DataFrame] = {}

        for i, symbol in enumerate(symbols):
            bse_code = mapping.get(symbol.upper())
            if not bse_code:
                print(f"[data_fetcher] [{i+1}/{len(symbols)}] Skipping {symbol} (no BSE mapping)")
                continue

            print(f"[data_fetcher] [{i+1}/{len(symbols)}] Fetching {symbol} (BSE: {bse_code})...")
            df = self.fetch_historical_ohlc(bse_code, days=days)

            if not df.empty:
                results[symbol] = df
            else:
                print(f"[data_fetcher] WARNING: No data returned for {symbol}")

            # Rate limiting to be respectful to BSE API
            if i < len(symbols) - 1:
                time.sleep(delay)

        print(f"[data_fetcher] Successfully fetched OHLC for {len(results)}/{len(symbols)} symbols.")
        return results

    def fetch_sector_proxy_data(self, days: int = 365) -> dict[str, pd.DataFrame]:
        """Fetch sector proxy data using representative stocks.

        Since BSE doesn't directly provide Nifty sector indices, we use
        representative large-cap stocks as sector proxies:
        - Banking: HDFCBANK
        - IT: TCS
        - Pharma: SUNPHARMA
        - Auto: MARUTI
        - FMCG: HINDUNILVR

        Args:
            days: Number of calendar days of history.

        Returns:
            Dict mapping sector name to OHLC DataFrame.
        """
        sector_proxies = {
            "BANK": "HDFCBANK",
            "IT": "TCS",
            "PHARMA": "SUNPHARMA",
            "AUTO": "MARUTI",
            "FMCG": "HINDUNILVR",
        }

        print("[data_fetcher] Fetching sector proxy data...")
        results: dict[str, pd.DataFrame] = {}

        for sector, symbol in sector_proxies.items():
            df = self.fetch_historical_ohlc_by_symbol(symbol, days=days)
            if not df.empty:
                results[sector] = df
                print(f"[data_fetcher]   {sector} ({symbol}): {len(df)} rows")
            else:
                print(f"[data_fetcher]   WARNING: No data for {sector} ({symbol})")
            time.sleep(0.5)

        return results
