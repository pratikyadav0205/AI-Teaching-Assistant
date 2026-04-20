import os
import json
import anthropic
import pdfplumber
from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024  # 10MB max
app.config["UPLOAD_FOLDER"] = "uploads"
ALLOWED_EXTENSIONS = {"pdf", "txt", "md"}

client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_text_from_pdf(filepath):
    text = ""
    with pdfplumber.open(filepath) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text.strip()


def build_prompt(action, content, difficulty, count=5):
    diff_map = {
        "easy": "Use very simple language and short sentences. Assume a complete beginner with no prior knowledge.",
        "medium": "Use clear, moderately detailed language. Assume the student has some foundational knowledge.",
        "hard": "Use precise technical language, go deep into nuances and edge cases. Assume an advanced student.",
    }
    diff_ctx = f"Difficulty: {difficulty.upper()}. {diff_map[difficulty]}"

    if action == "summary":
        return f"""You are an expert educational assistant. {diff_ctx}

Summarize the following educational content. Provide:
1. A 2-3 sentence overview
2. Key Concepts (bullet points, 5-8 items)
3. Important Takeaways (2-4 items)

Be concise and pedagogically useful for teachers.

CONTENT:
{content}"""

    if action == "mcq":
        return f"""You are an expert educational assessment designer. {diff_ctx}

Generate exactly {count} multiple-choice questions (MCQs) from the content below.

Format each question as:
Q1. [Question text]
A) [Option]
B) [Option]
C) [Option]
D) [Option]
Answer: [Letter] — [Brief explanation why]

Make distractors plausible. Separate questions with a blank line.

CONTENT:
{content}"""

    if action == "shortanswer":
        return f"""You are an expert educational assessment designer. {diff_ctx}

Generate exactly {count} short-answer questions from the content below. Each should require 2-5 sentences to answer.

Format each as:
Q[n]. [Question]
Model Answer: [Concise expected answer]

Separate questions with a blank line.

CONTENT:
{content}"""

    if action == "simplify":
        return f"""You are an expert at making complex topics accessible. {diff_ctx}

Explain the main topic from the content below in simple, plain language. Include:
- A relatable real-world analogy
- Simple vocabulary (define any jargon immediately)
- Short paragraphs
- A 1-sentence "bottom line" summary at the end

CONTENT:
{content}"""


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Unsupported file type. Use PDF, TXT, or MD."}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)

    ext = filename.rsplit(".", 1)[1].lower()
    if ext == "pdf":
        text = extract_text_from_pdf(filepath)
    else:
        with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
            text = f.read()

    os.remove(filepath)

    if not text.strip():
        return jsonify({"error": "Could not extract text from file."}), 400

    return jsonify({"text": text, "chars": len(text), "filename": filename})


@app.route("/generate", methods=["POST"])
def generate():
    data = request.json
    action = data.get("action")
    content = data.get("content", "").strip()
    difficulty = data.get("difficulty", "medium")
    count = int(data.get("count", 5))

    if not content:
        return jsonify({"error": "No content provided"}), 400
    if len(content) < 30:
        return jsonify({"error": "Content too short"}), 400
    if action not in ("summary", "mcq", "shortanswer", "simplify"):
        return jsonify({"error": "Invalid action"}), 400

    prompt = build_prompt(action, content, difficulty, count)

    def stream():
        with client.messages.stream(
            model="claude-opus-4-5",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"

    return Response(stream_with_context(stream()), mimetype="text/event-stream")


if __name__ == "__main__":
    os.makedirs("uploads", exist_ok=True)
    print("\n🎓 AI Teaching Assistant is running!")
    print("➡  Open http://localhost:5000 in your browser\n")
    app.run(debug=True, port=5000)
