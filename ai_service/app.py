from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import numpy as np
import io
import os
import joblib
import groq
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ==============================
# APP INIT
# ==============================
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# LOAD ML MODEL AT STARTUP
# ==============================
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "TrustScore", "trust_model_pipeline.pkl")

try:
    trust_model = joblib.load(MODEL_PATH)
    print(f"[SUCCESS] TrustScore ML Model loaded from: {MODEL_PATH}")
except Exception as e:
    print(f"[ERROR] Failed to load TrustScore model: {e}")
    trust_model = None

# ==============================
# GROQ CLIENT
# ==============================
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
groq_client = Groq(api_key=GROQ_API_KEY)


# ==============================
# CSV PARSING HELPERS (ported from trust_score_model.py)
# ==============================
def parse_amount(value: str):
    """Returns (amount_float, 'credit'|'debit') from '12345.00 (Cr)' format."""
    v = str(value).strip()
    try:
        amount = float(v.split(" ")[0].replace(",", ""))
        typ = "credit" if "Cr" in v else "debit"
    except (ValueError, IndexError):
        amount, typ = 0.0, "debit"
    return amount, typ


def process_transactions(df: pd.DataFrame) -> pd.DataFrame:
    """Parse the CSV into a structured DataFrame with amount, type, and parsed dates."""
    df = df.copy()
    if "Amount (Rs.)" in df.columns:
        df[["amount", "type"]] = df["Amount (Rs.)"].apply(
            lambda x: pd.Series(parse_amount(str(x)))
        )
    else:
        # Fallback: try to find credit/debit columns
        df["amount"] = 0.0
        df["type"] = "debit"
        for col in df.columns:
            lower_col = col.lower()
            if 'credit' in lower_col or 'deposit' in lower_col:
                credit_vals = pd.to_numeric(df[col], errors='coerce').fillna(0)
                debit_vals = df.get("amount", pd.Series([0]*len(df)))
                df["amount"] = credit_vals + debit_vals
                df.loc[credit_vals > 0, "type"] = "credit"
            elif 'debit' in lower_col or 'withdrawal' in lower_col:
                debit_vals = pd.to_numeric(df[col], errors='coerce').fillna(0)
                df.loc[debit_vals > 0, "amount"] = debit_vals
                df.loc[debit_vals > 0, "type"] = "debit"

    # Parse date
    date_col = None
    for col in df.columns:
        if 'date' in col.lower():
            date_col = col
            break
    if date_col:
        df["parsed_date"] = pd.to_datetime(df[date_col], dayfirst=True, errors="coerce")
    else:
        df["parsed_date"] = pd.NaT

    return df


def calc_avg_balance(df: pd.DataFrame) -> float:
    """Average account balance across all transactions."""
    bal_col = None
    for col in df.columns:
        if 'balance' in col.lower():
            bal_col = col
            break
    if bal_col:
        return float(pd.to_numeric(df[bal_col], errors='coerce').mean())
    # Fallback: estimate from credits - debits
    credits = df[df["type"] == "credit"]["amount"].sum()
    debits = df[df["type"] == "debit"]["amount"].sum()
    return max(float(credits - debits), 10000.0)


def calc_salary_consistency(df: pd.DataFrame) -> float:
    """
    Measures how stable/regular the income credits are.
    Uses coefficient of variation: lower CV → higher consistency.
    Returns 0–1 (1 = very consistent income).
    """
    credits = df[df["type"] == "credit"]["amount"]
    if len(credits) < 2:
        return 0.5
    cv = credits.std() / credits.mean() if credits.mean() > 0 else 1.0
    return float(np.clip(1 - cv, 0.0, 1.0))


def calc_spending_stability(df: pd.DataFrame) -> float:
    """
    Measures how stable/predictable spending is.
    Lower variance in debits = higher stability.
    Returns 0–1.
    """
    debits = df[df["type"] == "debit"]["amount"]
    if len(debits) < 2:
        return 0.5
    cv = debits.std() / debits.mean() if debits.mean() > 0 else 1.0
    return float(np.clip(1 - cv, 0.0, 1.0))


def calc_payment_timeliness(df: pd.DataFrame) -> float:
    """
    Measures financial regularity month-over-month.
    Fraction of months that have at least one credit transaction.
    Returns 0–1.
    """
    if "parsed_date" not in df.columns or df["parsed_date"].isna().all():
        return float(np.clip(len(df) / 50, 0.0, 1.0))

    credits = df[df["type"] == "credit"].copy()
    if credits.empty:
        return 0.0

    all_months = df["parsed_date"].dt.to_period("M").dropna().unique()
    credit_months = credits["parsed_date"].dt.to_period("M").dropna().unique()

    if len(all_months) == 0:
        return 0.5

    return float(np.clip(len(credit_months) / len(all_months), 0.0, 1.0))


