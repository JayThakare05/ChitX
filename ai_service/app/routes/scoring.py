"""
app/routes/scoring.py
Endpoints: /ai/parse-statement, /ai/calculate-score
"""
import io
import pandas as pd
from fastapi import APIRouter, HTTPException, UploadFile, File

from ..schemas.models import KYCData
from ..services.csv_parser import (
    process_transactions, calc_avg_balance,
    calc_salary_consistency, calc_spending_stability, calc_payment_timeliness,
)
from ..services.trust_scorer import estimate_cibil_from_groq, predict_trust_score

router = APIRouter()


@router.post("/ai/parse-statement")
async def parse_statement(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        csv_text = contents.decode("utf-8", errors="replace")

        print("-" * 60 + "\n")
        df = pd.read_csv(io.StringIO(csv_text))
        print(f"SUMMARY CSV Shape: {df.shape[0]} rows x {df.shape[1]} columns")
        print(f"SUMMARY Columns: {list(df.columns)}")

        txn_df = process_transactions(df)

        total_credits = float(txn_df[txn_df["type"] == "credit"]["amount"].sum())
        total_debits = float(txn_df[txn_df["type"] == "debit"]["amount"].sum())
        avg_balance = calc_avg_balance(txn_df)
        salary_c = calc_salary_consistency(txn_df)
        spending_s = calc_spending_stability(txn_df)
        payment_t = calc_payment_timeliness(txn_df)

        # Fallback values to avoid zero-division
        if total_credits == 0:
            total_credits = 60000
        if total_debits == 0:
            total_debits = 30000

        print(f"STATS Extracted -- Credits: RS {total_credits:,.2f}, Debits: RS {total_debits:,.2f}")
        print(f"STATS Avg Balance: RS {avg_balance:,.2f}")
        print(f"STATS Salary Consistency: {salary_c:.2f}, Spending Stability: {spending_s:.2f}, Payment Timeliness: {payment_t:.2f}")

        cibil_score = await estimate_cibil_from_groq(
            total_credits, total_debits, avg_balance, len(txn_df), salary_c
        )

        trust_score = predict_trust_score(
            total_credits, total_debits, cibil_score,
            avg_balance, salary_c, spending_s, payment_t, len(txn_df),
        )

        return {
            "income": round(total_credits, 2),
            "expenses": round(total_debits, 2),
            "trustScore": trust_score,
            "cibilScore": cibil_score,
            "analysis": f"AI parsed CSV ({len(txn_df)} transactions). CIBIL estimated at {cibil_score} via Groq. ML model predicted trust score: {trust_score}.",
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to parse CSV: {str(e)}")


@router.post("/ai/calculate-score")
async def calculate_score(data: KYCData):
    try:
        ratio = (data.income / (data.income + data.expenses)) if (data.income + data.expenses) > 0 else 0
        base_score = ratio * 70
        bonuses = {"Salaried": 10, "Business": 15, "Student": 5}
        employment_bonus = bonuses.get(data.employment, 0)
        bank_bonus = 15 if data.hasBankStatement else 0
        final_score = min(100, max(15, round(base_score + employment_bonus + bank_bonus)))
        return {
            "trustScore": final_score,
            "analysis": "Trust score calculated based on income/expense ratio and employment type.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
