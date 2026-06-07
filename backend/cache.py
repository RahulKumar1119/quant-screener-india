"""DynamoDB + DAX caching layer for NSE data.

Provides persistent, distributed caching via DynamoDB with DAX accelerator
for sub-millisecond reads. Falls back to in-memory TTLCache when DynamoDB
is unavailable (local development without AWS).

Cache Table Schema:
  - PK: cache_key (S) — e.g., "quote_RELIANCE", "historical_TCS"
  - data: (S) — JSON-serialized cached value
  - ttl: (N) — Unix epoch timestamp for DynamoDB TTL auto-deletion
  - tier: (S) — Cache tier identifier (live_quotes, historical, etc.)
"""

from __future__ import annotations

import json
import logging
import os
import time
import threading
from typing import Any, Callable, Optional, TypeVar

import boto3
from botocore.exceptions import ClientError, EndpointConnectionError

T = TypeVar("T")

logger = logging.getLogger(__name__)

# TTL durations per tier (seconds)
TTL_CONFIG = {
    "live_quotes": 300,       # 5 minutes
    "historical": 86400,      # 24 hours
    "financials": 86400,      # 24 hours
    "ml_predictions": 3600,   # 1 hour
    "nifty500": 86400,        # 24 hours
}

# DynamoDB table name (configurable via environment)
CACHE_TABLE_NAME = os.environ.get("CACHE_TABLE_NAME", "quant-screener-cache")

# DAX endpoint (optional — if set, uses DAX for reads)
DAX_ENDPOINT = os.environ.get("DAX_ENDPOINT", "")


