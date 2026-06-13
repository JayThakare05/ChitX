"""
app/services/groq_client.py
Initialises and exposes the shared Groq SDK client.
Import `groq_client` from here — never initialise Groq in route files.
"""
from groq import Groq
from ..core.config import GROQ_API_KEY

groq_client = Groq(api_key=GROQ_API_KEY)
