"""
app/routes/emergency.py
Endpoint: /ai/verify-emergency
"""
import json
import re
from fastapi import APIRouter, UploadFile, File

from ..services.document_parser import extract_text_from_upload
from ..services.groq_client import groq_client

router = APIRouter()

VERIFICATION_PROMPT = """You are a chit fund emergency verification officer. A member has flagged an emergency payout request and uploaded a supporting document.

DOCUMENT CONTENT:
\"\"\"
{doc_text}
\"\"\"

YOUR TASK:
1. Determine if this document represents a GENUINE EMERGENCY that warrants priority payout from a chit fund. Valid emergencies include: medical emergencies, hospital bills, accident reports, natural disaster damage, legal notices with urgent deadlines, death certificates, insurance claims, job loss letters, urgent home repair invoices, etc.
2. Assess whether the document appears AUTHENTIC (not fabricated/fake). Check for: realistic details, proper formatting, consistent dates, specific names/amounts, institutional letterheads or references.

Respond ONLY with a valid JSON object with these fields:
- "approved": boolean (true if genuine emergency, false if not)
- "confidence": integer 0-100
- "category": string (e.g. "medical", "legal", "financial_hardship", "property_damage", "not_emergency", "suspicious")
- "reason": string (1-2 sentence explanation of your decision)
- "severity": string ("critical", "high", "moderate", "low", "none")

IMPORTANT: Be thorough but fair. Only reject if clearly fake or not an emergency. Give benefit of the doubt for borderline cases. Respond ONLY with the JSON object."""


@router.post("/ai/verify-emergency")
async def verify_emergency(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        filename = file.filename or "unknown"
        content_type = file.content_type or ""

        print(f"\n[ALERT] Emergency doc received: {filename} ({content_type}, {len(contents)} bytes)")

        doc_text = await extract_text_from_upload(contents, filename, content_type)

        if not doc_text or len(doc_text.strip()) < 10:
            return {"ok": False, "approved": False, "reason": "Document is empty or unreadable."}

        if len(doc_text) > 4000:
            doc_text = doc_text[:4000] + "\n...[truncated]"

        verify_resp = groq_client.chat.completions.create(
            messages=[{"role": "user", "content": VERIFICATION_PROMPT.format(doc_text=doc_text)}],
            model="llama-3.3-70b-versatile",
            temperature=0.1,
            max_tokens=300,
        )

        raw_resp = verify_resp.choices[0].message.content.strip()
        print(f"[AI] Groq verification response: {raw_resp}")

        if "```" in raw_resp:
            match = re.search(r"```(?:json)?\s*([\s\S]*?)```", raw_resp)
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
