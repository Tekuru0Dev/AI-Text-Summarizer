/**
 * app.js — Frontend logic for SummarizeAI
 *
 * Responsibilities:
 *  1. Tab switching (Text vs PDF mode)
 *  2. Character counter for the textarea
 *  3. Drag-and-drop + click-to-upload for PDF files
 *  4. Summary length selection
 *  5. Form validation + fetch() API call to backend
 *  6. Render result + copy to clipboard
 *
 * Interview talking point:
 *  We use the native Fetch API (no jQuery, no Axios) to make HTTP requests.
 *  FormData lets us send both text fields AND file uploads in one request.
 */

// ── API Configuration ─────────────────────────────────────────────────────────
// Change this if your backend runs on a different port
// Empty string = same origin. Works in local dev AND production.
const API_BASE_URL = "";

// ── State ─────────────────────────────────────────────────────────────────────
let currentTab = "text";       // "text" | "pdf"
let selectedLength = "medium"; // "short" | "medium" | "detailed"
let selectedFile = null;       // The File object from file input or drag-and-drop

// ── DOM References ────────────────────────────────────────────────────────────
const textInput     = document.getElementById("text-input");
const charCount     = document.getElementById("char-count");
const errorMsg      = document.getElementById("error-msg");
const outputCard    = document.getElementById("output-card");
const summaryOutput = document.getElementById("summary-output");
const outputMeta    = document.getElementById("output-meta");
const summarizeBtn  = document.getElementById("summarize-btn");
const btnText       = summarizeBtn.querySelector(".btn-text");
const btnSpinner    = summarizeBtn.querySelector(".btn-spinner");
const btnArrow      = summarizeBtn.querySelector(".btn-arrow");


// ── Character Counter ─────────────────────────────────────────────────────────
textInput.addEventListener("input", () => {
  charCount.textContent = textInput.value.length.toLocaleString();
});


// ── Tab Switching ─────────────────────────────────────────────────────────────
/**
 * Switch between the "Paste Text" and "Upload PDF" tabs.
 * @param {"text"|"pdf"} tab - Which tab to activate
 */
function switchTab(tab) {
  currentTab = tab;

  // Update tab button active state
  document.getElementById("tab-text").classList.toggle("active", tab === "text");
  document.getElementById("tab-pdf").classList.toggle("active", tab === "pdf");

  // Update tab button aria attributes (accessibility)
  document.getElementById("tab-text").setAttribute("aria-selected", tab === "text");
  document.getElementById("tab-pdf").setAttribute("aria-selected", tab === "pdf");

  // Show the correct panel
  document.getElementById("panel-text").classList.toggle("active", tab === "text");
  document.getElementById("panel-pdf").classList.toggle("active", tab === "pdf");

  // Clear any errors when switching
  hideError();
}


// ── Length Selection ──────────────────────────────────────────────────────────
/**
 * Set the desired summary length and update the UI.
 * @param {"short"|"medium"|"detailed"} length
 */
function setLength(length) {
  selectedLength = length;
  document.querySelectorAll(".len-btn").forEach(btn => btn.classList.remove("active"));
  document.getElementById(`len-${length}`).classList.add("active");
}


// ── Drag and Drop ─────────────────────────────────────────────────────────────
function handleDragOver(event) {
  event.preventDefault(); // Required to allow drop
  event.currentTarget.classList.add("drag-over");
}

function handleDragLeave(event) {
  event.currentTarget.classList.remove("drag-over");
}

function handleDrop(event) {
  event.preventDefault();
  event.currentTarget.classList.remove("drag-over");

  const file = event.dataTransfer.files[0];
  if (file) {
    setSelectedFile(file);
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    setSelectedFile(file);
  }
}

/**
 * Store and display the selected PDF file info.
 * @param {File} file
 */
function setSelectedFile(file) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    showError("Please select a valid PDF file.");
    return;
  }

  selectedFile = file;
  hideError();

  // Show the file info bar
  document.getElementById("file-name").textContent = file.name;
  document.getElementById("file-size").textContent = formatFileSize(file.size);
  document.getElementById("file-selected").classList.remove("hidden");
}

