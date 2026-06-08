"""TFT dummy inference handler for SageMaker.

Returns heuristic-based macro resilience score until a real model is trained.
"""

import json


def model_fn(model_dir):
    """Load model — returns a placeholder since no real model exists yet."""
    return {"type": "dummy_tft"}


def input_fn(request_body, content_type):
    """Parse input."""
    if content_type == "application/json":
        return json.loads(request_body)
    raise ValueError(f"Unsupported content type: {content_type}")


def predict_fn(input_data, model):
    """Generate macro resilience score using heuristic logic."""
    repo_rate = input_data.get("repo_rate", 6.0)
    sector_indices = input_data.get("sector_indices", {})
    
    if not sector_indices:
        score = 50
    else:
        sector_values = list(sector_indices.values())
        avg_sector = sum(sector_values) / len(sector_values)
        normalized = (avg_sector / 30000.0) * 60 + 20
        rate_adjustment = (6.0 - repo_rate) * 3
        score = max(0, min(100, int(normalized + rate_adjustment)))
    
    if score >= 65:
        trend = "Bullish"
    elif score <= 35:
        trend = "Bearish"
    else:
        trend = "Neutral"
    
    return {"score": score, "trend_outlook": trend}


def output_fn(prediction, accept):
    """Serialize output."""
    return json.dumps(prediction), "application/json"
