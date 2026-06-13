"""
app/main.py — FastAPI application factory.
This file only initialises the app, sets up middleware, and registers routers.
No business logic lives here.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import scoring, oracle, chat, emergency

app = FastAPI(
    title="ChitX AI Oracle",
    description="AI-powered trust scoring, document verification, and financial Oracle for the ChitX protocol.",
    version="2.0.0",
)

# ── CORS ───────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────
app.include_router(scoring.router)
app.include_router(oracle.router)
app.include_router(chat.router)
app.include_router(emergency.router)


# ── Health check ───────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "running", "service": "ChitX AI Oracle v2"}


@app.post("/ai/process")
async def process_bridge():
    return {"message": "AI Processing Bridge Active"}
