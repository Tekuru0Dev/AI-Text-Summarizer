"""
app.py
------
The main FastAPI application. This is the entry point for the backend server.

Run locally with:
    cd backend && uvicorn app:app --reload

In production (e.g., Render):
    uvicorn app:app --host 0.0.0.0 --port $PORT

Interview talking points:
    - FastAPI automatically generates API docs at /docs
    - We use a single POST /summarize endpoint (RESTful design)
    - The backend also serves the frontend as static files (single-process deployment)
    - CORS middleware allows cross-origin requests during local development
    - Form data + file upload in a single request is handled by multipart/form-data
"""

import os
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from pdf_utils import extract_text_from_pdf
from summarizer import summarize_text

# Create the FastAPI app instance
app = FastAPI(
    title="AI Text Summarizer",
    description="Summarize text or PDF files using Google Gemini AI",
    version="1.0.0",
)

# ─── CORS Middleware ────────────────────────────────────────────────────────────
# CORS = Cross-Origin Resource Sharing
# Browsers block requests from one origin (e.g., file:// or localhost:5500)
# to another (localhost:8000) unless the server explicitly allows it.
# Interview tip: CORS is a browser security feature, not a server-side restriction.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Allow any origin (fine for local dev; restrict in prod)
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Resolve the frontend directory ─────────────────────────────────────────────
# The frontend folder sits next to the backend folder in the project root
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


# ─── Serve the frontend ─────────────────────────────────────────────────────────
@app.get("/")
async def serve_frontend():
    """Serve the main frontend page."""
    return FileResponse(str(FRONTEND_DIR / "index.html"))


@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok", "message": "AI Summarizer API is running 🚀"}


# ─── Main Summarize Endpoint ────────────────────────────────────────────────────
@app.post("/summarize")
async def summarize(
    text: str = Form(default=""),          # Optional raw text input
    length: str = Form(default="medium"),  # Summary length: short | medium | detailed
    file: UploadFile = File(default=None), # Optional PDF file upload
):
    """
    Accepts either raw text OR a PDF file, then returns an AI-generated summary.

    Request (multipart/form-data):
        - text   (str, optional): Raw text to summarize
        - length (str, optional): "short", "medium", or "detailed"
        - file   (file, optional): A PDF file to summarize

    Response (JSON):
        - summary      (str): The generated summary
        - word_count   (int): Word count of the original input
        - source       (str): "text" or "pdf"
    """

    # ── Step 1: Get the input text ─────────────────────────────────────────────
    source = "text"

    if file and file.filename:
        # PDF upload path
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are supported. Please upload a .pdf file."
            )

        # Read raw bytes from the uploaded file
        file_bytes = await file.read()

        try:
            input_text = extract_text_from_pdf(file_bytes)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))

        source = "pdf"

    elif text and text.strip():
        # Plain text path
        input_text = text.strip()

    else:
        # Neither text nor file provided
        raise HTTPException(
            status_code=400,
            detail="Please provide either text or a PDF file to summarize."
        )

    # ── Step 2: Validate length parameter ─────────────────────────────────────
    valid_lengths = {"short", "medium", "detailed"}
    if length not in valid_lengths:
        length = "medium"

    # ── Step 3: Summarize using Gemini ─────────────────────────────────────────
    try:
        summary = summarize_text(input_text, length=length)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI summarization failed: {str(e)}"
        )

    # ── Step 4: Return the result ──────────────────────────────────────────────
    return JSONResponse(content={
        "summary": summary,
        "word_count": len(input_text.split()),
        "source": source,
    })


# ─── Mount frontend static files ────────────────────────────────────────────────
# This MUST come after all API route definitions so that API routes take priority.
# Requests to /style.css, /app.js, etc. will be served from the frontend directory.
if FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR)), name="frontend")
