"""
app/services/trust_scorer.py
ML model prediction and CIBIL estimation logic.
Extracted from app.py.
"""
import numpy as np
import pandas as pd
from ..core.model_loader import trust_model
from .groq_client import groq_client


async def estimate_cibil_from_groq(
    total_credits: float,
    total_debits: float,
    avg_balance: float,
    txn_count: int,
    salary_consistency: float,
) -> int:
    """Ask the Groq LLM to estimate a CIBIL-like credit score (300-900)."""
    try:
        savings_rate = (
            (total_credits - total_debits) / total_credits * 100
            if total_credits > 0
            else 0
        )
        prompt = f"""You are a financial credit scoring expert. Based on the following bank transaction summary, 
estimate a CIBIL credit score between 300 and 900. 

Financial Summary:
- Total Credits (Income): ₹{total_credits:,.2f}
- Total Debits (Expenses): ₹{total_debits:,.2f}
- Average Account Balance: ₹{avg_balance:,.2f}
- Total Transactions: {txn_count}
- Salary Consistency Score: {salary_consistency:.2f} (0=irregular, 1=very regular)
- Savings Rate: {savings_rate:.1f}%

IMPORTANT: Respond with ONLY a single integer number between 300 and 900. Nothing else."""

        chat_completion = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=10,
        )
        response_text = chat_completion.choices[0].message.content.strip()
        cibil_score = int("".join(filter(str.isdigit, response_text)))
        cibil_score = max(300, min(900, cibil_score))
        print(f"🧠 Groq estimated CIBIL Score: {cibil_score}")
        return cibil_score
    except Exception as e:
        print(f"⚠️ Groq CIBIL estimation failed: {e}. Using default 650.")
        return 650


def predict_trust_score(
    total_credits: float,
    total_debits: float,
    cibil_score: int,
    avg_balance: float,
    salary_consistency: float,
    spending_stability: float,
    payment_timeliness: float,
    txn_count: int,
) -> float:
    """Run ML pipeline to predict trust score. Falls back to heuristic if model unavailable."""
    savings_ratio = np.clip(
        (total_credits - total_debits) / total_credits, 0, 1
    ) if total_credits > 0 else 0.0
    expense_ratio = np.clip(total_debits / total_credits, 0, 1) if total_credits > 0 else 1.0

    if trust_model is not None:
        input_data = pd.DataFrame([{
            "income": total_credits,
            "expenses": total_debits,
            "employment": 1,  # Default: Salaried
            "credit_score": cibil_score,
            "avg_balance": avg_balance,
            "salary_consistency": salary_consistency,
            "spending_stability": spending_stability,
            "savings_ratio": savings_ratio,
            "expense_ratio": expense_ratio,
            "payment_timeliness": payment_timeliness,
            "defaults": 0,
            "participation_count": 0,
        }])
        prediction = trust_model.predict(input_data)[0]
        score = round(float(prediction), 2)
        score = max(10, min(100, score))
        print(f"RESULT ML Model Predicted Trust Score: {score}")
        return score
    else:
        ratio = (total_credits / (total_credits + total_debits)) if (total_credits + total_debits) > 0 else 0
        score = min(100, max(15, round(ratio * 70 + 15)))
        print(f"WARNING Using fallback trust score: {score}")
        return score
