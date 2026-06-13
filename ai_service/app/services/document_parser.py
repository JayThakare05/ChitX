"""
app/services/document_parser.py
PDF, image, and text document extraction utilities.
Extracted from the /ai/verify-emergency endpoint in app.py.
"""
import base64
from .groq_client import groq_client


async def extract_text_from_upload(contents: bytes, filename: str, content_type: str) -> str:
    """
    Extract readable text from an uploaded file.
    Supports: plain text, CSV, PDF (via PyMuPDF), and images (via Groq vision).
    Returns extracted text string.
    """
    doc_text = ""

    if "text" in content_type or filename.endswith((".txt", ".csv")):
        doc_text = contents.decode("utf-8", errors="replace")

    elif "pdf" in content_type or filename.endswith(".pdf"):
        try:
            import fitz  # PyMuPDF
            pdf = fitz.open(stream=contents, filetype="pdf")
            for page in pdf:
                doc_text += page.get_text()
            pdf.close()
        except ImportError:
            doc_text = contents.decode("utf-8", errors="replace")
        except Exception as e:
            doc_text = f"[PDF parsing failed: {e}]"

    elif "image" in content_type or filename.endswith((".jpg", ".jpeg", ".png", ".webp")):
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
                                "text": (
                                    "Read and extract ALL text from this document image. "
                                    "Return the exact text you see. If it is a medical report, "
                                    "hospital bill, insurance claim, legal notice, or any "
                                    "emergency-related document, extract ALL details including "
                                    "dates, amounts, names, and diagnosis."
                                ),
                            },
                            {
                                "type": "image_url",
                                "image_url": {"url": f"data:{mime};base64,{img_b64}"},
                            },
                        ],
                    }
                ],
                model="llama-3.2-90b-vision-preview",
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

    return doc_text
