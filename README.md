# 📄 DocMind — RAG-Based Document Assistant

A production-ready, multi-format document intelligence platform that lets users upload any document (PDF, Excel, DOCX, CSV, PPTX, TXT, and more) and query it using natural language. Built for speed, accuracy, and scalability.

---

## 🧠 What This Does

Users upload documents — from 10 pages to 10,000 pages — and ask questions in plain English. The system retrieves only the relevant chunks, feeds them into an LLM with context, and returns a precise, grounded answer. No hallucination from memory. No manual searching. No page-by-page reading.

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
│  │  Parsers    │  │  Service     │  │  (OpenAI / Groq)  │  │
│  │  (multi-    │  │ (text-embed- │  │   GPT-4o / llama  │  │
│  │   format)   │  │  3-small)    │  │                   │  │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
└──────────┬──────────────────┬────────────────────────────────┘
           │                  │
┌──────────▼──────┐  ┌────────▼──────────┐
│  Vector Store   │  │   Relational DB   │
│  (ChromaDB /    │  │   PostgreSQL      │
│   Pinecone)     │  │  (metadata,       │
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
| **Document Parsing** | `pypdf`, `python-docx`, `openpyxl`, `python-pptx`, `unstructured`, `pandas` | Multi-format ingestion |
| **Text Chunking** | LangChain `RecursiveCharacterTextSplitter` | Smart context-aware chunking |
| **Embeddings** | OpenAI `text-embedding-3-small` | Dense vector representation |
| **Vector DB** | ChromaDB (dev) / Pinecone (prod) | Semantic similarity search |
| **LLM** | OpenAI GPT-4o (primary) / Groq llama-3.3-70b (fallback) | Answer generation |
| **Relational DB** | PostgreSQL + SQLAlchemy | Metadata, sessions, user data |
| **Object Storage** | AWS S3 / Cloudflare R2 | Raw document storage |
| **Task Queue** | Celery + Redis | Async ingestion jobs for large files |
| **Auth** | JWT + bcrypt | User sessions and API key management |
| **Deployment** | Docker + Docker Compose | Container orchestration |
| **Hosting** | Antigravity | Cloud deployment target |

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
│   │   ├── embedder.py            # OpenAI embedding wrapper
│   │   └── vector_store.py        # ChromaDB / Pinecone abstraction layer
│   │
│   ├── rag/
│   │   ├── retriever.py           # Semantic search + optional re-ranking
│   │   ├── prompt_builder.py      # System prompt + context injection
│   │   └── generator.py           # LLM call with retrieved context
│   │
│   ├── models/
│   │   ├── document.py            # SQLAlchemy Document model
│   │   ├── session.py             # Chat session model
│   │   └── user.py                # User model
│   │
│   ├── db/
│   │   ├── database.py            # PostgreSQL connection + session factory
│   │   └── migrations/            # Alembic migration scripts
│   │
│   ├── tasks/
│   │   └── ingestion_task.py      # Celery task for async document processing
│   │
│   └── utils/
│       ├── file_validator.py      # MIME type + size checks
│       ├── storage.py             # S3 / R2 upload/download helpers
│       └── logger.py              # Structured logging
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
├── docker-compose.yml             # Full local stack (backend, frontend, postgres, redis, chroma)
├── Dockerfile.backend
├── Dockerfile.frontend
├── .env.example
└── README.md
```

---

## ⚙️ Environment Variables

Create a `.env` file at the root. Copy from `.env.example`:

```env
# LLM
OPENAI_API_KEY=sk-...
GROQ_API_KEY=gsk_...

# Embeddings
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSION=1536

# Vector DB
VECTOR_STORE=chroma                   # "chroma" | "pinecone"
CHROMA_PERSIST_DIR=./chroma_store
PINECONE_API_KEY=...
PINECONE_INDEX=docmind

# Postgres
DATABASE_URL=postgresql://user:password@localhost:5432/docmind

# Redis (for Celery)
REDIS_URL=redis://localhost:6379/0

# Object Storage
STORAGE_BACKEND=local                 # "local" | "s3" | "r2"
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=docmind-uploads
LOCAL_UPLOAD_DIR=./uploads

# Auth
JWT_SECRET_KEY=your-super-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# App
APP_ENV=development                   # "development" | "production"
MAX_FILE_SIZE_MB=50
ALLOWED_EXTENSIONS=pdf,docx,xlsx,csv,pptx,txt,md,json

# RAG Settings
CHUNK_SIZE=800
CHUNK_OVERLAP=150
TOP_K_RETRIEVAL=5
LLM_MODEL=gpt-4o
LLM_TEMPERATURE=0.2
MAX_CONTEXT_TOKENS=8000
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker + Docker Compose
- PostgreSQL 15 (or use the Docker Compose service)
- Redis (or use the Docker Compose service)

### 1. Clone and Set Up

```bash
git clone https://github.com/yourname/docmind.git
cd docmind
cp .env.example .env
# Fill in your API keys in .env
```

### 2. Run with Docker Compose (Recommended)

```bash
docker-compose up --build
```

This starts: FastAPI backend (port 8000), React frontend (port 5173), PostgreSQL (port 5432), Redis (port 6379), ChromaDB (port 8001).

### 3. Run Manually (Dev Mode)

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head            # Run DB migrations
uvicorn main:app --reload --port 8000
```

**Celery Worker (in a separate terminal):**
```bash
cd backend
celery -A tasks.ingestion_task worker --loglevel=info
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

For PDFs: use `pypdf` for text-based PDFs. Fall back to `unstructured` (which uses OCR internally) for scanned documents.

For Excel/CSV: convert each sheet/table row into structured plain text before chunking (`openpyxl` → row-to-text serialization).

### Chunking Strategy

```python
# ingestion/chunker.py
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=800,          # from env: CHUNK_SIZE
    chunk_overlap=150,       # from env: CHUNK_OVERLAP
    separators=["\n\n", "\n", ". ", " ", ""],
    length_function=len,
)
```

Each chunk stores: `text`, `document_id`, `chunk_index`, `page_number`, `source_file`.

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

### Async Ingestion with Celery

Large files (>5 MB or >100 pages) are processed asynchronously. The `/upload` endpoint immediately returns `status: processing` and a `document_id`. The frontend polls `/documents/{id}/status` until `status: ready`.

```python
# tasks/ingestion_task.py
@celery_app.task(bind=True, max_retries=3)
def ingest_document_task(self, document_id: str, file_path: str, file_type: str):
    try:
        chunks = pipeline.run(file_path, file_type)
        vector_store.add(chunks, document_id=document_id)
        db.update_document_status(document_id, status="ready", chunks=len(chunks))
    except Exception as e:
        self.retry(exc=e, countdown=5)
        db.update_document_status(document_id, status="failed")
```

---

## 🗺️ Build Order (Step-by-Step for Antigravity)

Follow this sequence when building the project. Complete each phase before moving to the next.

**Phase 1 — Project Scaffold**
1. Initialize FastAPI app with health check endpoint (`GET /health`)
2. Set up PostgreSQL connection with SQLAlchemy + Alembic
3. Create `Document`, `Session`, `ChatMessage` DB models
4. Run initial migration

**Phase 2 — File Ingestion**
5. Build `/api/upload` endpoint with file validation (MIME type, size limit)
6. Implement each parser (`pdf_parser`, `docx_parser`, `excel_parser`, `csv_parser`, `pptx_parser`, `txt_parser`)
7. Implement `chunker.py` using LangChain splitter
8. Set up ChromaDB locally and implement `vector_store.py` abstraction
9. Implement `embedder.py` (OpenAI `text-embedding-3-small`)
10. Wire the full ingestion pipeline: upload → parse → chunk → embed → store
11. Add Celery + Redis for async processing of large files

**Phase 3 — Query Engine**
12. Implement `/api/query` endpoint
13. Build `retriever.py` — embed query, search ChromaDB, return top-k chunks
14. Build `prompt_builder.py` — inject chunks into system prompt
15. Build `generator.py` — call GPT-4o, return answer + source metadata
16. Add Groq (llama-3.3-70b) as a fallback if OpenAI quota exceeded

**Phase 4 — Frontend**
17. Scaffold React + Vite + Tailwind
18. Build `UploadZone.jsx` with drag-and-drop + progress indicator
19. Build `ChatWindow.jsx` + `MessageBubble.jsx`
20. Build `SourcePanel.jsx` to display retrieved chunk citations
21. Build `DocumentList.jsx` to manage uploaded files per session
22. Connect frontend to backend API via `client.js` (Axios)
23. Add Zustand for global state (current session, document list, messages)

**Phase 5 — Polish & Production**
24. Add JWT auth (register/login, protect all routes)
25. Implement rate limiting on `/api/query` (slowapi)
26. Add structured logging (loguru or Python logging)
27. Write Dockerfiles for backend and frontend
28. Write `docker-compose.yml` with all services
29. Add `.env.example` with all required variables
30. Deploy to Antigravity

---

## 📦 Supported File Formats

| Format | Extension | Parser | Notes |
|---|---|---|---|
| PDF | `.pdf` | pypdf + unstructured | Handles scanned PDFs via OCR fallback |
| Word | `.docx` | python-docx | Extracts paragraphs, tables, headings |
| Excel | `.xlsx`, `.xls` | openpyxl + pandas | Each sheet parsed, rows converted to text |
| CSV | `.csv` | pandas | Column-aware row serialization |
| PowerPoint | `.pptx` | python-pptx | Slide text + speaker notes |
| Plain Text | `.txt`, `.md` | built-in | Direct chunking |
| JSON | `.json` | built-in | Pretty-printed before chunking |

---

## 🔒 Security Considerations

- All uploaded files are validated by MIME type (not just extension) using `python-magic`
- Files are stored in S3/R2 with presigned URLs — never served directly from the app server
- JWT tokens expire after 60 minutes; refresh token flow for long sessions
- Rate limiting: 20 queries/minute per user, 5 uploads/hour per user
- Input sanitization on all query strings before LLM injection (prompt injection guard)
- Document isolation: users can only query their own uploaded documents

---

## 🧪 Testing

```bash
cd backend
pytest tests/ -v

# Key test files:
# tests/test_parsers.py      — test each parser with sample files
# tests/test_chunker.py      — verify chunk sizes and overlap
# tests/test_retriever.py    — test semantic search accuracy
# tests/test_api.py          — integration tests for all endpoints
```

---

## 🔧 Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `CHUNK_SIZE` | 800 | Target characters per chunk |
| `CHUNK_OVERLAP` | 150 | Overlap between adjacent chunks |
| `TOP_K_RETRIEVAL` | 5 | Number of chunks retrieved per query |
| `LLM_MODEL` | `gpt-4o` | Primary LLM |
| `LLM_TEMPERATURE` | 0.2 | Low temp for factual answers |
| `MAX_FILE_SIZE_MB` | 50 | Max upload size |
| `VECTOR_STORE` | `chroma` | Switch to `pinecone` for prod |
| `EMBEDDING_MODEL` | `text-embedding-3-small` | Cost-efficient, 1536-dim |

---

## 🗓️ Roadmap

- [ ] Streaming responses (SSE) for long answers
- [ ] Multi-document cross-referencing in a single query
- [ ] Table-aware chunking for Excel/CSV (preserve row context)
- [ ] OCR pipeline for scanned PDFs (Tesseract integration)
- [ ] Re-ranking layer (Cohere Rerank API) for better retrieval precision
- [ ] Per-document permission controls (share docs across users)
- [ ] Query history + favourite answers
- [ ] Pinecone migration guide for production scale

---

## 📄 License

MIT License. See `LICENSE` for details.
