"use strict";

// ── STATE ──
let uploadedText = "";
let uploadedName = "";
let difficulty = "medium";
let questionCount = 5;
let isStreaming = false;
let resultText = "";

// ── ELEMENTS ──
const fileInput     = document.getElementById("fileInput");
const textInput     = document.getElementById("textInput");
const uploadZone    = document.getElementById("uploadZone");
const filePreview   = document.getElementById("filePreview");
const fileName      = document.getElementById("fileName");
const fileMeta      = document.getElementById("fileMeta");
const fileBadge     = document.getElementById("fileBadge");
const clearFile     = document.getElementById("clearFile");
const charCount     = document.getElementById("charCount");
const diffCtrl      = document.getElementById("diffCtrl");
const diffDesc      = document.getElementById("diffDesc");
const qCountRow     = document.getElementById("qCountRow");
const numVal        = document.getElementById("numVal");
const resultEmpty   = document.getElementById("resultEmpty");
const resultContent = document.getElementById("resultContent");
const resultTitle   = document.getElementById("resultTitle");
const resultBadge   = document.getElementById("resultBadge");
const resultBody    = document.getElementById("resultBody");
const copyBtn       = document.getElementById("copyBtn");
const downloadBtn   = document.getElementById("downloadBtn");
const toast         = document.getElementById("toast");

const diffDescMap = {
  easy:   "Simple language — suitable for beginners with no prior knowledge.",
  medium: "Balanced depth — suitable for students with some foundational knowledge.",
  hard:   "Technical depth — suitable for advanced students and complex material."
};

const actionMeta = {
  summary:     { icon: "📋", label: "Summary" },
  mcq:         { icon: "❓", label: "Quiz — MCQs" },
  shortanswer: { icon: "✏️", label: "Short-Answer Questions" },
  simplify:    { icon: "💡", label: "Simplified Explanation" }
};

// ── FILE UPLOAD ──
fileInput.addEventListener("change", e => {
  const file = e.target.files[0];
  if (file) handleFile(file);
});

uploadZone.addEventListener("dragover", e => {
  e.preventDefault();
  uploadZone.classList.add("drag-over");
});
uploadZone.addEventListener("dragleave", () => uploadZone.classList.remove("drag-over"));
uploadZone.addEventListener("drop", e => {
  e.preventDefault();
  uploadZone.classList.remove("drag-over");
  const file = e.dataTransfer.files[0];
  if (file) handleFile(file);
});

async function handleFile(file) {
  const ext = file.name.split(".").pop().toLowerCase();
  const allowed = ["pdf", "txt", "md"];
  if (!allowed.includes(ext)) {
    showToast("Unsupported file type. Use PDF, TXT, or MD.");
    return;
  }

  const formData = new FormData();
  formData.append("file", file);
  showToast("Uploading & extracting text…");

  try {
    const res = await fetch("/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (data.error) { showToast(data.error); return; }

    uploadedText = data.text;
    uploadedName = data.filename;
    textInput.value = "";
    updateCharCount(data.chars);

    uploadZone.style.display = "none";
    filePreview.style.display = "flex";
    fileName.textContent = data.filename;
    fileMeta.textContent = data.chars.toLocaleString() + " characters extracted";
    fileBadge.textContent = ext.toUpperCase().slice(0, 3);
    showToast("File ready ✓");
  } catch(err) {
    showToast("Upload failed. Please try again.");
  }
}

clearFile.addEventListener("click", () => {
  uploadedText = "";
  uploadedName = "";
  fileInput.value = "";
  uploadZone.style.display = "";
  filePreview.style.display = "none";
  updateCharCount(0);
});

textInput.addEventListener("input", () => {
  updateCharCount(textInput.value.length);
});

function updateCharCount(n) {
  charCount.textContent = n.toLocaleString() + " characters";
}

// ── DIFFICULTY ──
diffCtrl.querySelectorAll(".seg-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    diffCtrl.querySelectorAll(".seg-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    difficulty = btn.dataset.val;
    diffDesc.textContent = diffDescMap[difficulty];
  });
});

// ── QUESTION COUNT ──
document.getElementById("numDown").addEventListener("click", () => {
  if (questionCount > 2) { questionCount--; numVal.textContent = questionCount; }
});
document.getElementById("numUp").addEventListener("click", () => {
  if (questionCount < 15) { questionCount++; numVal.textContent = questionCount; }
});

// ── ACTIONS ──
document.querySelectorAll(".action-btn").forEach(btn => {
  btn.addEventListener("click", () => handleAction(btn.dataset.action));
});

async function handleAction(action) {
  if (isStreaming) return;

  const content = uploadedText || textInput.value.trim();
  if (!content) { showToast("Please upload a file or paste some text first."); return; }
  if (content.length < 30) { showToast("Content too short — please provide more text."); return; }

  // Show question count only for quiz actions
  qCountRow.style.display = (action === "mcq" || action === "shortanswer") ? "flex" : "none";

  isStreaming = true;
  resultText = "";

  // UI: show spinner
  const spin = document.getElementById(`spin-${action}`);
  const actionBtn = document.querySelector(`[data-action="${action}"]`);
  spin.classList.add("spinning");
  actionBtn.classList.add("loading");

  // UI: show result panel
  resultEmpty.style.display = "none";
  resultContent.style.display = "block";
  const meta = actionMeta[action];
  resultTitle.textContent = `${meta.icon} ${meta.label}`;
  resultBadge.textContent = difficulty;
  resultBody.textContent = "";
  resultBody.innerHTML = '<span class="cursor"></span>';

  try {
    const res = await fetch("/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, content, difficulty, count: questionCount })
    });

    if (!res.ok) {
      const err = await res.json();
      showToast(err.error || "Something went wrong.");
      resetUI(action);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6);
        if (raw === "[DONE]") break;
        try {
          const parsed = JSON.parse(raw);
          if (parsed.text) {
            resultText += parsed.text;
            resultBody.textContent = resultText;
            resultBody.innerHTML += '<span class="cursor"></span>';
            resultBody.scrollTop = resultBody.scrollHeight;
          }
        } catch(e) {}
      }
    }

    resultBody.textContent = resultText;

  } catch(err) {
    showToast("Network error. Is the server running?");
  }

  resetUI(action);
}

function resetUI(action) {
  const spin = document.getElementById(`spin-${action}`);
  const actionBtn = document.querySelector(`[data-action="${action}"]`);
  spin.classList.remove("spinning");
  actionBtn.classList.remove("loading");
  isStreaming = false;
}

// ── COPY ──
copyBtn.addEventListener("click", () => {
  if (!resultText) return;
  navigator.clipboard.writeText(resultText).then(() => {
    copyBtn.textContent = "Copied!";
    setTimeout(() => copyBtn.textContent = "Copy", 1800);
  });
});

// ── DOWNLOAD ──
downloadBtn.addEventListener("click", () => {
  if (!resultText) return;
  const title = resultTitle.textContent.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");
  const blob = new Blob([resultText], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${title}_${difficulty}.txt`;
  a.click();
});

// ── TOAST ──
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}
