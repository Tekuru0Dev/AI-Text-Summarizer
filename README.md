# 🧠 SummarizeAI — AI Text & PDF Summarizer

A clean, full-stack AI summarizer built with **FastAPI + Google Gemini + Vanilla JS**.
Designed to be **learnable in a day** and **explainable in an interview**.

---

## 🚀 Quick Start

### 1. Get a Gemini API Key (Free)

Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and create a free API key.

### 2. Set Up the Backend

```bash
# Navigate to the backend folder
cd backend

# Install dependencies
pip install -r requirements.txt

# Create your .env file
copy .env.example .env
# Then open .env and paste your GEMINI_API_KEY

# Start the server
uvicorn app:app --reload
```

The API will be running at **http://localhost:8000**
Interactive API docs: **http://localhost:8000/docs**

### 3. Open the Frontend

Simply open `frontend/index.html` in your browser. No build step needed!

---

## 📁 Project Structure

```
AITextSummarizer/
├── backend/
│   ├── app.py          ← FastAPI app (main entry point)
│   ├── summarizer.py   ← Gemini AI integration
│   ├── pdf_utils.py    ← PDF text extraction (PyMuPDF)
│   ├── requirements.txt
│   └── .env            ← Your API key goes here (never commit this!)
├── frontend/
│   ├── index.html      ← Single-page UI
│   ├── style.css       ← Premium dark-mode styles
│   └── app.js          ← Fetch API calls + UI logic
└── README.md
```

---

## 🏗️ Architecture

```
Browser (HTML/CSS/JS)
    │
    │  POST /summarize  (multipart/form-data)
    │  Body: { text?, file?, length }
    ▼
FastAPI Backend (app.py)
    │
    ├── If PDF:   pdf_utils.py → extract text with PyMuPDF
    ├── If Text:  use directly
    ├── Truncate to 20,000 chars
    │
    └── summarizer.py → Gemini API → Return JSON summary
```

---

## 🎤 Interview Q&A

### "Walk me through the architecture."

> "It's a simple client-server architecture. The frontend is vanilla HTML/JS that collects user input — either typed text or an uploaded PDF. It sends a `POST` request to a FastAPI backend using the Fetch API with FormData. On the backend, if it's a PDF, I extract the text using PyMuPDF before sending it to the Gemini API. Gemini returns a summary, which I send back to the frontend as JSON."

---

### "Why FastAPI over Flask or Django?"

> "FastAPI gives me async support out of the box, automatic Swagger docs at `/docs`, and Python type hints for validation — all with very little boilerplate. For a simple REST API like this, it's perfect. Flask is also fine, but FastAPI is more modern and performant."

---

### "How does the PDF parsing work?"

> "When a user uploads a PDF, the browser sends it as binary data in a multipart HTTP request. On the server, FastAPI reads the raw bytes using `await file.read()`. I then pass those bytes to PyMuPDF's `fitz.open(stream=..., filetype='pdf')`, which opens the PDF from memory without writing to disk. I iterate over each page, call `page.get_text()`, and join all the text together."

---

### "How do you handle the AI integration?"

> "I use the `google-generativeai` Python SDK. The API key is stored in a `.env` file and loaded with `python-dotenv` — never hardcoded. I craft a structured prompt with a role ('You are an expert summarizer'), a task, and constraints. I also truncate input text to avoid exceeding token limits. The model returns a response object and I return `response.text`."

---

### "What is CORS and why do you need it?"

> "CORS stands for Cross-Origin Resource Sharing. Browsers block JavaScript from making requests to a different origin (domain + port) than the page it's on — it's a security feature. My frontend runs on one origin and the backend on `localhost:8000`, so the backend must explicitly allow cross-origin requests. I do this with FastAPI's `CORSMiddleware`, which adds the right response headers."

---

### "What would you add if you had more time?"

> "A few things: user authentication so people can save their summaries, a database (PostgreSQL + SQLAlchemy) to store history, streaming responses so the summary appears word-by-word like ChatGPT, and support for scanned PDFs using OCR (like Tesseract). I'd also add rate limiting to protect the API key."

---

## ⚙️ API Reference

### `GET /`
Health check.

**Response:** `{ "status": "ok", "message": "..." }`

---

### `POST /summarize`
Summarize text or a PDF.

**Request** (`multipart/form-data`):
| Field  | Type   | Required | Description                            |
|--------|--------|----------|----------------------------------------|
| text   | string | No*      | Raw text to summarize                  |
| file   | file   | No*      | PDF file to summarize                  |
| length | string | No       | `short`, `medium`, or `detailed`       |

*Either `text` or `file` must be provided.

**Response** (`application/json`):
```json
{
  "summary": "The text discusses...",
  "word_count": 1234,
  "source": "text"
}
```

---

## 🔒 Security Notes

- **Never commit your `.env` file** — it's listed in `.gitignore`
- In production, restrict CORS `allow_origins` to your actual domain
- Add rate limiting (e.g., `slowapi`) to prevent API key abuse
