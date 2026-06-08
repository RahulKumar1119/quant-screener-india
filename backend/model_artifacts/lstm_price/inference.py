"""LSTM dummy inference handler for SageMaker.

Returns slight uptrend predictions based on last price until a real model is trained.
"""

import json
import random


def model_fn(model_dir):
    """Load model — returns a placeholder since no real model exists yet."""
    return {"type": "dummy_lstm"}


def input_fn(request_body, content_type):
    """Parse input."""
    if content_type == "application/json":
        return json.loads(request_body)
    raise ValueError(f"Unsupported content type: {content_type}")


def predict_fn(input_data, model):
    """Generate dummy 7-day price predictions.
    
    Uses the last normalized value and adds slight random drift.
    """
    close_prices = input_data.get("close_prices", [])
    mean_price = input_data.get("mean_price", 100.0)
    std_price = input_data.get("std_price", 10.0)
    
    # Start from last normalized value
    last_val = close_prices[-1] if close_prices else 0.0
    
    predictions = []
    current = last_val
    for _ in range(7):
        # Slight random uptrend
        drift = random.uniform(-0.1, 0.2)
        current += drift
        predictions.append(current)
    
    # Denormalize
    prices = [round(p * std_price + mean_price, 2) for p in predictions]
    return prices


def output_fn(prediction, accept):
    """Serialize output."""
    return json.dumps({"prices": prediction}), "application/json"
