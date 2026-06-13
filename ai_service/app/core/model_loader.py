"""
model_loader.py — Loads the scikit-learn TrustScore pipeline at startup.

Import `trust_model` from this module wherever you need ML predictions.
The model is loaded once (singleton pattern) so it isn't reloaded on every request.
"""
import joblib
from .config import MODEL_PATH

trust_model = None

try:
    trust_model = joblib.load(MODEL_PATH)
    print(f"[SUCCESS] TrustScore ML Model loaded from: {MODEL_PATH}")
except FileNotFoundError:
    print(f"[WARNING] Model file not found at {MODEL_PATH}. Falling back to heuristic scoring.")
except Exception as e:
    print(f"[ERROR] Failed to load TrustScore model: {e}. Falling back to heuristic scoring.")
