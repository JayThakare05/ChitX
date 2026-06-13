"""
app/services/csv_parser.py
Bank statement CSV parsing helpers.
Extracted from app.py to keep route files clean.
"""
import pandas as pd
import numpy as np


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
        df["amount"] = 0.0
        df["type"] = "debit"
        for col in df.columns:
            lower_col = col.lower()
            if "credit" in lower_col or "deposit" in lower_col:
                credit_vals = pd.to_numeric(df[col], errors="coerce").fillna(0)
                df["amount"] = credit_vals + df.get("amount", pd.Series([0] * len(df)))
                df.loc[credit_vals > 0, "type"] = "credit"
            elif "debit" in lower_col or "withdrawal" in lower_col:
                debit_vals = pd.to_numeric(df[col], errors="coerce").fillna(0)
                df.loc[debit_vals > 0, "amount"] = debit_vals
                df.loc[debit_vals > 0, "type"] = "debit"

    date_col = next((col for col in df.columns if "date" in col.lower()), None)
    if date_col:
        df["parsed_date"] = pd.to_datetime(df[date_col], dayfirst=True, errors="coerce")
    else:
        df["parsed_date"] = pd.NaT

    return df


def calc_avg_balance(df: pd.DataFrame) -> float:
    """Average account balance across all transactions."""
    bal_col = next((col for col in df.columns if "balance" in col.lower()), None)
    if bal_col:
        return float(pd.to_numeric(df[bal_col], errors="coerce").mean())
    credits = df[df["type"] == "credit"]["amount"].sum()
    debits = df[df["type"] == "debit"]["amount"].sum()
    return max(float(credits - debits), 10000.0)


def calc_salary_consistency(df: pd.DataFrame) -> float:
    """0–1: how stable/regular the income credits are (lower CV = higher consistency)."""
    credits = df[df["type"] == "credit"]["amount"]
    if len(credits) < 2:
        return 0.5
    cv = credits.std() / credits.mean() if credits.mean() > 0 else 1.0
    return float(np.clip(1 - cv, 0.0, 1.0))


def calc_spending_stability(df: pd.DataFrame) -> float:
    """0–1: how stable/predictable spending is (lower variance in debits = higher stability)."""
    debits = df[df["type"] == "debit"]["amount"]
    if len(debits) < 2:
        return 0.5
    cv = debits.std() / debits.mean() if debits.mean() > 0 else 1.0
    return float(np.clip(1 - cv, 0.0, 1.0))


def calc_payment_timeliness(df: pd.DataFrame) -> float:
    """0–1: fraction of months that have at least one credit transaction."""
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
