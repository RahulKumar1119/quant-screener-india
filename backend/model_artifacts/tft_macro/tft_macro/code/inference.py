"""TFT inference handler for SageMaker PyTorch container.

This file gets packaged into model.tar.gz alongside model.pt.
SageMaker PyTorch container looks for model_fn, input_fn, predict_fn, output_fn.
"""

import json
import os

import numpy as np
import torch
import torch.nn as nn


class TFTMacroModel(nn.Module):
    """Same architecture as training — must match exactly."""

    def __init__(self, input_dim=21, hidden_dim=64, num_heads=4):
        super().__init__()
        self.encoder = nn.LSTM(input_dim, hidden_dim, batch_first=True)
        self.attention = nn.MultiheadAttention(hidden_dim, num_heads, batch_first=True)
        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
            nn.Sigmoid(),
        )

    def forward(self, x):
        lstm_out, _ = self.encoder(x)
        attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)
        return self.fc(attn_out[:, -1, :]).squeeze(-1)


def model_fn(model_dir):
    """Load the PyTorch model from the model directory."""
    model = TFTMacroModel(input_dim=21, hidden_dim=64, num_heads=4)
    model_path = os.path.join(model_dir, "model.pt")
    model.load_state_dict(torch.load(model_path, map_location="cpu"))
    model.eval()
    return model


def input_fn(request_body, content_type):
    """Parse input data."""
    if content_type == "application/json":
        data = json.loads(request_body)
        features = np.array(data.get("features", []), dtype=np.float32)
        return torch.tensor(features).unsqueeze(0)  # Add batch dim
    raise ValueError(f"Unsupported content type: {content_type}")


def predict_fn(input_data, model):
    """Run inference."""
    with torch.no_grad():
        score = model(input_data).item()
    # Convert to 0-100 scale
    score_100 = int(max(0, min(100, score * 100)))
    if score_100 >= 65:
        trend = "Bullish"
    elif score_100 <= 35:
        trend = "Bearish"
    else:
        trend = "Neutral"
    return {"score": score_100, "trend_outlook": trend}


def output_fn(prediction, accept):
    """Serialize output."""
    return json.dumps(prediction), "application/json"