# ==============================
# GROQ: ESTIMATE CIBIL SCORE
# ==============================
async def estimate_cibil_from_groq(total_credits: float, total_debits: float,
                                    avg_balance: float, txn_count: int,
                                    salary_consistency: float) -> int:
    """
    Send a financial summary to Groq LLM and ask it to estimate a CIBIL-like score (300-900).
    """
    try:
        prompt = f"""You are a financial credit scoring expert. Based on the following bank transaction summary, 
estimate a CIBIL credit score between 300 and 900. 

Financial Summary:
- Total Credits (Income): ₹{total_credits:,.2f}
- Total Debits (Expenses): ₹{total_debits:,.2f}
- Average Account Balance: ₹{avg_balance:,.2f}
- Total Transactions: {txn_count}
- Salary Consistency Score: {salary_consistency:.2f} (0=irregular, 1=very regular)
- Savings Rate: {((total_credits - total_debits) / total_credits * 100) if total_credits > 0 else 0:.1f}%

IMPORTANT: Respond with ONLY a single integer number between 300 and 900. Nothing else. No explanation, no text, just the number."""

        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=10,
        )

        response_text = chat_completion.choices[0].message.content.strip()
        # Extract the number from the response
        cibil_score = int(''.join(filter(str.isdigit, response_text)))
        cibil_score = max(300, min(900, cibil_score))
        
        print(f"🧠 Groq estimated CIBIL Score: {cibil_score}")
        return cibil_score

    except Exception as e:
        print(f"⚠️ Groq CIBIL estimation failed: {e}. Using default 650.")
        return 650


# ==============================
# PYDANTIC MODELS
# ==============================
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


class ChatRequest(BaseModel):
    message: str
    history: list = []
    context: dict = {}


# ==============================
# ENDPOINTS
# ==============================
@app.post("/ai/process")
async def process_request():
    return {"message": "AI Processing Bridge Active"}


# ==============================
# AI ORACLE INSIGHTS (Groq-powered)
# ==============================
@app.post("/ai/oracle-insights")
async def oracle_insights(data: OracleRequest):
    try:
        disposable   = data.income - data.expenses
        savings_rate = round((disposable / data.income * 100), 1) if data.income > 0 else 0
        expense_ratio = round((data.expenses / data.income * 100), 1) if data.income > 0 else 100

        # Trust score tier label
        if data.trustScore >= 80:   trust_tier = "Excellent (Elite tier)"
        elif data.trustScore >= 65: trust_tier = "Good (Standard tier)"
        elif data.trustScore >= 50: trust_tier = "Average (entry-level qualified)"
        else:                       trust_tier = "Below threshold (not yet pool-eligible)"

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
- "confidence": integer 60-99 representing how confident you are in this insight
- "category": one of "risk", "opportunity", "action"

Focus on: trust score trajectory, pool eligibility, income/savings optimization, CTX allocation strategy, and financial risks.
Be specific — mention their actual ₹ numbers, CTX balance, and trust score in the insights.
Do NOT include any text outside the JSON array."""

        chat = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.5,
            max_tokens=800,
        )

        raw = chat.choices[0].message.content.strip()

        # Extract JSON if wrapped in markdown code block
        if "```" in raw:
            import re
            match = re.search(r'```(?:json)?\s*([\s\S]*?)```', raw)
            raw = match.group(1).strip() if match else raw

        import json
        insights = json.loads(raw)

        return {"ok": True, "insights": insights[:3]}

    except Exception as e:
        import traceback
        traceback.print_exc()
        # Return safe fallback
        return {
            "ok": False,
            "insights": [
                {
                    "emoji": "🛡️",
                    "title": "Trust Score Status",
                    "insight": f"Your trust score of {data.trustScore}/100 determines your pool eligibility and token allocation. Keep contributing consistently to improve it.",
                    "confidence": 90,
                    "category": "risk"
                },
                {
                    "emoji": "💰",
                    "title": "Savings Opportunity",
                    "insight": f"With ₹{data.income - data.expenses:,.0f} in monthly disposable income, consider joining a chit pool to grow your savings systematically.",
                    "confidence": 75,
                    "category": "opportunity"
                },
                {
                    "emoji": "🪙",
                    "title": "CTX Balance Alert",
                    "insight": f"You currently hold {data.ctxBalance} CTX tokens. Maintain at least 2× your preferred pool's monthly pay as a fixed deposit buffer.",
                    "confidence": 80,
                    "category": "action"
                }
            ]
        }


# ==============================
# GLOBAL AI CHATBOT (ChitX Oracle)
# ==============================
@app.post("/ai/global-chat")
async def global_chat(data: ChatRequest):
    try:
        # Build context string
        context_str = ""
        if data.context:
            user = data.context.get("user", {})
            txns = data.context.get("transactions", [])
            pools = data.context.get("pools", [])
            
            import json
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

        system_prompt = f"""You are "ChitX Oracle", the elite AI financial guide for the ChitX Decentralized Protocol. 
