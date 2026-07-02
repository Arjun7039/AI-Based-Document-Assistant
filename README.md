# 📄 DocMind — RAG-Based Document Assistant

A production-ready, multi-format document intelligence platform that lets users upload any document (PDF, Excel, DOCX, CSV, PPTX, TXT, and more) and query it using natural language. Built for speed, accuracy, and scalability.

---

## 🧠 What This Does

Users upload documents — from 10 pages to 100+ pages — and ask questions in plain English. The system retrieves only the relevant chunks, feeds them into an LLM with context, and returns a precise, grounded answer. No hallucination from memory. No manual searching. No page-by-page reading.

**Core Flow:**
```
User uploads file
        ↓
Parse → Clean → Chunk → Embed → Store in Vector DB
        ↓
User asks a question
        ↓
Embed query → Semantic search → Retrieve top-k chunks
        ↓
LLM generates answer grounded in retrieved context
        ↓
Return answer + source citations to user
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│              React + Tailwind + Vite                        │
│   File Upload | Chat UI | Source Viewer | Session History   │
└────────────────────┬────────────────────────────────────────┘
                     │ REST / WebSocket
┌────────────────────▼────────────────────────────────────────┐
│                     API GATEWAY                             │
│                  FastAPI (Python)                           │
│    /upload  |  /query  |  /sessions  |  /documents          │
└──────┬─────────────┬───────────────┬────────────────────────┘
       │             │               │
┌──────▼──────┐ ┌────▼──────┐ ┌─────▼──────────┐
│  Ingestion  │ │   Query   │ │  Auth / Session │
│  Pipeline   │ │  Engine   │ │    Manager      │
└──────┬──────┘ └────┬──────┘ └────────────────┘
       │             │
┌──────▼─────────────▼────────────────────────────────────────┐
│                    CORE SERVICES                            │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  Document   │  │  Embedding   │  │    LLM Layer      │  │
│  │  Parsers    │  │  Service     │  │ (Gemini / Groq)   │  │
│  │  (multi-    │  │ (3-Tier      │  │ Gemini 3.5 Flash/ │  │
│  │   format)   │  │  Fallback)   │  │ Llama 3.3         │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
└──────────┬──────────────────┬────────────────────────────────┘
           │                  │
┌──────────▼──────┐  ┌────────▼──────────┐
│  Vector Store   │  │   Relational DB   │
│  (Pinecone /    │  │   PostgreSQL      │
│   Local JSON)   │  │  (metadata,       │
│                 │  │   sessions,       │
│                 │  │   audit logs)     │
└─────────────────┘  └───────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React + Vite + Tailwind CSS | Chat UI, file upload, source viewer |
| **API** | FastAPI (Python 3.11+) | REST endpoints, file handling, orchestration |
| **Document Parsing** | `pypdf`, `python-docx`, `openpyxl`, `python-pptx`, `pandas` | Multi-format ingestion |
| **Text Chunking** | LangChain `RecursiveCharacterTextSplitter` | Smart context-aware chunking |
| **Embeddings** | HuggingFace API / Gemini / Local SentenceTransformer | 3-tier dense vector representation |
| **Vector DB** | Pinecone (prod) / Local JSON (dev) | Semantic similarity search |
| **LLM** | Google Gemini (primary) / Groq (fallback) | Answer generation |
| **Relational DB** | PostgreSQL (Supabase) + SQLAlchemy | Metadata, sessions, user data |
| **Object Storage** | Local File System | Raw document storage |
| **Task Queue** | FastAPI BackgroundTasks | Async ingestion jobs for large files |
| **Auth** | JWT + bcrypt | User sessions and API key management |
| **Deployment** | Render (Backend) / Vercel (Frontend) | Cloud deployment target |

---

## 📂 Project Structure

```
docmind/
├── backend/
│   ├── main.py                    # FastAPI app entrypoint
│   ├── config.py                  # Environment config + settings
│   ├── requirements.txt
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── upload.py          # POST /upload — file ingestion trigger
│   │   │   ├── query.py           # POST /query — RAG query endpoint
│   │   │   ├── documents.py       # GET/DELETE /documents — manage uploads
│   │   │   └── sessions.py        # GET /sessions — chat history
│   │   └── dependencies.py        # Auth, DB session injection
│   │
│   ├── ingestion/
│   │   ├── parser.py              # Route files to correct parser
│   │   ├── parsers/
│   │   │   ├── pdf_parser.py      # pypdf + unstructured fallback
│   │   │   ├── docx_parser.py     # python-docx
│   │   │   ├── excel_parser.py    # openpyxl + pandas
│   │   │   ├── pptx_parser.py     # python-pptx
│   │   │   ├── csv_parser.py      # pandas
│   │   │   └── txt_parser.py      # plain text
│   │   ├── chunker.py             # RecursiveCharacterTextSplitter logic
│   │   └── pipeline.py            # Orchestrates parse → chunk → embed → store
│   │
│   ├── embeddings/
│   │   ├── embedder.py            # 3-tier embedding logic (HF/Gemini/Local)
│   │   └── vector_store.py        # Pinecone / Local JSON abstraction layer
│   │
│   ├── rag/
│   │   ├── retriever.py           # Semantic search + optional re-ranking
│   │   ├── prompt_builder.py      # System prompt + context injection
│   │   └── generator.py           # LLM call with retrieved context
│   │
│   ├── db/
│   │   ├── database.py            # PostgreSQL connection + session factory
│   │   └── migrations/            # Alembic migration scripts
│   │
│   └── utils/
│       ├── file_validator.py      # MIME type + size checks
│       ├── logger.py              # Structured logging
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── UploadZone.jsx     # Drag & drop file upload
│   │   │   ├── ChatWindow.jsx     # Conversation interface
│   │   │   ├── MessageBubble.jsx  # User / assistant message
│   │   │   ├── SourcePanel.jsx    # Show retrieved chunk sources
│   │   │   ├── DocumentList.jsx   # Manage uploaded documents
│   │   │   └── StatusBadge.jsx    # Processing status indicator
│   │   ├── hooks/
│   │   │   ├── useUpload.js       # Upload + polling logic
│   │   │   └── useChat.js         # Query + streaming response
│   │   ├── api/
│   │   │   └── client.js          # Axios instance + API helpers
│   │   └── store/
│   │       └── useStore.js        # Zustand global state
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── .env.example
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env` file at the root. Copy from `.env.example`:

```env
# ─── App Configuration ───
APP_ENV=development

