"""Unit tests for GemmaModel class."""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError, ReadTimeoutError, ConnectTimeoutError


# Import the module directly to avoid __init__.py dependency chain
import importlib.util
import os

_spec = importlib.util.spec_from_file_location(
    "gemma_model",
    os.path.join(os.path.dirname(__file__), "..", "ml_models", "gemma_model.py"),
)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
GemmaModel = _mod.GemmaModel


SAMPLE_FINANCIALS = [
    {
        "quarter": "Q3 FY25",
        "revenue": 12500000000,
        "expenses": 9800000000,
        "operating_profit": 2700000000,
        "net_profit": 1900000000,
        "margin_pct": 15.2,
    }
]

SAMPLE_QUOTE = {"lastPrice": 245.5}

SAMPLE_RATING = {"rating": "STRONG BUY", "confidence": 0.87}


class TestGemmaModelBuildPrompt:
    """Tests for the _build_prompt method."""

    @patch("boto3.client")
    def test_prompt_contains_ticker(self, mock_client):
        model = GemmaModel()
        prompt = model._build_prompt("JNKINDIA", SAMPLE_FINANCIALS, SAMPLE_QUOTE, SAMPLE_RATING)
        assert "JNKINDIA" in prompt

    @patch("boto3.client")
    def test_prompt_contains_revenue_in_crores(self, mock_client):
        model = GemmaModel()
        prompt = model._build_prompt("JNKINDIA", SAMPLE_FINANCIALS, SAMPLE_QUOTE, SAMPLE_RATING)
        # 12500000000 / 1e7 = 1250 Cr
        assert "1250 Cr" in prompt

    @patch("boto3.client")
    def test_prompt_contains_margin(self, mock_client):
        model = GemmaModel()
        prompt = model._build_prompt("JNKINDIA", SAMPLE_FINANCIALS, SAMPLE_QUOTE, SAMPLE_RATING)
        assert "15.2%" in prompt

    @patch("boto3.client")
    def test_prompt_contains_price(self, mock_client):
        model = GemmaModel()
        prompt = model._build_prompt("JNKINDIA", SAMPLE_FINANCIALS, SAMPLE_QUOTE, SAMPLE_RATING)
        assert "245.5" in prompt

    @patch("boto3.client")
    def test_prompt_contains_rating(self, mock_client):
        model = GemmaModel()
        prompt = model._build_prompt("JNKINDIA", SAMPLE_FINANCIALS, SAMPLE_QUOTE, SAMPLE_RATING)
        assert "STRONG BUY" in prompt
        assert "0.87" in prompt

    @patch("boto3.client")
    def test_prompt_is_sebi_style(self, mock_client):
        model = GemmaModel()
        prompt = model._build_prompt("JNKINDIA", SAMPLE_FINANCIALS, SAMPLE_QUOTE, SAMPLE_RATING)
        assert "SEBI" in prompt
        assert "retail investors" in prompt