ChitX is an AI-governed decentralized chit fund platform where users join "pools" to save and borrow money collectively with zero intermediaries.

YOUR MISSION:
1. Help users understand their financial standing on the platform.
2. Answer questions about their transactions, trust scores, and pools using the provided context.
3. Educate users on how to use the platform (e.g., Joining pools, sending/receiving money, improving trust scores).
4. Provide proactive financial advice based on their spending and saving patterns.

⛔ ABSOLUTE TOPIC RESTRICTION — HIGHEST PRIORITY RULE ⛔
Before answering ANY user message, you MUST first evaluate: "Is this question about ChitX, chit funds, the user's financial data on this platform, or platform mechanics?"

If the answer is NO, you MUST REFUSE. You are NOT a general-purpose assistant. You are NOT a search engine. You are NOT an encyclopedia.

ALLOWED TOPICS (answer these):
- ChitX platform features, pools, payouts, wallet, CTX tokens
- The user's trust score, income, expenses, transactions, pool status
- Chit fund concepts, how chit funds work
- Platform mechanics: onboarding, emergency fund, payments, AI simulation
- Basic personal finance advice ONLY as it directly relates to using ChitX (e.g., "Should I join this pool given my income?")

BLOCKED TOPICS (ALWAYS refuse — no exceptions, no partial answers, no hints):
- General knowledge (e.g., "What is the capital of France?", "How far is the moon?")
- Pop culture, sports, entertainment (e.g., "Who won the World Cup?", "Best movies of 2024")
- Science, history, geography, math, trivia unrelated to finance
- Coding, programming, homework help
- Recipes, health advice, weather, news
- Anything that a general chatbot or search engine would answer

REFUSAL BEHAVIOR:
- Do NOT answer the question at all — not even partially or "just this once"
- Do NOT say "I'm not supposed to, but..." and then answer anyway
- Do NOT provide the answer followed by a disclaimer
- Instead, respond with a firm but polite refusal and redirect, such as:
  "I'm the ChitX Oracle — your dedicated guide for the ChitX decentralized protocol. That question falls outside my expertise. I'm here to help you with your pools, trust score, transactions, and financial strategy on ChitX. What would you like to know?"

FORMATTING INSTRUCTIONS:
- Use **bold** for emphasis on numbers, dates, and status.
- Use # or ## for main sections in long responses.
- Use Markdown TABLES for listing multiple transactions or comparing pool details.
- Use `code blocks` for transaction hashes or wallet addresses.
- Use bullet points for steps and lists.

PLATFORM MANUAL & HOW-TO:
- Joining a Pool: Navigate to "Massive Pooling" (for large-scale AI simulation) or "Joint Pool" (for neighborhood-style pools). Click 'Join' on an active pool that matches your income level.
- Payouts: In every pool, a 'Monthly Payout' occurs. The AI Oracle selects the winner based on need (Priority Score) and reliability (Trust Score).
- Sending/Receiving Money: Use the "Payments" tab to contribute your monthly share or view received payouts. Transactions are AI-tracked but occur on-chain via your connected wallet.
- Emergency Fund: If you face a crisis (medical, job loss, etc.), go to the "Emergency Fund" page. Upload a document (bill/notice). Our AI verifies it in seconds. If approved, you get a payout from the 1.2M CTX safety pool.
- Improving Trust Score: Ensure your bank statement is uploaded (Onboarding), maintain a high CTX balance, and never miss a pool payment.
- CTX Tokens: Native protocol token. 1 CTX is the unit of collateral.

TONE:
Professional, encouraging, visionary, and concise.

