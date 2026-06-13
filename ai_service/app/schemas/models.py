"""
schemas/models.py — All Pydantic request/response models for the AI service.
Extracted from app.py to keep endpoint files clean.
"""
from pydantic import BaseModel
from typing import List, Optional


class KYCData(BaseModel):
    income: float
    expenses: float
    employment: str
    hasBankStatement: bool


class OracleRequest(BaseModel):
    trustScore: float
    income: float
    expenses: float
    employment: str
    ctxBalance: float
    poolsJoined: int
    hasBankStatement: bool
    walletAddress: str = ""
    name: str = "Member"


class ChatMessage(BaseModel):
    role: str   # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatMessage] = []
    context: dict = {}
