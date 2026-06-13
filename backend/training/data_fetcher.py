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
        """Fetch historical OHLC data using yfinance (Yahoo Finance).

        Yahoo Finance works reliably from cloud IPs unlike BSE/NSE direct APIs.
        Uses NSE symbol with .NS suffix for Indian stocks.

        Args:
            bse_code: BSE scrip code (used to resolve NSE symbol).
            days: Number of calendar days of history. Default 365.

        Returns:
            DataFrame with columns: DATE, OPEN, HIGH, LOW, CLOSE, VOLUME
            sorted by date ascending.
        """
        try:
            import yfinance as yf
        except ImportError:
            print("[data_fetcher] ERROR: yfinance not installed. Run: pip install yfinance")
            return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])

        # Resolve BSE code back to NSE symbol
        bse_to_symbol = {v: k for k, v in self._symbol_to_bse.items()}
        symbol = bse_to_symbol.get(bse_code, "")
        if not symbol:
            # Try looking it up from the loaded data
            self.fetch_nse_to_bse_mapping()
            bse_to_symbol = {v: k for k, v in self._symbol_to_bse.items()}
            symbol = bse_to_symbol.get(bse_code, "")

        if not symbol:
            print(f"[data_fetcher] WARNING: Cannot resolve BSE code {bse_code} to NSE symbol")
            return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])

        # Yahoo Finance uses .NS suffix for NSE stocks
        yf_symbol = f"{symbol}.NS"

        try:
            ticker = yf.Ticker(yf_symbol)
            df = ticker.history(period=f"{days}d")

            if df.empty:
                # Try download method as fallback
                df = yf.download(yf_symbol, period=f"{days}d", progress=False)

            if df.empty:
                return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])

            # Normalize to our expected format
            result = pd.DataFrame({
                "DATE": df.index,
                "OPEN": df["Open"].values,
                "HIGH": df["High"].values,
                "LOW": df["Low"].values,
                "CLOSE": df["Close"].values,
                "VOLUME": df["Volume"].values if "Volume" in df.columns else 0,
            })

            result["DATE"] = pd.to_datetime(result["DATE"])
            result = result.sort_values("DATE").reset_index(drop=True)
            return result

        except Exception as exc:
            print(f"[data_fetcher] ERROR fetching OHLC for {symbol} via yfinance: {exc}")
            return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])

    def fetch_historical_ohlc_by_symbol(
        self, symbol: str, days: int = 365
    ) -> pd.DataFrame:
        """Fetch historical OHLC using NSE symbol via yfinance.

        Args:
            symbol: NSE equity symbol (e.g. 'RELIANCE').
            days: Number of calendar days of history.

        Returns:
            DataFrame with OHLC data, or empty DataFrame if symbol not found.
        """
        try:
            import yfinance as yf
        except ImportError:
            print("[data_fetcher] ERROR: yfinance not installed. Run: pip install yfinance")
            return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])

        yf_symbol = f"{symbol.upper()}.NS"

        try:
            df = yf.download(yf_symbol, period=f"{days}d", progress=False, auto_adjust=True)

            if df.empty:
                return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])

            # Handle multi-level columns from yfinance (flatten if needed)
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
            result = result.sort_values("DATE").reset_index(drop=True)
            return result

        except Exception as exc:
            print(f"[data_fetcher] ERROR fetching OHLC for {symbol} via yfinance: {exc}")
            return pd.DataFrame(columns=["DATE", "OPEN", "HIGH", "LOW", "CLOSE", "VOLUME"])

    def fetch_multiple_ohlc(
        self, symbols: list[str], days: int = 365, delay: float = 0.5
    ) -> dict[str, pd.DataFrame]:
        """Fetch OHLC for multiple symbols using yfinance batch download.

        Args:
            symbols: List of NSE symbols.
            days: Number of calendar days of history.
            delay: Seconds between individual requests (used if batch fails).

        Returns:
            Dict mapping symbol to DataFrame.
        """
        try:
            import yfinance as yf
        except ImportError:
            print("[data_fetcher] ERROR: yfinance not installed. Run: pip install yfinance")
            return {}

        results: dict[str, pd.DataFrame] = {}

        # Process in batches of 50 to avoid overwhelming Yahoo
        batch_size = 50
        for batch_start in range(0, len(symbols), batch_size):
            batch = symbols[batch_start:batch_start + batch_size]
            yf_symbols = [f"{s.upper()}.NS" for s in batch]

            print(f"[data_fetcher] Fetching batch {batch_start//batch_size + 1}/{(len(symbols)-1)//batch_size + 1} ({len(batch)} stocks)...")

            try:
                data = yf.download(yf_symbols, period=f"{days}d", progress=False, group_by="ticker", threads=True)

                if data.empty:
                    print(f"[data_fetcher] WARNING: Empty batch response")
                    continue

                for symbol, yf_sym in zip(batch, yf_symbols):
                    try:
                        if len(batch) == 1:
                            ticker_data = data
                        else:
                            ticker_data = data[yf_sym] if yf_sym in data.columns.get_level_values(0) else pd.DataFrame()

                        if ticker_data.empty or len(ticker_data) < 30:
                            continue

                        result = pd.DataFrame({
                            "DATE": ticker_data.index,
                            "OPEN": ticker_data["Open"].values,
                            "HIGH": ticker_data["High"].values,
                            "LOW": ticker_data["Low"].values,
                            "CLOSE": ticker_data["Close"].values,
                            "VOLUME": ticker_data["Volume"].values if "Volume" in ticker_data.columns else 0,
                        })
                        result["DATE"] = pd.to_datetime(result["DATE"])
                        result = result.dropna(subset=["CLOSE"])
                        result = result.sort_values("DATE").reset_index(drop=True)

                        if len(result) >= 30:
                            results[symbol] = result

                    except Exception:
                        continue

            except Exception as exc:
                print(f"[data_fetcher] Batch download failed: {exc}")
                # Fallback: fetch one by one
                for symbol in batch:
                    df = self.fetch_historical_ohlc_by_symbol(symbol, days=days)
                    if not df.empty and len(df) >= 30:
                        results[symbol] = df
                    time.sleep(delay)

            time.sleep(1)  # Pause between batches

        print(f"[data_fetcher] Successfully fetched OHLC for {len(results)}/{len(symbols)} symbols.")
        return results

    def fetch_sector_proxy_data(self, days: int = 365) -> dict[str, pd.DataFrame]:
        """Fetch sector proxy data using representative stocks via yfinance.

        Uses representative large-cap stocks as sector proxies:
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

        print("[data_fetcher] Fetching sector proxy data via yfinance...")
        results: dict[str, pd.DataFrame] = {}

        for sector, symbol in sector_proxies.items():
            df = self.fetch_historical_ohlc_by_symbol(symbol, days=days)
            if not df.empty:
                results[sector] = df
                print(f"[data_fetcher]   {sector} ({symbol}): {len(df)} rows")
            else:
                print(f"[data_fetcher]   WARNING: No data for {sector} ({symbol})")

        return results
