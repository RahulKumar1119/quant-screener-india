"""Gemma 3 4B IT model wrapper using AWS Bedrock for narrative summary generation.

Generates SEBI-style fundamental analysis summaries from live financial data.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Dict, List

import boto3
from botocore.exceptions import ClientError, ReadTimeoutError, ConnectTimeoutError

logger = logging.getLogger(__name__)


class GemmaModel:
    """Generates SEBI-style narrative summary via AWS Bedrock (Gemma 3 4B IT).

    Connects to AWS Bedrock runtime to invoke the Gemma 3 4B IT model,
    producing a concise fundamental analysis suitable for retail investors.
    """

    def __init__(self, region: str = ""):
        """Initialize the Bedrock runtime client.

        Args:
            region: AWS region where Bedrock is available.
                Defaults to AWS_REGION/AWS_DEFAULT_REGION env, then ap-south-1.
        """
        region = (
            region
            or os.environ.get("AWS_REGION")
            or os.environ.get("AWS_DEFAULT_REGION", "ap-south-1")
        )
        self.client = boto3.client(
            "bedrock-runtime",
            region_name=region,
            config=boto3.session.Config(
                read_timeout=30,
                connect_timeout=10,
                retries={"max_attempts": 1},
            ),
        )
        self.model_id = "google.gemma-3-27b-it"

    def generate_summary(
        self,
        ticker: str,
        financials: list[dict],
        quote: dict,
        rating: dict,
    ) -> str:
        """Generate a SEBI-style narrative summary for a given ticker.

        Builds a prompt from financial data and invokes Gemma 3 4B IT via
        AWS Bedrock to produce a 3-4 sentence fundamental analysis.

        Args:
            ticker: NSE stock symbol (e.g., "JNKINDIA").
            financials: List of quarterly financial dicts with keys:
                revenue, expenses, operating_profit, net_profit, margin_pct.
            quote: Live quote dict with at least 'lastPrice' key.
            rating: XGBoost rating dict with 'rating' and 'confidence' keys.

        Returns:
            Generated narrative string, or empty string on any error.
        """
        if not financials:
            return ""

        prompt = self._build_prompt(ticker, financials, quote, rating)

        try:
            response = self.client.invoke_model(
                modelId=self.model_id,
                contentType="application/json",
                accept="application/json",
                body=json.dumps(
                    {
                        "messages": [
                            {"role": "user", "content": prompt}
                        ],
                        "max_tokens": 300,
                        "temperature": 0.3,
                    }
                ),
            )
            result = json.loads(response["body"].read())
            # Bedrock Gemma returns OpenAI-style chat completion
            choices = result.get("choices", [])
            if not choices:
                return ""
            return choices[0].get("message", {}).get("content", "") or ""

        except ClientError as e:
            logger.warning(
                "Bedrock ClientError for %s: %s", ticker, str(e)
            )
            return ""
        except (ReadTimeoutError, ConnectTimeoutError) as e:
            logger.warning(
                "Bedrock timeout for %s: %s", ticker, str(e)
            )
            return ""
        except (ConnectionError, OSError) as e:
            logger.warning(
                "Bedrock connection error for %s: %s", ticker, str(e)
            )
            return ""
        except Exception as e:
            logger.warning(
                "Unexpected error generating summary for %s: %s",
                ticker,
                str(e),
            )
            return ""

    def _build_prompt(
        self,
        ticker: str,
        financials: list[dict],
        quote: dict,
        rating: dict,
    ) -> str:
        """Build a SEBI-style analysis prompt from financial data.

        Args:
            ticker: NSE stock symbol.
            financials: Quarterly financial data.
            quote: Live quote data.
            rating: XGBoost rating output.

        Returns:
            Formatted prompt string for the Gemma model.
        """
        latest = financials[0]
        revenue_cr = latest.get("revenue", 0) / 1e7
        margin_pct = latest.get("margin_pct", 0)
        last_price = quote.get("lastPrice", "N/A")
        ai_rating = rating.get("rating", "N/A")
        ai_confidence = rating.get("confidence", 0)

        return (
            "You are a SEBI-registered research analyst. "
            "Write a 3-4 sentence fundamental analysis summary for "
            f"{ticker} based on:\n"
            f"- Latest quarter revenue: ₹{revenue_cr:.0f} Cr\n"
            f"- Net profit margin: {margin_pct:.1f}%\n"
            f"- Current price: ₹{last_price}\n"
            f"- AI Rating: {ai_rating} (confidence: {ai_confidence})\n"
            "Keep it factual, concise, and suitable for retail investors."
        )
