# 🎓 AI Teaching Assistant

A full-stack web app that helps teachers generate learning materials from any text or PDF — powered by Claude AI.

---

## ✨ Features

| Feature | Description |
|--------|-------------|
| 📄 Upload PDF | Extracts text automatically with `pdfplumber` |
| 📝 Paste Text | Works with any `.txt` or `.md` file too |
| 📋 Generate Summary | Key points, concepts, and takeaways |
| ❓ Create Quiz (MCQ) | Multiple-choice questions with answer explanations |
| ✏️ Short-Answer Questions | Open-ended questions with model answers |
| 💡 Simplify Topic | Plain-language explanation with analogies |
| 🎚️ Difficulty Control | Easy / Medium / Hard — shapes AI output pedagogically |
| 🔢 Question Count | Choose 2–15 questions for quiz modes |
| 📋 Copy / 💾 Download | Export any result instantly |
| ⚡ Streaming | Live token-by-token output — no waiting |

---

## 🚀 Quick Start

### 1. Clone / download the project

```bash
cd ai-teaching-assistant
```

### 2. Create a virtual environment

```bash
python -m venv venv

# Mac/Linux:
source venv/bin/activate

# Windows:
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set your Anthropic API key

```bash
# Mac/Linux:
export ANTHROPIC_API_KEY=sk-ant-...

# Windows (Command Prompt):
set ANTHROPIC_API_KEY=sk-ant-...

# Windows (PowerShell):
$env:ANTHROPIC_API_KEY="sk-ant-..."
```

> Get your API key at https://console.anthropic.com

### 5. Run the app

```bash
python app.py
```

### 6. Open in browser

```
http://localhost:5000
```

---

## 📁 Project Structure

```
ai-teaching-assistant/
├── app.py                  ← Flask backend (routes, PDF extraction, AI streaming)
├── requirements.txt        ← Python dependencies
├── .env.example            ← Environment variable template
├── templates/
│   └── index.html          ← Main HTML page
├── static/
│   ├── css/
│   │   └── style.css       ← All styles
│   └── js/
│       └── app.js          ← Frontend logic (upload, streaming, UI)
└── uploads/                ← Temporary file storage (auto-created, auto-cleaned)
```

---

## 🛠️ How It Works

1. **Upload** — User uploads a PDF or pastes text
2. **Extract** — `pdfplumber` pulls clean text from PDFs server-side
3. **Configure** — User picks difficulty + action + question count
4. **Generate** — Flask sends a crafted prompt to Claude via the Anthropic API
5. **Stream** — Server-Sent Events (SSE) stream tokens live to the browser
6. **Export** — User copies or downloads the result as `.txt`

---

## 🔧 Customization

### Change the AI model
In `app.py`, find:
```python
model="claude-opus-4-5"
```
Change to `claude-sonnet-4-20250514` for faster/cheaper, or `claude-opus-4-20250514` for most powerful.

### Adjust max tokens
```python
max_tokens=2000
```
Increase for longer outputs (more questions, longer summaries).

### Add more actions
In `app.py`, add a new prompt in `build_prompt()` and add a new button in `index.html` + `app.js`.

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `flask` | Web framework |
| `anthropic` | Claude AI API client |
| `pdfplumber` | PDF text extraction |
| `werkzeug` | File upload security |

---

## 🔐 Security Notes

- Uploaded files are deleted immediately after text extraction
- File size limited to 10MB
- Only `.pdf`, `.txt`, `.md` extensions accepted
- Never commit your `.env` or API key to version control

---

## 📄 License

MIT — free to use, modify, and distribute.
