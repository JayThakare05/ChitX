import os
import joblib
import pandas as pd
import numpy as np
import traceback
from fastapi import APIRouter, Request, HTTPException

router = APIRouter()

BASE = os.path.join(os.path.dirname(__file__), '..', '..', 'all_models')

# Load models safely (they are loaded once at startup)
trust_model    = joblib.load(os.path.join(BASE, 'trust_model_pipeline.pkl'))
risk_model     = joblib.load(os.path.join(BASE, 'chitx_best_model.pkl'))
risk_scaler    = joblib.load(os.path.join(BASE, 'chitx_scaler.pkl'))
risk_feat_cols = joblib.load(os.path.join(BASE, 'chitx_feature_cols.pkl'))

@router.post("/predict")
async def predict(request: Request):
    try:
        d = await request.json()

        # ── Raw inputs ──
        income                   = float(d['income'])
        expenses                 = float(d['expenses'])
        employment_str           = d['employment']
        credit_score             = float(d['credit_score'])
        avg_balance              = float(d['avg_balance'])
        salary_consistency       = float(d['salary_consistency'])
        spending_stability       = float(d['spending_stability'])
        payment_timeliness_raw   = float(d['payment_timeliness'])
        defaults                 = float(d['defaults'])
        participation_count      = float(d['participation_count'])
        contribution_consistency = float(d['contribution_consistency'])
        participation_frequency  = float(d['participation_frequency'])
        contribution_amount      = float(d['contribution_amount'])
        pool_size                = float(d['pool_size'])
        is_emergency             = d.get('is_emergency', False)

        # ── Derived ratios ──
        savings_ratio = float(np.clip((income - expenses) / income, 0, 1)) if income > 0 else 0.0
        expense_ratio = float(np.clip(expenses / income, 0, 1))            if income > 0 else 1.0
        savings_inr   = income - expenses

        # Employment one-hot
        emp_business = 1 if employment_str == 'Business Owner' else 0
        emp_salaried = 1 if employment_str == 'Salaried'       else 0
        emp_student  = 1 if employment_str == 'Student'        else 0
        employment_code = 0 if emp_student else (1 if emp_salaried else 2)

        # ── STEP 1: Trust score ──────────────────────────────
        trust_input = pd.DataFrame([{
            'income':             income,
            'expenses':           expenses,
            'employment':         employment_code,
            'credit_score':       credit_score,
            'avg_balance':        avg_balance,
            'salary_consistency': salary_consistency,
            'spending_stability': spending_stability,
            'savings_ratio':      savings_ratio,
            'expense_ratio':      expense_ratio,
            'payment_timeliness': payment_timeliness_raw,
            'defaults':           defaults,
            'participation_count':participation_count,
        }])
        trust_score = float(np.clip(trust_model.predict(trust_input)[0], 0, 100))

        # ── STEP 2: Risk / default_risk score ────────────────
        contrib_to_income  = contribution_amount / income if income > 0 else 0
        credit_trust_ratio = credit_score / trust_score   if trust_score > 0 else credit_score
        payment_timeliness_scaled = payment_timeliness_raw * 10

        risk_input = pd.DataFrame([{
            'ID':                   1,
            'Trust_Score':          trust_score,
            'Credit_Score':         credit_score,
            'Payment_Timeliness':   payment_timeliness_scaled,
            'Past_Defaults':        defaults,
            'Contribution_Amount_INR': contribution_amount,
            'Pool_Size':            pool_size,
            'Monthly_Income_INR':   income,
            'Monthly_Expenses_INR': expenses,
            'Expense_Ratio':        expense_ratio,
            'Savings_INR':          savings_inr,
            'Contrib_to_Income':    contrib_to_income,
            'Credit_Trust_Ratio':   credit_trust_ratio,
            'Emp_Business Owner':   emp_business,
            'Emp_Salaried':         emp_salaried,
            'Emp_Student':          emp_student,
        }])
        scaled_risk      = risk_scaler.transform(risk_input)
        risk_raw         = float(risk_model.predict(scaled_risk)[0])
        default_risk     = float(np.clip((risk_raw - (-16)) / (77 - (-16)), 0.0, 1.0))

        # ── STEP 3: Emergency score ──────────────────────────
        liquidity_ratio = avg_balance / income if income > 0 else 0
        
        if is_emergency:
            emergency_score = 1.0
        else:
            emergency_score = (
                0.5 * (expenses / income) +
                0.3 * (1 - savings_ratio) +
                0.2 * (1 - np.clip(liquidity_ratio, 0, 1))
            )
            emergency_score = float(np.clip(emergency_score, 0, 1))

        # ── STEP 4: Priority score ───────────────────────────
        expense_pressure = float(np.clip(expenses / income, 0, 1))

        priority_score = (
            0.20 * (trust_score / 100) +
            0.15 * (1 - default_risk) +
            0.15 * contribution_consistency +
            0.10 * (participation_frequency / 10) +
            0.15 * (1 - savings_ratio) +
            0.10 * expense_pressure +
            0.15 * emergency_score
        )
        priority_score = float(np.clip(priority_score, 0, 1))

        # Token allocation (proportional)
        chit_value = contribution_amount * pool_size
        tokens = round(priority_score * chit_value * 0.25)

        # Tier
        if priority_score >= 0.70:
            tier, tier_label = 1, 'Tier 1 — Top Priority'
        elif priority_score >= 0.55:
            tier, tier_label = 2, 'Tier 2 — Standard'
        else:
            tier, tier_label = 3, 'Tier 3 — Lower Priority'

        return {
            'ok': True,
            'trust_score':           round(trust_score, 2),
            'default_risk':          round(default_risk, 4),
            'emergency_score':       round(emergency_score, 4),
            'priority_score':        round(priority_score, 4),
            'priority_pct':          round(priority_score * 100, 1),
            'tokens':                tokens,
            'tier':                  tier,
            'tier_label':            tier_label,
            'breakdown': {
                'trust_contribution':         round(0.20 * (trust_score / 100), 4),
                'default_risk_contribution':  round(0.15 * (1 - default_risk), 4),
                'contrib_consistency':        round(0.15 * contribution_consistency, 4),
                'participation_freq':         round(0.10 * (participation_frequency / 10), 4),
                'savings_pressure':           round(0.15 * (1 - savings_ratio), 4),
                'expense_pressure':           round(0.10 * expense_pressure, 4),
                'emergency':                  round(0.15 * emergency_score, 4),
            },
            'computed': {
                'savings_ratio':   round(savings_ratio, 4),
                'expense_ratio':   round(expense_ratio, 4),
                'savings_inr':     round(savings_inr, 0),
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail={'error': str(e), 'trace': traceback.format_exc()})
