"""Property-based test for cache TTL expiry guarantees freshness.

**Validates: Requirements 9.6**

Property 13: Cache TTL expiry guarantees freshness
- For any cache entry with a configured TTL, a lookup performed after the TTL
  has elapsed must not return the previously cached value — it must either
  trigger a fresh fetch or return a cache miss.
"""

import time

import pytest
from cachetools import TTLCache
from hypothesis import given, settings, HealthCheck
from hypothesis import strategies as st

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from cache import CacheManager


# Strategy: generate random cache keys and values
cache_keys = st.text(
    alphabet=st.characters(whitelist_categories=("L", "N"), min_codepoint=65, max_codepoint=122),
    min_size=1,
    max_size=20,
)
cache_values = st.one_of(
    st.integers(min_value=-1000, max_value=1000),
    st.floats(min_value=-1000, max_value=1000, allow_nan=False, allow_infinity=False),
    st.text(min_size=1, max_size=50),
)


class TestCacheTTLExpiryProperty:
    """Property 13: Cache TTL expiry guarantees freshness.

    **Validates: Requirements 9.6**
    """

    @given(key=cache_keys, initial_value=cache_values, fresh_value=cache_values)
    @settings(
        max_examples=120,
        suppress_health_check=[HealthCheck.too_slow],
        deadline=None,
    )
    def test_cache_ttl_expiry_guarantees_freshness(
        self, key: str, initial_value, fresh_value
    ):
        """After TTL expires, get_or_fetch must call the fetcher again,
        returning the fresh value instead of the stale cached one."""
        # Use a very short TTL (0.05 seconds) to make tests fast
        ttl = 0.05
        short_ttl_cache: TTLCache = TTLCache(maxsize=10, ttl=ttl)

        cache_manager = CacheManager()

        # Track how many times the fetcher is called
        fetch_count = 0

        def initial_fetcher():
            nonlocal fetch_count
            fetch_count += 1
            return initial_value

        # 1. Store a value via get_or_fetch
        result1 = cache_manager.get_or_fetch(short_ttl_cache, key, initial_fetcher)
        assert result1 == initial_value
        assert fetch_count == 1

        # 2. Verify the value is cached (fetcher not called on second access)
        result2 = cache_manager.get_or_fetch(short_ttl_cache, key, initial_fetcher)
        assert result2 == initial_value
        assert fetch_count == 1  # fetcher was NOT called again

        # 3. Wait for TTL to expire
        time.sleep(ttl + 0.02)

        # 4. After expiry, get_or_fetch must call the fetcher again
        def fresh_fetcher():
            nonlocal fetch_count
            fetch_count += 1
            return fresh_value

        result3 = cache_manager.get_or_fetch(short_ttl_cache, key, fresh_fetcher)

        # The fetcher must have been called again (proving cache miss / freshness)
        assert fetch_count == 2
        # The returned value must be the fresh one, not the stale cached one
        assert result3 == fresh_value

    @given(key=cache_keys, value=cache_values)
    @settings(
        max_examples=120,
        suppress_health_check=[HealthCheck.too_slow],
        deadline=None,
    )
    def test_cache_entry_not_present_after_ttl(self, key: str, value):
        """After TTL elapses, the key must not be present in the cache
        (proving expiry occurred)."""
        ttl = 0.05
        short_ttl_cache: TTLCache = TTLCache(maxsize=10, ttl=ttl)

        cache_manager = CacheManager()

        # Store via get_or_fetch
        cache_manager.get_or_fetch(short_ttl_cache, key, lambda: value)

        # Key is present before TTL expires
        assert key in short_ttl_cache

        # Wait past TTL
        time.sleep(ttl + 0.02)

        # Key must no longer be present (TTL expired)
        assert key not in short_ttl_cache
