"""Persistent store for daily batch-computed stock ratings.

The nightly scorer (batch_score.handler, 6pm IST) overwrites one item per
ticker, so this table always holds the latest run. Served via
GET /api/ratings/strong-buys.

Table schema (PK: ticker):
  - rating (S): STRONG BUY / BUY / HOLD / SELL
  - confidence (N): 0-1
  - tft_score (N), tft_trend (S): macro resilience snapshot
  - company_name (S), as_of (S): IST date of the scoring run (YYYY-MM-DD)
  - updated_at (N): epoch seconds; ttl (N): auto-expiry safety net
"""

from __future__ import annotations

import logging
import math
import os
import time
from decimal import Decimal

import boto3

logger = logging.getLogger(__name__)

TABLE_NAME = os.environ.get("RATINGS_TABLE_NAME", "quant-screener-ratings")


def _num(value, default: float = 0.0) -> Decimal:
    """Sanitize any numeric input into a DynamoDB-safe Decimal."""
    try:
        f = float(value)
    except (TypeError, ValueError):
        return Decimal(str(default))
    if not math.isfinite(f):
        return Decimal(str(default))
    return Decimal(str(f))


class RatingStore:
    """Thin DynamoDB wrapper for the ratings table. No network on init."""

    def __init__(self, table_name: str = "") -> None:
        self.table_name = table_name or TABLE_NAME
        region = os.environ.get("AWS_DEFAULT_REGION", "ap-south-1")
        self._table = boto3.resource("dynamodb", region_name=region).Table(
            self.table_name
        )

    def save_ratings(self, items: list[dict]) -> int:
        """Overwrite one item per ticker. Returns count written."""
        if not items:
            return 0
        now = int(time.time())
        with self._table.batch_writer() as batch:
            for item in items:
                batch.put_item(
                    Item={
                        "ticker": item["ticker"],
                        "rating": item["rating"],
                        "confidence": _num(item.get("confidence")),
                        "tft_score": int(_num(item.get("tft_score"))),
                        "tft_trend": item.get("tft_trend") or "Neutral",
                        "company_name": item.get("company_name") or item["ticker"],
                        "as_of": item["as_of"],
                        "updated_at": now,
                        # 7-day safety net in case the nightly job ever stops
                        "ttl": now + 7 * 86400,
                    }
                )
        return len(items)

    def get_strong_buys(self) -> list[dict]:
        """Return all STRONG BUY items, best confidence first.

        Decimals are converted back to plain floats/ints so the
        result is JSON-serializable without a custom encoder.
        """
        response = self._table.scan(
            FilterExpression="#r = :sb",
            ExpressionAttributeNames={"#r": "rating"},
            ExpressionAttributeValues={":sb": "STRONG BUY"},
        )
        items = response.get("Items", [])
        # Small table (<500 rows) — paginate fully rather than truncate
        while "LastEvaluatedKey" in response:
            response = self._table.scan(
                FilterExpression="#r = :sb",
                ExpressionAttributeNames={"#r": "rating"},
                ExpressionAttributeValues={":sb": "STRONG BUY"},
                ExclusiveStartKey=response["LastEvaluatedKey"],
            )
            items += response.get("Items", [])

        clean = [
            {
                "ticker": i.get("ticker", ""),
                "company_name": i.get("company_name", i.get("ticker", "")),
                "rating": i.get("rating", "STRONG BUY"),
                "confidence": float(i.get("confidence", 0)),
                "tft_score": int(i.get("tft_score", 0)),
                "tft_trend": i.get("tft_trend", "Neutral"),
                "as_of": i.get("as_of", ""),
            }
            for i in items
        ]
        clean.sort(key=lambda i: i["confidence"], reverse=True)
        return clean
