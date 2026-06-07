"""NSE India data fetching layer using jugaad-data."""

from __future__ import annotations

from datetime import date, timedelta
import logging
from typing import Optional
from urllib.parse import quote

import httpx
import pandas as pd
from jugaad_data.nse import NSELive, stock_df
from jugaad_data.rbi import RBI

logger = logging.getLogger(__name__)

_NSE_BASE_URL = "https://www.nseindia.com"
_NSE_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
_SECTOR_INDICES = [
    "NIFTY BANK",
    "NIFTY IT",
    "NIFTY PHARMA",
    "NIFTY AUTO",
    "NIFTY FMCG",
]


class NSEClient:
    """Manages NSE India data fetching with session management.

    Uses jugaad-data's NSELive for real-time quotes and stock_df for
    historical OHLC data. Custom httpx.Client handles API endpoints
    that require valid NSE session cookies.
    """

    def __init__(self) -> None:
        self._nse_live = NSELive()
        self._session: Optional[httpx.Client] = None

    # ------------------------------------------------------------------
    # Session management
    # ------------------------------------------------------------------

    def _ensure_session(self) -> httpx.Client:
        """Maintain valid NSE session with required cookies/headers.

        NSE India requires session cookies obtained from an initial page
        load at https://www.nseindia.com. This method lazily creates the
        httpx.Client and hits the homepage to acquire those cookies.
        """
        if self._session is None:
            self._session = httpx.Client(
                headers={
                    "User-Agent": _NSE_USER_AGENT,
                    "Accept": "application/json",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Accept-Encoding": "gzip, deflate, br",
                },
                follow_redirects=True,
                timeout=httpx.Timeout(30.0),
            )
            # Hit NSE homepage to obtain session cookies
            self._session.get(_NSE_BASE_URL)
        return self._session

    def _refresh_session(self) -> httpx.Client:
        """Force-refresh the NSE session by closing and re-creating it.

        Called when an API request returns 401 or 403, indicating that
        the session cookies have expired.
        """
        if self._session is not None:
            try:
                self._session.close()
            except Exception:
                pass
        self._session = None
        return self._ensure_session()

    def _get_with_retry(self, url: str) -> httpx.Response:
        """Make a GET request with automatic session refresh on 401/403.

        If the initial request fails with a 401 or 403 status code,
        the session is refreshed and the request is retried once.
        """
        session = self._ensure_session()
        resp = session.get(url)

        if resp.status_code in (401, 403):
            logger.warning(
                "NSE session expired (status %d), refreshing session.",
                resp.status_code,
            )
            session = self._refresh_session()
            resp = session.get(url)

        resp.raise_for_status()
        return resp

    # ------------------------------------------------------------------
    # Public data methods
    # ------------------------------------------------------------------

    def get_live_quote(self, symbol: str) -> dict:
        """Fetch real-time stock quote from NSE.

        Uses jugaad-data NSELive to fetch the full stock quote which
        includes priceInfo (lastPrice, open, close, vwap, weekHighLow)
        and metadata (companyName, industry, isin).

        Args:
            symbol: NSE equity symbol (e.g. "RELIANCE", "TCS").

        Returns:
            Dict containing the full NSE stock quote response with keys
            like 'priceInfo', 'metadata', 'industryInfo', etc.
        """
        return self._nse_live.stock_quote(symbol)

    def get_historical_ohlc(self, symbol: str, days: int = 30) -> pd.DataFrame:
        """Fetch historical OHLC data for N trading days.

        Fetches extra calendar days (2x the requested trading days) to
        account for weekends and holidays, then returns only the last N
        rows which correspond to the most recent N trading days.

        Args:
            symbol: NSE equity symbol (e.g. "RELIANCE", "TCS").
            days: Number of trading days of history to return. Defaults to 30.

        Returns:
            DataFrame with columns: DATE, OPEN, HIGH, LOW, CLOSE, VOLUME
            sorted by date ascending, containing the last `days` trading days.
        """
        end_date = date.today()
        # Fetch extra calendar days to ensure we get N trading days
        start_date = end_date - timedelta(days=days * 2)
        df = stock_df(symbol=symbol, from_date=start_date, to_date=end_date, series="EQ")
        # Take last N trading days
        return df.tail(days).reset_index(drop=True)

    def get_quarterly_financials(self, symbol: str) -> list[dict]:
        """Fetch quarterly corporate financial results from NSE.

        Hits the NSE corporate info API to retrieve quarterly financial
        results including revenue, profit, EPS, etc.

        Args:
            symbol: NSE equity symbol (e.g. "RELIANCE", "TCS").

        Returns:
            List of dicts, each representing one quarter's financial results.
            Returns an empty list if no financial results are found.
        """
        url = (
            f"{_NSE_BASE_URL}/api/corporateInfo"
            f"?symbol={quote(symbol)}&market=equities"
        )
        resp = self._get_with_retry(url)
        data = resp.json()
        return data.get("financialResults", [])

    def get_nifty500_constituents(self) -> list[dict]:
        """Fetch all Nifty 500 index constituents from NSE.

        Retrieves the full list of stocks in the Nifty 500 index along
        with their current price, change, and other summary data.

        Returns:
            List of dicts, each representing one index constituent with
            keys like 'symbol', 'open', 'dayHigh', 'dayLow', 'lastPrice',
            'previousClose', 'change', 'pChange', 'totalTradedVolume', etc.
        """
        url = (
            f"{_NSE_BASE_URL}/api/equity-stockIndices"
            f"?index={quote('NIFTY 500')}"
        )
        resp = self._get_with_retry(url)
        data = resp.json()
        return data.get("data", [])

    def get_rbi_repo_rate(self) -> float:
        """Fetch current RBI REPO rate via jugaad-data RBI module.

        Returns:
            The most recent RBI repo rate as a float (e.g. 6.5 for 6.5%).
        """
        rbi = RBI()
        repo_data = rbi.get_data("repo_rate")
        return float(repo_data.iloc[-1]["Rate"])

    def get_sector_indices(self) -> dict[str, float]:
        """Fetch Nifty sector index values for TFT macro input.

        Fetches the last traded value for each of the major Nifty sector
        indices: BANK, IT, PHARMA, AUTO, FMCG.

        Returns:
            Dict mapping sector index name to its last traded value.
            Sectors that fail to fetch are omitted from the result.
        """
        session = self._ensure_session()
        results: dict[str, float] = {}

        for sector in _SECTOR_INDICES:
            url = (
                f"{_NSE_BASE_URL}/api/equity-stockIndices"
                f"?index={quote(sector)}"
            )
            try:
                resp = session.get(url)

                if resp.status_code in (401, 403):
                    logger.warning(
                        "Session expired while fetching sector %s, refreshing.",
                        sector,
                    )
                    session = self._refresh_session()
                    resp = session.get(url)

                if resp.status_code == 200:
                    data = resp.json().get("metadata", {})
                    results[sector] = float(data.get("last", 0.0))
                else:
                    logger.warning(
                        "Failed to fetch sector index %s: status %d",
                        sector,
                        resp.status_code,
                    )
            except Exception as exc:
                logger.error(
                    "Error fetching sector index %s: %s", sector, exc
                )

        return results
