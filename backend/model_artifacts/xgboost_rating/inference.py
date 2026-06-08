"""XGBoost dummy inference handler for SageMaker.

Returns random rating probabilities until a real model is trained.
"""

import json
import random


def model_fn(model_dir):
    """Load model — returns a placeholder since no real model exists yet."""
    return {"type": "dummy_xgboost"}


def input_fn(request_body, content_type):
    """Parse input."""
    if content_type == "application/json":
        return json.loads(request_body)
    raise ValueError(f"Unsupported content type: {content_type}")


def predict_fn(input_data, model):
    """Generate dummy rating probabilities."""
    # Bias toward BUY/STRONG BUY for demo purposes
    probs = [
        random.uniform(0.05, 0.15),   # SELL
        random.uniform(0.10, 0.25),   # HOLD
        random.uniform(0.20, 0.40),   # BUY
        random.uniform(0.30, 0.50),   # STRONG BUY
    ]
    # Normalize to sum to 1
    total = sum(probs)
    probs = [p / total for p in probs]
    return probs


def output_fn(prediction, accept):
    """Serialize output."""
    return json.dumps({"probabilities": prediction}), "application/json"
