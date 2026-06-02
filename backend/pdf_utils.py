"""
pdf_utils.py
------------
Handles extracting plain text from uploaded PDF files.

Uses PyMuPDF (imported as 'fitz') — a fast, reliable PDF parsing library.

Interview talking point:
    PDFs are binary blobs. We can't send them directly to an LLM.
    We must first extract the raw text, then pass that text to the AI.
"""

import fitz  # PyMuPDF


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Given the raw bytes of a PDF file, return all extracted text as a string.

    Args:
        file_bytes: The binary content of the uploaded PDF.

    Returns:
        A single string containing all text extracted from the PDF.

    Raises:
        ValueError: If the PDF has no extractable text (e.g., scanned image-only PDF).
    """
    # Open the PDF from memory (no need to save to disk)
    doc = fitz.open(stream=file_bytes, filetype="pdf")

    all_text = []

    # Iterate over every page and extract text
    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text()  # Extract plain text from this page
        all_text.append(text)

    doc.close()

    # Join all pages with a newline separator
    full_text = "\n".join(all_text).strip()

    if not full_text:
        raise ValueError(
            "No extractable text found in this PDF. "
            "It may be a scanned image-based PDF."
        )

    return full_text
