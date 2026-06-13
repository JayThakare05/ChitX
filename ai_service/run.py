"""
run.py — Uvicorn entry point for the ChitX AI Oracle service.
Run with: python run.py
Or directly: uvicorn app.main:app --reload --port 8000
"""
import uvicorn
from app.core.config import HOST, PORT

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=HOST, port=PORT, reload=True)
