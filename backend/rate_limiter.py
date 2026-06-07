"""Outbound request rate limiter for NSE India APIs."""

import asyncio
import time
from collections import deque


class RateLimiter:
    """Token bucket rate limiter for outbound NSE requests.

    Limits outbound requests to a configurable maximum per time window.
    Default: max 5 requests per 1-second window to avoid NSE IP blocking.

    Also supports exponential backoff when NSE returns 429 (Too Many Requests).
    Call `record_backoff()` on a 429 response to increase wait time.
    Call `reset_backoff()` on a successful response to clear backoff state.
    """

    def __init__(self, max_requests: int = 5, window_seconds: float = 1.0):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._timestamps: deque[float] = deque()
        self._lock = asyncio.Lock()
        self._backoff_until: float = 0.0
        self._consecutive_429s: int = 0
        self._max_backoff_seconds: float = 60.0

    async def acquire(self) -> None:
        """Wait until a request slot is available.

        Respects both the sliding window rate limit and any active
        exponential backoff from prior 429 responses.
        """
        async with self._lock:
            now = time.monotonic()

            # If we're in a backoff period, wait until it expires
            if self._backoff_until > now:
                wait_time = self._backoff_until - now
                await asyncio.sleep(wait_time)

            now = time.monotonic()

            # Remove timestamps outside the sliding window
            while self._timestamps and (now - self._timestamps[0]) > self.window_seconds:
                self._timestamps.popleft()

            if len(self._timestamps) >= self.max_requests:
                # Wait until the oldest request exits the window
                wait_time = self.window_seconds - (now - self._timestamps[0])
                if wait_time > 0:
                    await asyncio.sleep(wait_time)
                self._timestamps.popleft()

            self._timestamps.append(time.monotonic())

    def record_backoff(self) -> float:
        """Record a 429 response and calculate exponential backoff.

        Call this when NSE returns HTTP 429 (Too Many Requests).
        The next `acquire()` call will wait for the backoff period.

        Returns:
            The backoff duration in seconds that will be applied.
        """
        self._consecutive_429s += 1
        backoff_seconds = min(
            2 ** self._consecutive_429s,
            self._max_backoff_seconds,
        )
        self._backoff_until = time.monotonic() + backoff_seconds
        return backoff_seconds

    def reset_backoff(self) -> None:
        """Reset backoff state after a successful response.

        Call this when a request succeeds to clear the backoff counter.
        """
        self._consecutive_429s = 0
        self._backoff_until = 0.0

    @property
    def current_backoff_seconds(self) -> float:
        """Return the remaining backoff time in seconds, or 0 if not in backoff."""
        remaining = self._backoff_until - time.monotonic()
        return max(0.0, remaining)

    @property
    def is_in_backoff(self) -> bool:
        """Return True if the limiter is currently in a backoff period."""
        return time.monotonic() < self._backoff_until