class TestGemmaModelGenerateSummary:
    """Tests for the generate_summary method."""

    @patch("boto3.client")
    def test_returns_empty_string_on_empty_financials(self, mock_client):
        model = GemmaModel()
        result = model.generate_summary("JNKINDIA", [], SAMPLE_QUOTE, SAMPLE_RATING)
        assert result == ""

    @patch("boto3.client")
    def test_successful_generation(self, mock_client):
        mock_bedrock = MagicMock()
        mock_client.return_value = mock_bedrock

        response_body = json.dumps(
            {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {"text": "Based on current fundamentals, JNKINDIA demonstrates strong growth."}
                            ]
                        }
                    }
                ]
            }
        ).encode()

        mock_response = MagicMock()
        mock_response.read.return_value = response_body
        mock_bedrock.invoke_model.return_value = {"body": mock_response}

        model = GemmaModel()
        result = model.generate_summary("JNKINDIA", SAMPLE_FINANCIALS, SAMPLE_QUOTE, SAMPLE_RATING)
        assert result == "Based on current fundamentals, JNKINDIA demonstrates strong growth."

    @patch("boto3.client")
    def test_returns_empty_on_client_error(self, mock_client):
        mock_bedrock = MagicMock()
        mock_client.return_value = mock_bedrock
        mock_bedrock.invoke_model.side_effect = ClientError(
            {"Error": {"Code": "ThrottlingException", "Message": "Rate exceeded"}},
            "InvokeModel",
        )

        model = GemmaModel()
        result = model.generate_summary("JNKINDIA", SAMPLE_FINANCIALS, SAMPLE_QUOTE, SAMPLE_RATING)
        assert result == ""

    @patch("boto3.client")
    def test_returns_empty_on_read_timeout(self, mock_client):
        mock_bedrock = MagicMock()
        mock_client.return_value = mock_bedrock
        mock_bedrock.invoke_model.side_effect = ReadTimeoutError(endpoint_url="https://bedrock.us-east-1.amazonaws.com")

        model = GemmaModel()
        result = model.generate_summary("JNKINDIA", SAMPLE_FINANCIALS, SAMPLE_QUOTE, SAMPLE_RATING)
        assert result == ""

    @patch("boto3.client")
    def test_returns_empty_on_connect_timeout(self, mock_client):
        mock_bedrock = MagicMock()
        mock_client.return_value = mock_bedrock
        mock_bedrock.invoke_model.side_effect = ConnectTimeoutError(endpoint_url="https://bedrock.us-east-1.amazonaws.com")

        model = GemmaModel()
        result = model.generate_summary("JNKINDIA", SAMPLE_FINANCIALS, SAMPLE_QUOTE, SAMPLE_RATING)
        assert result == ""

    @patch("boto3.client")
    def test_returns_empty_on_connection_error(self, mock_client):
        mock_bedrock = MagicMock()
        mock_client.return_value = mock_bedrock
        mock_bedrock.invoke_model.side_effect = ConnectionError("Connection refused")

        model = GemmaModel()
        result = model.generate_summary("JNKINDIA", SAMPLE_FINANCIALS, SAMPLE_QUOTE, SAMPLE_RATING)
        assert result == ""

    @patch("boto3.client")
    def test_returns_empty_on_empty_candidates(self, mock_client):
        mock_bedrock = MagicMock()
        mock_client.return_value = mock_bedrock

        response_body = json.dumps({"candidates": []}).encode()
        mock_response = MagicMock()
        mock_response.read.return_value = response_body
        mock_bedrock.invoke_model.return_value = {"body": mock_response}

        model = GemmaModel()
        result = model.generate_summary("JNKINDIA", SAMPLE_FINANCIALS, SAMPLE_QUOTE, SAMPLE_RATING)
        assert result == ""

    @patch("boto3.client")
    def test_returns_empty_on_malformed_response(self, mock_client):
        mock_bedrock = MagicMock()
        mock_client.return_value = mock_bedrock

        response_body = json.dumps({"unexpected_key": "value"}).encode()
        mock_response = MagicMock()
        mock_response.read.return_value = response_body
        mock_bedrock.invoke_model.return_value = {"body": mock_response}

        model = GemmaModel()
        result = model.generate_summary("JNKINDIA", SAMPLE_FINANCIALS, SAMPLE_QUOTE, SAMPLE_RATING)
        assert result == ""

    @patch("boto3.client")
    def test_invoke_model_called_with_correct_model_id(self, mock_client):
        mock_bedrock = MagicMock()
        mock_client.return_value = mock_bedrock

        response_body = json.dumps(
            {"candidates": [{"content": {"parts": [{"text": "Summary"}]}}]}
        ).encode()
        mock_response = MagicMock()
        mock_response.read.return_value = response_body
        mock_bedrock.invoke_model.return_value = {"body": mock_response}

        model = GemmaModel()
        model.generate_summary("JNKINDIA", SAMPLE_FINANCIALS, SAMPLE_QUOTE, SAMPLE_RATING)

        call_kwargs = mock_bedrock.invoke_model.call_args[1]
        assert call_kwargs["modelId"] == "google/gemma-3-4b-it"
        assert call_kwargs["contentType"] == "application/json"
        assert call_kwargs["accept"] == "application/json"

    @patch("boto3.client")
    def test_invoke_model_body_has_correct_structure(self, mock_client):
        mock_bedrock = MagicMock()
        mock_client.return_value = mock_bedrock

        response_body = json.dumps(
            {"candidates": [{"content": {"parts": [{"text": "Summary"}]}}]}
        ).encode()
        mock_response = MagicMock()
        mock_response.read.return_value = response_body
        mock_bedrock.invoke_model.return_value = {"body": mock_response}

        model = GemmaModel()
        model.generate_summary("JNKINDIA", SAMPLE_FINANCIALS, SAMPLE_QUOTE, SAMPLE_RATING)

        call_kwargs = mock_bedrock.invoke_model.call_args[1]
        body = json.loads(call_kwargs["body"])
        assert "contents" in body
        assert body["contents"][0]["role"] == "user"
        assert "generationConfig" in body
        assert body["generationConfig"]["maxOutputTokens"] == 300
        assert body["generationConfig"]["temperature"] == 0.3