# ─── 1. Relational Database (Supabase) ───
DATABASE_URL=postgresql://user:password@aws-1.pooler.supabase.com:5432/postgres

# ─── 2. LLM Engine (Gemini / Groq) ───
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# ─── 3. Vector Database (Pinecone) ───
VECTOR_STORE=pinecone
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=docmind

# ─── 4. File Storage ───
STORAGE_BACKEND=local
LOCAL_UPLOAD_DIR=./uploads

# ─── 5. Embeddings Model Settings ───
HUGGINGFACE_API_TOKEN=your_huggingface_api_token
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384
EMBEDDING_PROVIDER=huggingface

# ─── Auth (JWT Security) ───
JWT_SECRET_KEY=change-this-to-a-random-string
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
REFRESH_TOKEN_WINDOW_MINUTES=14400

# ─── RAG Prompt Settings ───
CHUNK_SIZE=1500
CHUNK_OVERLAP=200
TOP_K_RETRIEVAL=8
LLM_MODEL=gemini-3.5-flash
LLM_FALLBACK_MODEL=gemini-2.5-pro
LLM_TEMPERATURE=0.2
MAX_CONTEXT_TOKENS=8192

# ─── Upload Limits ───
MAX_FILE_SIZE_MB=200

# ─── CORS ───
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+

### 1. Clone and Set Up

```bash
git clone https://github.com/Arjun7039/AI-Based-Document-Assistant.git
cd AI-Based-Document-Assistant
cp .env.example .env
# Fill in your API keys in .env
```

### 2. Run Manually (Dev Mode)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head            # Run DB migrations
python -m uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📡 API Reference

### Upload a Document