function removeFile() {
  selectedFile = null;
  document.getElementById("pdf-file-input").value = "";
  document.getElementById("file-selected").classList.add("hidden");
}

/**
 * Format bytes into a human-readable string (e.g., "2.3 MB")
 */
function formatFileSize(bytes) {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}


// ── Main Summarize Function ───────────────────────────────────────────────────
/**
 * Called when the user clicks the "Summarize" button.
 * Validates input, builds a FormData request, calls the backend, and renders output.
 *
 * Interview talking point:
 *   FormData automatically sets the Content-Type to multipart/form-data,
 *   which is needed for file uploads. With fetch(), we just pass the FormData
 *   directly — no need to set headers manually.
 */
async function handleSummarize() {
  hideError();

  // ── Validation ───────────────────────────────────────────────────
  if (currentTab === "text" && !textInput.value.trim()) {
    showError("Please paste some text before summarizing.");
    return;
  }

  if (currentTab === "pdf" && !selectedFile) {
    showError("Please upload a PDF file before summarizing.");
    return;
  }

  // ── Build FormData ────────────────────────────────────────────────
  // FormData allows mixing text fields and binary files in one request
  const formData = new FormData();
  formData.append("length", selectedLength);

  if (currentTab === "text") {
    formData.append("text", textInput.value.trim());
  } else {
    formData.append("file", selectedFile);
  }

  // ── Show Loading State ────────────────────────────────────────────
  setLoading(true);

  try {
    // ── Fetch API Call ──────────────────────────────────────────────
    const response = await fetch(`${API_BASE_URL}/summarize`, {
      method: "POST",
      body: formData,
      // Note: Do NOT set Content-Type header — fetch sets it automatically
      // with the correct multipart boundary when using FormData
    });

    // ── Handle HTTP Errors ──────────────────────────────────────────
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }

    // ── Parse Response ──────────────────────────────────────────────
    const data = await response.json();
    // data = { summary: "...", word_count: 420, source: "text" | "pdf" }

    renderOutput(data);

  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("fetch")) {
      showError(
        "Cannot connect to the backend. Make sure the server is running:\n" +
        "cd backend && uvicorn app:app --reload"
      );
    } else {
      showError(err.message);
    }
  } finally {
    setLoading(false);
  }
}


// ── Render Output ─────────────────────────────────────────────────────────────
/**
 * Display the summary result.
 * @param {{ summary: string, word_count: number, source: string }} data
 */
function renderOutput(data) {
  const lengthLabels = { short: "Short", medium: "Medium", detailed: "Detailed" };

  // Populate meta info
  outputMeta.textContent =
    `${lengthLabels[selectedLength]} summary · ` +
    `Source: ${data.source.toUpperCase()} · ` +
    `${data.word_count.toLocaleString()} words processed`;

  // Render the summary text
  summaryOutput.textContent = data.summary;

  // Show the output card (hidden by default)
  outputCard.classList.remove("hidden");

  // Smooth scroll to the result
  outputCard.scrollIntoView({ behavior: "smooth", block: "start" });
}


// ── Copy to Clipboard ─────────────────────────────────────────────────────────
async function copySummary() {
  const text = summaryOutput.textContent;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);

    // Visual feedback
    const copyBtn = document.getElementById("copy-btn");
    const copyText = document.getElementById("copy-text");
    copyBtn.classList.add("copied");
    copyText.textContent = "Copied!";

    setTimeout(() => {
      copyBtn.classList.remove("copied");
      copyText.textContent = "Copy";
    }, 2000);

  } catch {
    // Fallback for browsers that don't support Clipboard API
    showError("Could not copy to clipboard. Please select the text manually.");
  }
}


// ── UI Helpers ────────────────────────────────────────────────────────────────
function setLoading(isLoading) {
  summarizeBtn.disabled = isLoading;
  btnText.classList.toggle("hidden", isLoading);
  btnArrow.classList.toggle("hidden", isLoading);
  btnSpinner.classList.toggle("hidden", !isLoading);
}

function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove("hidden");
}

function hideError() {
  errorMsg.classList.add("hidden");
  errorMsg.textContent = "";
}
