"""TTL-based cache configuration for NSE data.

Provides a 5-tier caching layer with automatic expiry to balance
data freshness with NSE rate-limit constraints.
"""

import threading
from typing import Callable, TypeVar

from cachetools import TTLCache

T = TypeVar("T")


class CacheManager:
    """Thread-safe TTL cache manager with 5 data tiers.

    Each tier has a specific maxsize and TTL tuned to the data's
    expected update frequency:
      - live_quotes: 5 min (changes frequently during market hours)
      - historical: 24 hr (changes only at market close)
      - financials: 24 hr (quarterly updates)
      - ml_predictions: 1 hr (recomputed periodically)
      - nifty500: 24 hr (index composition changes rarely)
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()

        # Live quotes: 5-minute TTL, up to 1000 entries
        self.live_quotes: TTLCache = TTLCache(maxsize=1000, ttl=300)

        # Historical OHLC: 24-hour TTL, up to 500 entries
        self.historical: TTLCache = TTLCache(maxsize=500, ttl=86400)

        # Financial results: 24-hour TTL, up to 500 entries
        self.financials: TTLCache = TTLCache(maxsize=500, ttl=86400)

        # ML predictions: 1-hour TTL, up to 1000 entries
        self.ml_predictions: TTLCache = TTLCache(maxsize=1000, ttl=3600)

        # Nifty 500 constituents: 24-hour TTL, single entry
        self.nifty500: TTLCache = TTLCache(maxsize=1, ttl=86400)

    def get_or_fetch(self, cache: TTLCache, key: str, fetcher: Callable[[], T]) -> T:
        """Thread-safe cache lookup with fallback to fetcher function.

        Uses a lock-free fetch pattern: checks the cache under lock,
        fetches outside the lock to avoid blocking other threads, then
        stores the result under lock.

        Args:
            cache: The TTLCache tier to check/store in.
            key: Cache key for the entry.
            fetcher: Callable that produces the value on cache miss.

        Returns:
            The cached or freshly-fetched value.
        """
        with self._lock:
            if key in cache:
                return cache[key]

        # Fetch outside the lock to avoid blocking concurrent readers
        value = fetcher()

        with self._lock:
            cache[key] = value

        return value