class CacheManager:
    """DynamoDB + DAX cache manager with 5 data tiers and local fallback.

    In production (AWS Lambda), uses DynamoDB for persistent caching with
    DAX for sub-millisecond read acceleration. TTL-based expiry is handled
    natively by DynamoDB's TTL feature.

    In local development (no AWS credentials or table), falls back to
    in-memory cachetools TTLCache — same interface, no infrastructure needed.
    """

    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._dynamodb_available = False
        self._table = None
        self._dax_client = None
        self._local_cache: dict[str, dict] = {}

        self._init_dynamodb()

    def _init_dynamodb(self) -> None:
        """Initialize DynamoDB (and optionally DAX) client."""
        try:
            region = os.environ.get("AWS_DEFAULT_REGION", "ap-south-1")

            # Try DAX first for reads (if endpoint configured)
            if DAX_ENDPOINT:
                try:
                    import amazondax
                    self._dax_client = amazondax.AmazonDaxClient(
                        region_name=region,
                        endpoints=[DAX_ENDPOINT],
                    )
                    logger.info("DAX client initialized at %s", DAX_ENDPOINT)
                except ImportError:
                    logger.warning(
                        "amazondax package not installed. Using DynamoDB directly."
                    )
                except Exception as e:
                    logger.warning("DAX connection failed: %s. Using DynamoDB directly.", e)

            # Standard DynamoDB client for writes (and reads if DAX unavailable)
            dynamodb = boto3.resource("dynamodb", region_name=region)
            self._table = dynamodb.Table(CACHE_TABLE_NAME)

            # Verify table exists
            self._table.table_status
            self._dynamodb_available = True
            logger.info("DynamoDB cache table '%s' connected.", CACHE_TABLE_NAME)

        except (ClientError, EndpointConnectionError, Exception) as e:
            logger.warning(
                "DynamoDB unavailable (%s). Using in-memory fallback cache.",
                str(e),
            )
            self._dynamodb_available = False

    # ------------------------------------------------------------------
    # Public interface
    # ------------------------------------------------------------------

    def get_or_fetch(self, tier: str, key: str, fetcher: Callable[[], T]) -> T:
        """Cache lookup with fallback to fetcher function.

        Checks DynamoDB/DAX first. On miss, calls fetcher(), stores result,
        and returns it. TTL is determined by the tier.

        Args:
            tier: Cache tier name (live_quotes, historical, financials,
                  ml_predictions, nifty500). Determines TTL.
            key: Cache key (e.g., "quote_RELIANCE").
            fetcher: Callable that produces the value on cache miss.

        Returns:
            The cached or freshly-fetched value.
        """
        # Try reading from cache
        cached = self._get(key)
        if cached is not None:
            return cached

        # Cache miss — fetch fresh data
        value = fetcher()

        # Store in cache
        ttl_seconds = TTL_CONFIG.get(tier, 300)
        self._put(key, value, ttl_seconds, tier)

        return value

    # ------------------------------------------------------------------
    # DynamoDB / DAX operations with local fallback
    # ------------------------------------------------------------------

    def _get(self, key: str) -> Optional[Any]:
        """Read from cache. Returns None on miss or expiry."""
        if self._dynamodb_available:
            return self._get_dynamodb(key)
        return self._get_local(key)

    def _put(self, key: str, value: Any, ttl_seconds: int, tier: str) -> None:
        """Write to cache with TTL."""
        if self._dynamodb_available:
            self._put_dynamodb(key, value, ttl_seconds, tier)
        else:
            self._put_local(key, value, ttl_seconds)

    def _get_dynamodb(self, key: str) -> Optional[Any]:
        """Read from DynamoDB (via DAX if available)."""
        try:
            # Use DAX for reads if available
            if self._dax_client:
                response = self._dax_client.get_item(
                    TableName=CACHE_TABLE_NAME,
                    Key={"cache_key": {"S": key}},
                )
                item = response.get("Item")
                if item and "data" in item:
                    ttl_val = int(item["ttl"]["N"])
                    if ttl_val > int(time.time()):
                        return json.loads(item["data"]["S"])
                return None

            # Standard DynamoDB read
            response = self._table.get_item(Key={"cache_key": key})
            item = response.get("Item")
            if item:
                # Check if TTL has passed (DynamoDB TTL deletion is eventual)
                if item.get("ttl", 0) > int(time.time()):
                    return json.loads(item["data"])
            return None

        except Exception as e:
            logger.warning("DynamoDB get failed for key '%s': %s", key, e)
            return None

    def _put_dynamodb(self, key: str, value: Any, ttl_seconds: int, tier: str) -> None:
        """Write to DynamoDB with TTL attribute."""
        try:
            expiry = int(time.time()) + ttl_seconds
            self._table.put_item(
                Item={
                    "cache_key": key,
                    "data": json.dumps(value, default=str),
                    "ttl": expiry,
                    "tier": tier,
                }
            )
        except Exception as e:
            logger.warning("DynamoDB put failed for key '%s': %s", key, e)

    def _get_local(self, key: str) -> Optional[Any]:
        """Read from in-memory fallback cache."""
        with self._lock:
            entry = self._local_cache.get(key)
            if entry and entry["ttl"] > time.time():
                return entry["data"]
            # Expired or missing
            if entry:
                del self._local_cache[key]
            return None

    def _put_local(self, key: str, value: Any, ttl_seconds: int) -> None:
        """Write to in-memory fallback cache."""
        with self._lock:
            self._local_cache[key] = {
                "data": value,
                "ttl": time.time() + ttl_seconds,
            }

    # ------------------------------------------------------------------
    # Utility
    # ------------------------------------------------------------------

    def invalidate(self, key: str) -> None:
        """Explicitly remove a cache entry."""
        if self._dynamodb_available:
            try:
                self._table.delete_item(Key={"cache_key": key})
            except Exception as e:
                logger.warning("DynamoDB delete failed for key '%s': %s", key, e)
        else:
            with self._lock:
                self._local_cache.pop(key, None)

    @property
    def is_dynamodb_active(self) -> bool:
        """Returns True if DynamoDB is connected and being used."""
        return self._dynamodb_available