{context_str}
"""

        messages = [{"role": "system", "content": system_prompt}]
        
        # Add history (limit last 6 messages to save tokens)
        for msg in data.history[-6:]:
            messages.append(msg)
            
        # Add current user message
        messages.append({"role": "user", "content": data.message})

        chat = groq_client.chat.completions.create(
            messages=messages,
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=1000,
        )

        response_text = chat.choices[0].message.content.strip()
        
        return {"ok": True, "response": response_text}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"ok": False, "response": "I apologize, but my connection to the ChitX Oracle mesh is temporarily unstable. How else can I assist you with the general platform mechanics?"}


@app.post("/ai/parse-statement")
async def parse_statement(file: UploadFile = File(...)):
    try:
        # 1. Read CSV
        contents = await file.read()
        csv_text = contents.decode("utf-8", errors="replace")

        print("-" * 60 + "\n")

        # 2. Parse into DataFrame
        df = pd.read_csv(io.StringIO(csv_text))
        print(f"SUMMARY CSV Shape: {df.shape[0]} rows x {df.shape[1]} columns")
        print(f"SUMMARY Columns: {list(df.columns)}")

        # 3. Process transactions
        txn_df = process_transactions(df)

        # 4. Extract features
        total_credits = float(txn_df[txn_df["type"] == "credit"]["amount"].sum())
        total_debits = float(txn_df[txn_df["type"] == "debit"]["amount"].sum())
        avg_balance = calc_avg_balance(txn_df)
        salary_c = calc_salary_consistency(txn_df)
        spending_s = calc_spending_stability(txn_df)
        payment_t = calc_payment_timeliness(txn_df)

        # Fallback income/expenses
        if total_credits == 0:
            total_credits = 60000
        if total_debits == 0:
            total_debits = 30000

        print(f"STATS Extracted -- Credits: RS {total_credits:,.2f}, Debits: RS {total_debits:,.2f}")
        print(f"STATS Avg Balance: RS {avg_balance:,.2f}")
        print(f"STATS Salary Consistency: {salary_c:.2f}, Spending Stability: {spending_s:.2f}, Payment Timeliness: {payment_t:.2f}")

        # 5. Get CIBIL score from Groq
        cibil_score = await estimate_cibil_from_groq(
            total_credits, total_debits, avg_balance, len(txn_df), salary_c
        )

        # 6. Build model input and predict Trust Score
        savings_ratio = np.clip((total_credits - total_debits) / total_credits, 0, 1) if total_credits > 0 else 0.0
        expense_ratio = np.clip(total_debits / total_credits, 0, 1) if total_credits > 0 else 1.0

        if trust_model is not None:
            input_data = pd.DataFrame([{
                "income": total_credits,
                "expenses": total_debits,
                "employment": 1,  # Default: Salaried
                "credit_score": cibil_score,
                "avg_balance": avg_balance,
                "salary_consistency": salary_c,
                "spending_stability": spending_s,
                "savings_ratio": savings_ratio,
                "expense_ratio": expense_ratio,
                "payment_timeliness": payment_t,
                "defaults": 0,  # First-time user = 0 defaults
                "participation_count": 0  # First-time user = 0 participation
            }])

            prediction = trust_model.predict(input_data)[0]
            trust_score = round(float(prediction), 2)
            trust_score = max(10, min(100, trust_score))  # Clamp to 10-100
            print(f"RESULT ML Model Predicted Trust Score: {trust_score}")
        else:
            # Fallback if model failed to load
            ratio = (total_credits / (total_credits + total_debits)) if (total_credits + total_debits) > 0 else 0
            trust_score = min(100, max(15, round(ratio * 70 + 15)))
            print(f"WARNING Using fallback trust score: {trust_score}")

        return {
            "income": round(total_credits, 2),
            "expenses": round(total_debits, 2),
            "trustScore": trust_score,
            "cibilScore": cibil_score,
            "analysis": f"AI parsed CSV ({len(txn_df)} transactions). CIBIL estimated at {cibil_score} via Groq. ML model predicted trust score: {trust_score}."
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to parse CSV: {str(e)}")


@app.post("/ai/calculate-score")
async def calculate_score(data: KYCData):
    try:
        ratio = (data.income / (data.income + data.expenses)) if (data.income + data.expenses) > 0 else 0
        base_score = ratio * 70

        bonuses = {"Salaried": 10, "Business": 15, "Student": 5}
        employment_bonus = bonuses.get(data.employment, 0)

        bank_bonus = 15 if data.hasBankStatement else 0

        final_score = base_score + employment_bonus + bank_bonus
        final_score = min(100, max(15, round(final_score)))

        return {
            "trustScore": final_score,
            "analysis": "Trust score calculated based on income/expense ratio and employment type."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================
# EMERGENCY DOCUMENT VERIFICATION (Groq-powered)
# ==============================
@app.post("/ai/verify-emergency")
async def verify_emergency(file: UploadFile = File(...)):
    """
    Accepts a document (text, PDF, image) and uses Groq to verify
    whether it represents a genuine emergency.
    """
    try:
        contents = await file.read()
        filename = file.filename or "unknown"
        content_type = file.content_type or ""

        print(f"\n[ALERT] Emergency doc received: {filename} ({content_type}, {len(contents)} bytes)")

        # Extract text content based on file type
        doc_text = ""

        if "text" in content_type or filename.endswith((".txt", ".csv")):
            doc_text = contents.decode("utf-8", errors="replace")

        elif "pdf" in content_type or filename.endswith(".pdf"):
            # Try to extract text from PDF
            try:
                import fitz  # PyMuPDF
                pdf = fitz.open(stream=contents, filetype="pdf")
                for page in pdf:
                    doc_text += page.get_text()
                pdf.close()
            except ImportError:
                # If PyMuPDF not installed, read raw bytes as text
                doc_text = contents.decode("utf-8", errors="replace")
            except Exception as e:
                doc_text = f"[PDF parsing failed: {e}]"

        elif "image" in content_type or filename.endswith((".jpg", ".jpeg", ".png", ".webp")):
            # For images, use Groq vision model
            import base64
            img_b64 = base64.b64encode(contents).decode("utf-8")
            
            mime = content_type if content_type else "image/jpeg"
            
            try:
                vision_resp = groq_client.chat.completions.create(
                    messages=[
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "Read and extract ALL text from this document image. Return the exact text you see. If it is a medical report, hospital bill, insurance claim, legal notice, or any emergency-related document, extract ALL details including dates, amounts, names, and diagnosis.",
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{mime};base64,{img_b64}",
                                    },
                                },
                            ],
                        }
                    ],
                    model="qwen/qwen3.6-27b",
                    temperature=0.1,
                    max_tokens=1500,
                )
                doc_text = vision_resp.choices[0].message.content.strip()
                print(f"[VISION] Vision OCR result: {doc_text[:300]}...")
            except Exception as ve:
                print(f"[WARNING] Vision model error: {ve}")
                doc_text = "[Image could not be processed]"
        else:
            doc_text = contents.decode("utf-8", errors="replace")

        if not doc_text or len(doc_text.strip()) < 10:
            return {"ok": False, "approved": False, "reason": "Document is empty or unreadable."}

        # Truncate very long docs
        if len(doc_text) > 4000:
            doc_text = doc_text[:4000] + "\n...[truncated]"

        # Send to Groq for emergency verification
        verification_prompt = f"""You are a chit fund emergency verification officer. A member has flagged an emergency payout request and uploaded a supporting document.

