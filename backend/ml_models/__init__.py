"""ML model wrappers for stock analysis inference pipeline.

Exports all model classes for use in the FastAPI application lifespan.
XGBoost, LSTM, and TFT models invoke SageMaker Serverless Inference endpoints.
Gemma model uses AWS Bedrock directly.
"""

from .xgboost_model import XGBoostModel
from .lstm_model import LSTMModel
from .tft_model import TFTModel
from .gemma_model import GemmaModel

__all__ = [
    "XGBoostModel",
    "LSTMModel",
    "TFTModel",
    "GemmaModel",
]
