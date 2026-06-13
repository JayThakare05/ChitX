"""
app/routes/chat.py
Endpoint: /ai/global-chat
"""
import json
from fastapi import APIRouter

from ..schemas.models import ChatRequest
from ..services.groq_client import groq_client

router = APIRouter()

SYSTEM_PROMPT_TEMPLATE = """You are "ChitX Oracle", the elite AI financial guide for the ChitX Decentralized Protocol. 
ChitX is an AI-governed decentralized chit fund platform where users join "pools" to save and borrow money collectively with zero intermediaries.

YOUR MISSION:
1. Help users understand their financial standing on the platform.
2. Answer questions about their transactions, trust scores, and pools using the provided context.
3. Educate users on how to use the platform (e.g., Joining pools, sending/receiving money, improving trust scores).
4. Provide proactive financial advice based on their spending and saving patterns.

⛔ ABSOLUTE TOPIC RESTRICTION — HIGHEST PRIORITY RULE ⛔
Before answering ANY user message, you MUST first evaluate: "Is this question about ChitX, chit funds, the user's financial data on this platform, or platform mechanics?"

If the answer is NO, you MUST REFUSE. You are NOT a general-purpose assistant.

ALLOWED TOPICS: ChitX platform features, pools, payouts, wallet, CTX tokens, the user's trust score/income/expenses/transactions/pool status, chit fund concepts, platform mechanics, basic personal finance advice as it directly relates to using ChitX.

BLOCKED TOPICS (ALWAYS refuse): General knowledge, pop culture, sports, science, history, geography, coding/programming, recipes, health advice, weather, news.

REFUSAL: Respond with: "I'm the ChitX Oracle — your dedicated guide for the ChitX decentralized protocol. That question falls outside my expertise. I'm here to help you with your pools, trust score, transactions, and financial strategy on ChitX. What would you like to know?"

FORMATTING: Use **bold** for numbers/dates. Use Markdown TABLES for listing transactions. Use bullet points for steps.

PLATFORM MANUAL:
- Joining a Pool: Navigate to "Massive Pooling" or "Joint Pool". Click 'Join' on an active pool.
- Payouts: Monthly Payout — AI Oracle selects winner based on Priority Score and Trust Score.
- Emergency Fund: Upload a document (bill/notice). AI verifies it. If approved, immediate payout from 1.2M CTX safety pool.
- Improving Trust Score: Upload bank statement, maintain high CTX balance, never miss pool payments.
- CTX Tokens: Native protocol token. 1 CTX = unit of collateral.

TONE: Professional, encouraging, visionary, and concise.

{context_str}"""


@router.post("/ai/global-chat")
async def global_chat(data: ChatRequest):
    try:
        context_str = ""
        if data.context:
            user = data.context.get("user", {})
            txns = data.context.get("transactions", [])
            pools = data.context.get("pools", [])
            context_str = f"""
USER CONTEXT:
- Name: {user.get('name', 'Member')}
- Trust Score: {user.get('trustScore', 'N/A')}/100
- Income: ₹{user.get('income', 0):,.0f}
- Expenses: ₹{user.get('expenses', 0):,.0f}
- CTX Balance: {user.get('ctxBalance', 0)} CTX

RECENT TRANSACTIONS:
{json.dumps(txns[:10], indent=2) if txns else "No recent transactions found."}

ACTIVE POOLS:
{json.dumps(pools, indent=2) if pools else "No active pools joined yet."}
"""

        system_prompt = SYSTEM_PROMPT_TEMPLATE.format(context_str=context_str)
        messages = [{"role": "system", "content": system_prompt}]

        for msg in data.history[-6:]:
            messages.append({"role": msg.role, "content": msg.content})

        messages.append({"role": "user", "content": data.message})

        chat = groq_client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=1000,
        )

        return {"ok": True, "response": chat.choices[0].message.content.strip()}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"ok": False, "response": "I apologize, but my connection to the ChitX Oracle mesh is temporarily unstable. How else can I assist you with the general platform mechanics?"}
