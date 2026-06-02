"""
summarizer.py
-------------
Handles communication with the Google Gemini API to generate summaries.

Interview talking point:
    This is the AI layer. We take plain text, craft a prompt that gives
    the model clear instructions, then return the model's response.
    Prompt engineering is a key skill — the quality of your prompt
    directly impacts the quality of the summary.
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure the Gemini client with our API key
# Never hardcode keys — always load from environment variables
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Use Gemini 2.0 Flash — fast, free-tier friendly, and great for summarization
model = genai.GenerativeModel("gemini-2.0-flash")


def summarize_text(text: str, length: str = "medium") -> str:
    """
    Send text to Gemini and return a summary.

    Args:
        text:   The raw text to summarize.
        length: Summary length preference — "short", "medium", or "detailed".

    Returns:
        The summary as a string.

    Raises:
        Exception: If the Gemini API call fails.
    """
    # Map length preference to descriptive instructions
    length_instructions = {
        "short":    "in 2-3 sentences",
        "medium":   "in a well-structured paragraph (5-8 sentences)",
        "detailed": "in multiple paragraphs with key points and takeaways",
    }
    length_instruction = length_instructions.get(length, length_instructions["medium"])

    # Truncate text to avoid exceeding token limits (~20,000 chars ≈ ~5,000 tokens)
    MAX_CHARS = 20_000
    if len(text) > MAX_CHARS:
        text = text[:MAX_CHARS] + "\n\n[Content truncated for length...]"

    # Craft a clear, structured prompt
    # Interview tip: A good prompt has a role, task, and constraints
    prompt = f"""You are an expert summarizer. Your job is to read the following text and produce a clear, accurate, and concise summary.

Instructions:
- Summarize {length_instruction}
- Capture the main ideas, key arguments, and important details
- Use plain language that is easy to understand
- Do not add information that is not in the original text

Text to summarize:
\"\"\"
{text}
\"\"\"

Summary:"""

    response = model.generate_content(prompt)
    return response.text.strip()
