"""
DataWhisper Backend - FastAPI
Security notes:
  - API key loaded from environment, never logged or returned to client
  - File uploads validated by extension + magic bytes
  - Max file size enforced (10MB)
  - Filenames sanitised with secure_filename equivalent
  - CORS restricted to localhost in dev (configure via env for prod)
  - Prompt history stored server-side only (session-scoped in memory for demo)
  - No shell execution; pandas/openpyxl only
"""

import os
import io
import re
import uuid
import json
from pathlib import Path

import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from openai import OpenAI

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
# Load backend/.env no matter how the app is started.
load_dotenv(Path(__file__).with_name(".env"))

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".csv", ".xls", ".xlsx"}
MAGIC_BYTES = {
    b"\xd0\xcf\x11\xe0": "xls",
    b"PK\x03\x04": "xlsx",
}

file_store: dict[str, dict[str, pd.DataFrame]] = {}
history_store: dict[str, list[dict]] = {}

app = FastAPI(title="DataWhisper API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def sanitize_filename(name: str) -> str:
    name = Path(name).name
    name = re.sub(r"[^\w.\-]", "_", name)
    return name[:128]


def validate_file(content: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type '{ext}' not allowed.")
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "File exceeds 10 MB limit.")
    if ext in (".xls", ".xlsx"):
        matched = any(content.startswith(magic) for magic in MAGIC_BYTES)
        if not matched:
            raise HTTPException(400, "File content does not match declared type.")
    return ext


def read_file_to_frames(content: bytes, filename: str) -> dict[str, pd.DataFrame]:
    ext = Path(filename).suffix.lower()
    buf = io.BytesIO(content)
    if ext == ".csv":
        df = pd.read_csv(buf)
        return {"Sheet1": df}
    else:
        xf = pd.ExcelFile(buf, engine="openpyxl" if ext == ".xlsx" else "xlrd")
        return {sheet: xf.parse(sheet) for sheet in xf.sheet_names}


def df_to_json_safe(df: pd.DataFrame) -> list[dict]:
    return df.where(pd.notnull(df), None).to_dict(orient="records")


def build_context_for_ai(frames: dict[str, pd.DataFrame], target_key: str | None, sample_rows: int = 20) -> str:
    """Build schema + stats + sample rows context string for AI."""
    parts: list[str] = []
    for key, df in frames.items():
        if target_key and key != target_key:
            continue
        sample = df.head(sample_rows).to_csv(index=False)
        schema = ", ".join(f"{c} ({df[c].dtype})" for c in df.columns)
        numeric_cols = df.select_dtypes(include="number").columns.tolist()
        stats_text = ""
        if numeric_cols:
            stats = df[numeric_cols].describe().round(2).to_csv()
            stats_text = f"Numeric statistics:\n{stats}\n"
        parts.append(
            f"### Sheet/File: {key}\n"
            f"Columns: {schema}\n"
            f"Total rows: {len(df)}\n"
            f"{stats_text}"
            f"Sample (first {min(sample_rows, len(df))} rows):\n{sample}"
        )
    return "\n\n".join(parts)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.post("/api/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    session_id = str(uuid.uuid4())
    all_frames: dict[str, pd.DataFrame] = {}

    for upload in files:
        safe_name = sanitize_filename(upload.filename or "file")
        content = await upload.read()
        ext = validate_file(content, safe_name)
        frames = read_file_to_frames(content, safe_name)
        stem = Path(safe_name).stem
        for sheet, df in frames.items():
            key = f"{stem}__{sheet}" if sheet != "Sheet1" or ext != ".csv" else stem
            all_frames[key] = df

    file_store[session_id] = all_frames
    history_store[session_id] = []

    sheet_info = [
        {"key": k, "rows": len(df), "columns": list(df.columns)}
        for k, df in all_frames.items()
    ]
    return {"session_id": session_id, "sheets": sheet_info}


@app.get("/api/preview")
def preview(
    session_id: str = Query(...),
    sheet_key: str = Query(...),
    n: int = Query(10, ge=1, le=1000),
):
    frames = file_store.get(session_id)
    if not frames:
        raise HTTPException(404, "Session not found.")
    df = frames.get(sheet_key)
    if df is None:
        raise HTTPException(404, "Sheet not found.")
    return {"rows": df_to_json_safe(df.head(n)), "columns": list(df.columns)}


class PromptRequest(BaseModel):
    session_id: str
    question: str = Field(..., min_length=1, max_length=2000)
    target_sheet: str | None = None


@app.post("/api/ask")
def ask(req: PromptRequest):
    if not client:
        raise HTTPException(503, "AI service not configured.")
    frames = file_store.get(req.session_id)
    if not frames:
        raise HTTPException(404, "Session not found.")

    context = build_context_for_ai(frames, req.target_sheet)
    system_prompt = (
        "You are a data analyst assistant. "
        "The user has uploaded one or more spreadsheets. "
        "Answer questions accurately based ONLY on the provided data context. "
        "If you cannot answer from the data, say so clearly. "
        "Format numbers neatly. Use markdown tables when listing multiple values. "
        "When interpreting categorical data, group and count values helpfully. "
        "If the user asks for a chart, remind them to use the 'Generate Chart' button below the input."
    )
    user_prompt = f"Data context:\n{context}\n\nUser question: {req.question}"

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=1024,
        temperature=0.2,
    )
    answer = response.choices[0].message.content or ""

    record_id = str(uuid.uuid4())
    history_store[req.session_id].append({
        "id": record_id,
        "question": req.question,
        "answer": answer,
        "target_sheet": req.target_sheet,
        "feedback": None,
        "chart": None,
    })
    return {"id": record_id, "answer": answer}


# ---------------------------------------------------------------------------
# Chart generation
# ---------------------------------------------------------------------------

class ChartRequest(BaseModel):
    session_id: str
    question: str = Field(..., min_length=1, max_length=2000)
    target_sheet: str | None = None


@app.post("/api/chart")
def generate_chart(req: ChartRequest):
    """Generate a Chart.js v4 config JSON from a natural-language question."""
    if not client:
        raise HTTPException(503, "AI service not configured.")
    frames = file_store.get(req.session_id)
    if not frames:
        raise HTTPException(404, "Session not found.")

    # Send up to 200 rows for chart generation so AI can do real aggregation
    context = build_context_for_ai(frames, req.target_sheet, sample_rows=200)

    system_prompt = (
        "You are a data visualisation expert. "
        "Given a dataset context and a user request, produce ONLY a valid Chart.js v4 "
        "configuration object as raw JSON — no markdown fences, no explanation, no prose. "
        "The JSON must have: `type` (bar/line/pie/doughnut/scatter/radar), "
        "`data` with `labels` and `datasets` (each dataset needs `label`, `data`, `backgroundColor`). "
        "Include `options.plugins.title.display=true` and `options.plugins.title.text` describing the chart. "
        "Aggregate values yourself from the sample — count, group, or average as appropriate. "
        "Keep labels concise (max 20 unique labels for readability). "
        "Use colours from: #7c6af7, #a594f9, #3ddc84, #ffd166, #ff6b6b, #06d6a0, #118ab2, #ef476f. "
        "Output ONLY the JSON object."
    )
    user_prompt = f"Dataset:\n{context}\n\nChart request: {req.question}"

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=2048,
        temperature=0.1,
    )
    raw = (response.choices[0].message.content or "").strip()

    # Strip accidental markdown fences
    raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"\n?```$", "", raw, flags=re.MULTILINE)
    raw = raw.strip()

    try:
        chart_config = json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"AI returned invalid chart JSON: {e}") from e

    record_id = str(uuid.uuid4())
    history_store[req.session_id].append({
        "id": record_id,
        "question": req.question,
        "answer": None,
        "target_sheet": req.target_sheet,
        "feedback": None,
        "chart": chart_config,
    })
    return {"id": record_id, "chart": chart_config}


class FeedbackRequest(BaseModel):
    session_id: str
    record_id: str
    useful: bool


@app.post("/api/feedback")
def feedback(req: FeedbackRequest):
    history = history_store.get(req.session_id, [])
    for record in history:
        if record["id"] == req.record_id:
            record["feedback"] = req.useful
            return {"ok": True}
    raise HTTPException(404, "Record not found.")


@app.get("/api/history")
def get_history(session_id: str = Query(...)):
    history = history_store.get(session_id)
    if history is None:
        raise HTTPException(404, "Session not found.")
    return {"history": history}


@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.1.0"}
