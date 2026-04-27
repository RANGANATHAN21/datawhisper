# DataWhisper 🔍

> Upload CSV/Excel files and ask AI questions about your data — no SQL, no code. Get text answers **and rendered charts**.

![DataWhisper](https://img.shields.io/badge/stack-FastAPI%20%2B%20React-7c6af7?style=flat-square)
![Python](https://img.shields.io/badge/python-3.11%2B-blue?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## Features

| Feature | Detail |
|---|---|
| **Multi-file upload** | Drag-and-drop CSV, XLS, XLSX — multiple files at once |
| **Multi-sheet support** | All sheets in an Excel workbook are parsed and selectable |
| **Top-N Preview** | User-defined N (1–1000) with sticky column headers |
| **AI Q&A** | GPT-4o-mini answers questions scoped to all sheets or a specific one |
| **📊 Chart generation** | Natural-language chart requests rendered as interactive Chart.js visuals |
| **Prompt history** | Every Q+A and chart in the session is saved and reusable |
| **Feedback** | 👍/👎 on every answer and chart; session-level helpfulness score |

---

## Architecture

```
datawhisper/
├── backend/           # Python FastAPI
│   ├── main.py        # All routes + business logic
│   ├── requirements.txt
│   └── .env.example   # Template — copy to .env
└── frontend/          # React + Vite
    ├── src/
    │   ├── App.jsx
    │   ├── components/
    │   │   ├── UploadZone.jsx
    │   │   ├── SheetSelector.jsx
    │   │   ├── PreviewPanel.jsx
    │   │   ├── AskPanel.jsx      ← Ask AI + Generate Chart
    │   │   ├── ChartCard.jsx     ← Chart.js v4 renderer
    │   │   └── HistoryPanel.jsx
    │   └── utils/api.js
    └── vite.config.js  # proxies /api → localhost:8000
```

### How chart generation works

1. User types a natural-language chart request (e.g. *"Show survival rate by passenger class as a bar chart"*)
2. User clicks **📊 Chart** (or types and clicks **Ask** for text answers)
3. Backend sends up to 200 sample rows + numeric statistics to GPT-4o-mini with a strict system prompt
4. The model returns a raw Chart.js v4 JSON config (no prose, no fences)
5. Backend validates the JSON and returns it; frontend renders it via `<canvas>` + Chart.js CDN

---

## Quick Start

### 1. Clone & configure

```bash
git clone https://github.com/<your-org>/datawhisper.git
cd datawhisper
```

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and set OPENAI_API_KEY
nano .env

uvicorn main:app --reload
```

Backend runs on http://localhost:8000  
Interactive API docs: http://localhost:8000/docs

### 3. Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs on http://localhost:5173 (proxies `/api` → port 8000).

---

## Security Considerations

### API Key Protection
- `OPENAI_API_KEY` is loaded **only from environment variables** — never hardcoded, never returned in API responses, never logged.
- `.env` is in `.gitignore`. Only `.env.example` (no real values) is committed.
- **Never commit a real key to Git** — even a temporary one gets invalidated by secret-scanning bots within minutes.

### File Upload Safety
- **Extension whitelist**: `.csv`, `.xls`, `.xlsx` only.
- **Magic byte validation**: XLS/XLSX binary formats verified by file header bytes, not just extension.
- **Size cap**: 10 MB per upload, enforced server-side before parsing.
- **Filename sanitisation**: Path-traversal characters (`../`) and shell-unsafe chars stripped.
- Files are read into in-memory pandas DataFrames — **never written to disk**.

### Injection Prevention
- No shell commands are ever executed; all processing is via pandas/openpyxl.
- User-supplied filenames and questions are never interpolated into shell or SQL.
- AI prompts use clearly separated `system` / `user` roles; data context is sent as plain text, not as executable instructions.
- Chart JSON returned by the AI is validated (`json.loads`) before being passed to the client — malformed payloads raise a 500 error rather than being forwarded raw.

### CORS
- `ALLOWED_ORIGINS` is environment-configured (defaults to `http://localhost:5173`).
- Lock to your production domain before deploying.

### Session Isolation
- Each upload gets a UUID session ID. Clients can only access their own session's data.
- In-memory store means data is automatically cleared on server restart.

### What is (and isn't) sent to OpenAI
For **text answers**: column names, dtypes, row count, numeric `describe()` stats, and up to 20 sample rows.  
For **chart generation**: same schema + stats + up to 200 sample rows (needed for aggregation).  
The full dataset **never leaves the server**.

### Input Limits
- Questions capped at 2 000 characters (Pydantic).
- `max_tokens: 1024` for text answers, `2048` for chart JSON.
- Preview endpoint capped at 1 000 rows.

### Production Hardening (TODO)
- [ ] Rate limiting via `slowapi` (already in `.env.example` as a reminder)
- [ ] Authentication (JWT or session cookies)
- [ ] Persist sessions to Redis with TTL
- [ ] Virus scan uploaded files (ClamAV)
- [ ] Deploy behind HTTPS reverse proxy (nginx / Caddy)
- [ ] Set OpenAI usage limits / spend caps in dashboard

---

## Thought Process

### Why FastAPI + React?
FastAPI gives built-in Pydantic validation, automatic OpenAPI docs, and async file handling. React + Vite keeps the frontend reactive with no boilerplate; Vite's dev proxy eliminates CORS friction.

### Why Chart.js instead of LIDA?
LIDA generates visualisations but bundles a heavy toolchain (matplotlib, lida, etc.) and requires code execution on the server — a significant attack surface for user-supplied data. Chart.js renders entirely in the browser from a JSON config; the server never executes untrusted code. This is both safer and faster.

### Why not PandasAI?
PandasAI executes LLM-generated Python against the actual DataFrame. Sandboxing that safely is non-trivial. The current approach (schema + sample → structured JSON answer) is fully auditable and doesn't require a sandbox.

### Data minimisation
The AI never sees the full dataset. It sees schema, statistics, and a bounded sample. This reduces cost, latency, and inadvertent PII exposure.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload files → session_id + sheet list |
| `GET` | `/api/preview` | Top N rows for a sheet |
| `POST` | `/api/ask` | Ask AI a text question |
| `POST` | `/api/chart` | Generate a Chart.js config |
| `POST` | `/api/feedback` | Submit 👍/👎 |
| `GET` | `/api/history` | Full session history |
| `GET` | `/api/health` | Health check |