DOCUMENT CONTENT:
\"\"\"
{doc_text}
\"\"\"

YOUR TASK:
1. Determine if this document represents a GENUINE EMERGENCY that warrants priority payout from a chit fund. Valid emergencies include: medical emergencies, hospital bills, accident reports, natural disaster damage, legal notices with urgent deadlines, death certificates, insurance claims, job loss letters, urgent home repair invoices, etc.
2. Assess whether the document appears AUTHENTIC (not fabricated/fake). Check for: realistic details, proper formatting, consistent dates, specific names/amounts, institutional letterheads or references.

Respond ONLY with a valid JSON object with these fields:
- "approved": boolean (true if genuine emergency, false if not)
- "confidence": integer 0-100 (how confident you are)
- "category": string (e.g. "medical", "legal", "financial_hardship", "property_damage", "not_emergency", "suspicious")
- "reason": string (1-2 sentence explanation of your decision)
- "severity": string ("critical", "high", "moderate", "low", "none")

IMPORTANT: Be thorough but fair. Only reject if clearly fake or not an emergency. Give benefit of the doubt for borderline cases. Respond ONLY with the JSON object, no other text."""

        verify_resp = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": verification_prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=300,
        )

        raw_resp = verify_resp.choices[0].message.content.strip()
        print(f"[AI] Groq verification response: {raw_resp}")

        # Parse JSON
        import json, re
        if "```" in raw_resp:
            match = re.search(r'```(?:json)?\s*([\s\S]*?)```', raw_resp)
            raw_resp = match.group(1).strip() if match else raw_resp

        result = json.loads(raw_resp)

        return {
            "ok": True,
            "approved": result.get("approved", False),
            "confidence": result.get("confidence", 0),
            "category": result.get("category", "unknown"),
            "reason": result.get("reason", "No reason provided."),
            "severity": result.get("severity", "none"),
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"ok": False, "approved": False, "reason": f"Verification failed: {str(e)}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
