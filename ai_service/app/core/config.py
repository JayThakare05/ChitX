import os
from dotenv import load_dotenv

load_dotenv()

# ── Groq ───────────────────────────────────────────────────────────────────
GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

# ── Server ─────────────────────────────────────────────────────────────────
HOST: str = os.getenv("HOST", "0.0.0.0")
PORT: int = int(os.getenv("PORT", "8000"))

# ── Paths ──────────────────────────────────────────────────────────────────
import pathlib
BASE_DIR = pathlib.Path(__file__).resolve().parent.parent.parent  # ai_service/
MODEL_PATH = BASE_DIR / "models" / "TrustScore" / "trust_model_pipeline.pkl"