```
POST /api/upload
Content-Type: multipart/form-data

Body:
  file: <binary>
  session_id: <string> (optional — creates new session if omitted)

Response:
{
  "document_id": "doc_abc123",
  "filename": "Q3_Report.pdf",
  "status": "processing",   // "processing" | "ready" | "failed"
  "pages": 47,
  "session_id": "sess_xyz"
}
```

### Poll Document Status

```
GET /api/documents/{document_id}/status

Response:
{
  "document_id": "doc_abc123",
  "status": "ready",
  "chunks_indexed": 182,
  "processing_time_ms": 3420
}
```

### Query Documents

```
POST /api/query
Content-Type: application/json

Body:
{
  "question": "What was the total revenue in Q3?",
  "session_id": "sess_xyz",
  "document_ids": ["doc_abc123"],   // optional: scope to specific docs
  "top_k": 5                        // optional: override retrieval count
}

Response:
{
  "answer": "Total revenue in Q3 was ₹42.3 crore, representing a 14% increase...",
  "sources": [
    {
      "document_id": "doc_abc123",
      "filename": "Q3_Report.pdf",
      "page": 12,
      "chunk": "...Total revenue for Q3 stood at ₹42.3 crore compared to...",
      "score": 0.91
    }
  ],
  "tokens_used": 1840,
  "latency_ms": 1120
}
```

### List Documents in Session

```
GET /api/sessions/{session_id}/documents

Response:
{
  "session_id": "sess_xyz",
  "documents": [
    { "document_id": "doc_abc123", "filename": "Q3_Report.pdf", "status": "ready", "uploaded_at": "..." }
  ]
}
```

### Delete a Document

```
DELETE /api/documents/{document_id}
```

---

## 🧩 Key Implementation Details

### Document Parsing Strategy

Each file type has a dedicated parser. All parsers return a normalized `List[TextChunk]` with `text`, `page_number`, `section`, and `metadata`.

```python
# ingestion/parser.py
PARSER_MAP = {
    "pdf":  PDFParser,
    "docx": DocxParser,
    "xlsx": ExcelParser,
    "xls":  ExcelParser,
    "csv":  CSVParser,
    "pptx": PPTXParser,
    "txt":  TxtParser,
    "md":   TxtParser,
    "json": TxtParser,
}
```

For PDFs: use `pypdf` for text-based PDFs. Fall back to OCR for scanned documents if needed.
For Excel/CSV: convert each sheet/table row into structured plain text before chunking (`openpyxl` → row-to-text serialization).

### Chunking Strategy

```python
# ingestion/chunker.py
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1500,         # from env: CHUNK_SIZE
    chunk_overlap=200,       # from env: CHUNK_OVERLAP
    separators=["\n\n", "\n", ". ", " ", ""],
    length_function=len,
)
```

Each chunk stores: `text`, `document_id`, `chunk_index`, `page_number`, `source_file`.

### 3-Tier Embedding Fallback Strategy

To ensure zero-downtime and cost-effectiveness, the application utilizes a multi-provider embedding strategy:
1. **HuggingFace Inference API** (`sentence-transformers/all-MiniLM-L6-v2`) — Primary, GPU-accelerated, free tier.
2. **Gemini Embedding** (`models/gemini-embedding-2`) — Fast, paid API fallback.
3. **Local SentenceTransformers** (`all-MiniLM-L6-v2`) — Ultimate local CPU fallback. No network required, ensuring processing never halts.

### RAG Prompt Template

```python
# rag/prompt_builder.py
SYSTEM_PROMPT = """
You are DocMind, a precise document assistant. Answer the user's question
using ONLY the context provided below. If the answer is not in the context,
say "I couldn't find this in the uploaded documents."

Always cite which document and page number your answer comes from.
Keep answers concise, accurate, and well-structured.
"""

def build_prompt(question: str, chunks: list[Chunk]) -> list[dict]:
    context = "\n\n---\n\n".join([
        f"[Source: {c.filename}, Page {c.page}]\n{c.text}"
        for c in chunks
    ])
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
    ]
```

### Async Ingestion with FastAPI BackgroundTasks

Large files are processed asynchronously using FastAPI's built-in `BackgroundTasks`. The `/upload` endpoint immediately returns `status: processing` and a `document_id`. The frontend polls `/documents/{id}/status` until `status: ready`.

