"""
app/routes/oracle.py
Endpoint: /ai/oracle-insights
"""
import json
import re
from fastapi import APIRouter, HTTPException

from ..schemas.models import OracleRequest
from ..services.groq_client import groq_client

router = APIRouter()


@router.post("/ai/oracle-insights")
async def oracle_insights(data: OracleRequest):
    try:
        disposable = data.income - data.expenses
        savings_rate = round((disposable / data.income * 100), 1) if data.income > 0 else 0
        expense_ratio = round((data.expenses / data.income * 100), 1) if data.income > 0 else 100

        if data.trustScore >= 80:
            trust_tier = "Excellent (Elite tier)"
        elif data.trustScore >= 65:
            trust_tier = "Good (Standard tier)"
        elif data.trustScore >= 50:
            trust_tier = "Average (entry-level qualified)"
        else:
            trust_tier = "Below threshold (not yet pool-eligible)"

        bank_context = (
            "The user has provided a bank statement — their income and expense figures are AI-verified "
            "and reflect actual transaction history."
        ) if data.hasBankStatement else (
            "The user has NOT uploaded a bank statement — figures are self-reported and unverified."
        )

        pool_context = (
            f"The user is currently active in {data.poolsJoined} chit pool(s)."
            if data.poolsJoined > 0
            else "The user has not joined any pools yet."
        )

        prompt = f"""You are ChitX Oracle, an expert AI financial advisor for a decentralized chit fund platform.
Analyze this user's complete financial profile and return exactly 3 highly personalized, actionable insights.

USER PROFILE:
- Name: {data.name}
- Employment: {data.employment}
- Monthly Income: ₹{data.income:,.0f}
- Monthly Expenses: ₹{data.expenses:,.0f}
- Disposable Income: ₹{disposable:,.0f}/month
- Savings Rate: {savings_rate}%
- Expense Ratio: {expense_ratio}%
- Trust Score: {data.trustScore}/100 — {trust_tier}
- CTX Token Balance: {data.ctxBalance} CTX
- {bank_context}
- {pool_context}

Return ONLY a valid JSON array with EXACTLY 3 objects. Each object must have:
- "emoji": one relevant emoji string
- "title": short 3-5 word title (string)
- "insight": 1-2 sentence personalized recommendation mentioning their actual numbers (string)
- "confidence": integer 60-99
- "category": one of "risk", "opportunity", "action"

Do NOT include any text outside the JSON array."""

        chat = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.5,
            max_tokens=800,
        )
        raw = chat.choices[0].message.content.strip()
        if "```" in raw:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw)
            raw = match.group(1).strip() if match else raw
        insights = json.loads(raw)
        return {"ok": True, "insights": insights[:3]}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            "ok": False,
            "insights": [
                {"emoji": "🛡️", "title": "Trust Score Status", "insight": f"Your trust score of {data.trustScore}/100 determines your pool eligibility.", "confidence": 90, "category": "risk"},
                {"emoji": "💰", "title": "Savings Opportunity", "insight": f"With ₹{data.income - data.expenses:,.0f} in monthly disposable income, consider joining a chit pool.", "confidence": 75, "category": "opportunity"},
                {"emoji": "🪙", "title": "CTX Balance Alert", "insight": f"You currently hold {data.ctxBalance} CTX tokens. Maintain at least 2× your preferred pool's monthly pay.", "confidence": 80, "category": "action"},
            ],
        }
