"""Tests for the RateLimiter class."""

import asyncio
import time

import pytest

from backend.rate_limiter import RateLimiter


@pytest.mark.asyncio
async def test_acquire_allows_requests_within_limit():
    """Requests within the max_requests limit should proceed immediately."""
    limiter = RateLimiter(max_requests=5, window_seconds=1.0)

    start = time.monotonic()
    for _ in range(5):
        await limiter.acquire()
    elapsed = time.monotonic() - start

    # All 5 requests should complete nearly instantly (well under 1 second)
    assert elapsed < 0.1


@pytest.mark.asyncio
async def test_acquire_throttles_beyond_limit():
    """The 6th request within a window should wait for a slot to free up."""
    limiter = RateLimiter(max_requests=3, window_seconds=0.2)

    start = time.monotonic()
    for _ in range(4):
        await limiter.acquire()
    elapsed = time.monotonic() - start

    # The 4th request should have waited ~0.2s for the window to pass
    assert elapsed >= 0.15


@pytest.mark.asyncio
async def test_acquire_respects_window_expiry():
    """After the window elapses, new requests should go through immediately."""
    limiter = RateLimiter(max_requests=2, window_seconds=0.1)

    # Fill up the window
    await limiter.acquire()
    await limiter.acquire()

    # Wait for the window to expire
    await asyncio.sleep(0.15)

    # Should now go through immediately
    start = time.monotonic()
    await limiter.acquire()
    elapsed = time.monotonic() - start

    assert elapsed < 0.05


@pytest.mark.asyncio
async def test_record_backoff_exponential():
    """record_backoff should increase wait times exponentially."""
    limiter = RateLimiter(max_requests=5, window_seconds=1.0)

    # First 429: backoff = 2^1 = 2s
    backoff1 = limiter.record_backoff()
    assert backoff1 == 2.0

    # Second 429: backoff = 2^2 = 4s
    backoff2 = limiter.record_backoff()
    assert backoff2 == 4.0

    # Third 429: backoff = 2^3 = 8s
    backoff3 = limiter.record_backoff()
    assert backoff3 == 8.0


@pytest.mark.asyncio
async def test_record_backoff_capped_at_60s():
    """Backoff should never exceed 60 seconds."""
    limiter = RateLimiter(max_requests=5, window_seconds=1.0)

    # Simulate many consecutive 429s
    for _ in range(10):
        backoff = limiter.record_backoff()

    assert backoff <= 60.0


@pytest.mark.asyncio
async def test_reset_backoff_clears_state():
    """reset_backoff should clear backoff counter and timer."""
    limiter = RateLimiter(max_requests=5, window_seconds=1.0)

    limiter.record_backoff()
    limiter.record_backoff()
    assert limiter.is_in_backoff is True

    limiter.reset_backoff()
    assert limiter.is_in_backoff is False
    assert limiter._consecutive_429s == 0

    # Next backoff should start from 2^1 again
    backoff = limiter.record_backoff()
    assert backoff == 2.0


@pytest.mark.asyncio
async def test_acquire_waits_during_backoff():
    """acquire() should wait for the backoff period to expire."""
    limiter = RateLimiter(max_requests=5, window_seconds=1.0)

    # Manually set a short backoff for testing
    limiter._backoff_until = time.monotonic() + 0.2
    limiter._consecutive_429s = 1

    start = time.monotonic()
    await limiter.acquire()
    elapsed = time.monotonic() - start

    # Should have waited ~0.2s for backoff
    assert elapsed >= 0.15


@pytest.mark.asyncio
async def test_current_backoff_seconds():
    """current_backoff_seconds returns remaining backoff time."""
    limiter = RateLimiter(max_requests=5, window_seconds=1.0)

    # No backoff active
    assert limiter.current_backoff_seconds == 0.0

    # Set a backoff
    limiter._backoff_until = time.monotonic() + 1.0
    remaining = limiter.current_backoff_seconds
    assert 0.9 <= remaining <= 1.0


@pytest.mark.asyncio
async def test_concurrent_acquire_respects_limit():
    """Multiple concurrent acquire calls should respect the rate limit."""
    limiter = RateLimiter(max_requests=3, window_seconds=0.3)

    async def make_request():
        await limiter.acquire()

    start = time.monotonic()
    # Launch 6 concurrent requests with limit of 3 per 0.3s window
    await asyncio.gather(*[make_request() for _ in range(6)])
    elapsed = time.monotonic() - start

    # Should take at least one window (0.3s) since 6 > 3
    assert elapsed >= 0.25