---

## 🗺️ Build Order (Step-by-Step)

Follow this sequence when building the project. Complete each phase before moving to the next.

**Phase 1 — Project Scaffold**
1. Initialize FastAPI app with health check endpoint (`GET /health`)
2. Set up PostgreSQL connection with SQLAlchemy + Alembic
3. Run initial migration

**Phase 2 — File Ingestion**
4. Build `/api/upload` endpoint with file validation (MIME type, size limit)
5. Implement each parser (`pdf_parser`, `docx_parser`, `excel_parser`, `csv_parser`, `pptx_parser`, `txt_parser`)
6. Implement `chunker.py` using LangChain splitter
7. Implement `vector_store.py` abstraction (Pinecone / Local JSON)
8. Implement `embedder.py` (3-tier HF/Gemini/Local)
9. Wire the full ingestion pipeline: upload → parse → chunk → embed → store
10. Add FastAPI BackgroundTasks for async processing of large files

**Phase 3 — Query Engine**
11. Implement `/api/query` endpoint
12. Build `retriever.py` — embed query, search Vector DB, return top-k chunks
13. Build `prompt_builder.py` — inject chunks into system prompt
14. Build `generator.py` — call Gemini/Groq, return answer + source metadata
15. Add Groq (llama-3.3-70b) as a fallback if Gemini quota exceeded

**Phase 4 — Frontend**
16. Scaffold React + Vite + Tailwind
17. Build `UploadZone.jsx` with drag-and-drop + progress indicator
18. Build `ChatWindow.jsx` + `MessageBubble.jsx`
19. Build `SourcePanel.jsx` to display retrieved chunk citations
20. Build `DocumentList.jsx` to manage uploaded files per session
21. Connect frontend to backend API via `client.js` (Axios)
22. Add Zustand for global state (current session, document list, messages)

**Phase 5 — Polish & Production**
23. Add JWT auth (register/login, protect all routes)
24. Add structured logging
25. Add `.env.example` with all required variables
26. Deploy Backend to Render and Frontend to Vercel

---

## 📦 Supported File Formats

| Format | Extension | Parser | Notes |
|---|---|---|---|
| PDF | `.pdf` | pypdf | Text-based PDFs |
| Word | `.docx` | python-docx | Extracts paragraphs, tables, headings |
| Excel | `.xlsx`, `.xls` | openpyxl + pandas | Each sheet parsed, rows converted to text |
| CSV | `.csv` | pandas | Column-aware row serialization |
| PowerPoint | `.pptx` | python-pptx | Slide text + speaker notes |
| Plain Text | `.txt`, `.md` | built-in | Direct chunking |
| JSON | `.json` | built-in | Pretty-printed before chunking |

---

## 🔒 Security Considerations

- All uploaded files are validated by MIME type (not just extension)
- JWT tokens expire after configured timeframe; refresh token flow for long sessions
- Input sanitization on all query strings before LLM injection (prompt injection guard)
- Document isolation: users can only query their own uploaded documents

---

## 🔧 Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `CHUNK_SIZE` | 1500 | Target characters per chunk |
| `CHUNK_OVERLAP` | 200 | Overlap between adjacent chunks |
| `TOP_K_RETRIEVAL` | 8 | Number of chunks retrieved per query |
| `LLM_MODEL` | `gemini-3.5-flash` | Primary LLM |
| `LLM_TEMPERATURE` | 0.2 | Low temp for factual answers |
| `MAX_FILE_SIZE_MB` | 200 | Max upload size |
| `VECTOR_STORE` | `pinecone` | Vector database |
| `EMBEDDING_PROVIDER` | `huggingface` | Embedding provider (huggingface/gemini/local) |

---

## 🗓️ Roadmap

- [ ] Streaming responses (SSE) for long answers
- [ ] Multi-document cross-referencing in a single query
- [ ] Table-aware chunking for Excel/CSV (preserve row context)
- [ ] OCR pipeline for scanned PDFs (Tesseract integration)
- [ ] Re-ranking layer (Cohere Rerank API) for better retrieval precision
- [ ] Query history + favourite answers

---

## 📄 License

MIT License. See `LICENSE` for details.
