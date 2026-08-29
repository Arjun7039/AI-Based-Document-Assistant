# 📄 DocMind — Production-Grade RAG Document Intelligence Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React_18_|_Vite-61DAFB.svg?style=flat&logo=react)](https://reactjs.org/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?style=flat&logo=python)](https://python.org)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**DocMind** is an enterprise-ready, multi-format Retrieval-Augmented Generation (RAG) document intelligence platform. It allows users to upload documents across diverse file formats (PDF, Word, Excel, CSV, PowerPoint, Plain Text, Markdown, JSON, and Images) and query them using natural language with source-grounded accuracy, zero hallucination, and sub-second retrieval latency.

---

## 💡 System Highlights

- ⚡ **Multi-Format & Multimodal Ingestion**: Native parsing support for 16+ file extensions including PDFs, spreadsheets, presentations, and images (`.png`, `.jpg`, `.webp`) processed via Gemini Vision VLM OCR.
- 🛡️ **3-Tier Embedding Resilience**: High-availability fallback chain across HuggingFace Inference Router (`all-MiniLM-L6-v2`) → Google Gemini Embeddings (`text-embedding-004`) → Local SentenceTransformers (PyTorch C++ CPU SIMD).
- 🧠 **3-Tier LLM Reasoning Chain**: Primary generation via `Gemini 3.5 Flash` → Secondary fallback to `Gemini 2.5 Pro` → Tertiary fallback to Groq (`Llama 3.3 70B Versatile`).
- 📐 **Calibrated Context Window Chunking**: `CHUNK_SIZE=900` chars (~220 tokens) meticulously tuned to fit inside `all-MiniLM-L6-v2`'s 256-token context window, eliminating silent vector truncation.
- 🚀 **Dual Vector Store Architecture**: Pinecone vector index for production cloud deployment with seamless local vector store fallback utilizing NumPy matrix algebra for vector cosine similarity calculations.
- 💾 **Resilient Database Layer**: Automatic connection testing for PostgreSQL (Supabase) with seamless local SQLite (`docmind.db`) fallback and idempotent column migrations.
- 🔐 **JWT Authentication & Document Isolation**: Full register/login auth flow with bcrypt hashing and user-level document metadata isolation.

---

## 🏗️ Architecture Overview

```
                                 ┌─────────────────────────────────────────────────────────────┐
                                 │                        FRONTEND                             │
                                 │              React + Vite + Tailwind CSS                    │
                                 │   UploadZone | ChatWindow | SourcePanel | SessionSidebar    │
                                 └────────────────────┬────────────────────────────────────────┘
                                                      │ REST / JWT Auth
                                 ┌────────────────────▼────────────────────────────────────────┐
                                 │                     API GATEWAY                             │
                                 │                  FastAPI (Python)                           │
                                 │  /upload  |  /query  |  /sessions  |  /documents |  /auth   │
                                 └──────┬─────────────┬───────────────┬────────────────────────┘
                                        │             │               │
                                 ┌──────▼──────┐ ┌────▼──────┐ ┌─────▼──────────┐
                                 │  Ingestion  │ │   Query   │ │  Auth / Session │
                                 │  Pipeline   │ │  Engine   │ │    Manager      │
                                 └──────┬──────┘ └────┬──────┘ └────────────────┘
                                        │             │
┌───────────────────────────────────────▼─────────────▼────────────────────────────────────────┐
│                                   CORE RAG SERVICES                                          │
│                                                                                              │
│   ┌──────────────────────────┐   ┌──────────────────────────┐   ┌────────────────────────┐   │
│   │   Document & Image       │   │  3-Tier Embeddings       │   │   3-Tier LLM Chain     │   │
│   │   Parsers                │   │  1. HuggingFace Router   │   │  1. Gemini 3.5 Flash   │   │
│   │  (PDF, DOCX, XLSX, PPTX, │   │  2. Gemini Embedding     │   │  2. Gemini 2.5 Pro     │   │
│   │   CSV, TXT, Images VLM)  │   │  3. Local PyTorch SIMD   │   │  3. Groq Llama 3.3 70B │   │
│   └──────────────────────────┘   └──────────────────────────┘   └────────────────────────┘   │
└───────────────────┬─────────────────────────────┬────────────────────────────────────────────┘
                    │                             │
         ┌──────────▼──────────────┐   ┌──────────▼─────────────┐
         │       Vector DB         │   │     Relational DB      │
         │  Pinecone (Production)  │   │  PostgreSQL (Supabase) │
         │  Local Vector (Dev NumPy│   │  SQLite (Local Fallback│
         └─────────────────────────┘   └────────────────────────┘
```

---

## 🛠️ Tech Stack & Technical Specs

| Component | Tech / Tool | Engineering Rationale |
|---|---|---|
| **Frontend Framework** | React 18 + Vite | Fast HMR, lightweight bundle size, modern component architecture |
| **State & Styling** | Zustand + Tailwind CSS | Global UI state management + glassmorphism/dark mode utility design |
| **API Framework** | FastAPI (Python 3.11+) | Async I/O, OpenAPI auto-docs, Pydantic type validation |
| **Document Parsers** | `pypdf`, `python-docx`, `openpyxl`, `python-pptx`, `pandas` | Specialized native parsing per file format |
| **Multimodal Vision** | Google Gemini Vision API | Extraction of text, charts, diagrams, and visual tables from image files |
| **Chunking Engine** | LangChain `RecursiveCharacterTextSplitter` | Hierarchical recursive splitting preserving paragraph context |
| **Embedding Pipeline** | HuggingFace API Router / Gemini / SentenceTransformers | 3-tier high-availability fallback architecture |
| **Vector Search** | Pinecone (Prod) / Local NumPy Vector Store (Dev) | Cosine similarity query matching with metadata filtering |
| **Primary LLM** | Google Gemini 3.5 Flash | High-speed, high-reasoning primary generation engine |
| **Fallback LLMs** | Gemini 2.5 Pro & Groq `llama-3.3-70b-versatile` | High-reasoning and open-weights fallback tier |
| **Database** | PostgreSQL (Supabase) / SQLite | Auto-fallback relational persistence for sessions, documents, and auth |
| **Authentication** | JWT (python-jose) + bcrypt | Stateful session security and token expiration |

---

## 📂 Project Structure

```
AI Based document assistant/
├── backend/
│   ├── main.py                    # FastAPI application entrypoint & middleware
│   ├── config.py                  # Environment settings & Pydantic validation
│   ├── requirements.txt           # Python dependencies
│   ├── Dockerfile                 # Containerized deployment specification
│   ├── docmind.db                 # SQLite database (autocreated local fallback)
│   │
│   ├── api/
│   │   ├── dependencies.py        # Auth validation & DB session injection
│   │   └── routes/
│   │       ├── auth.py            # POST /auth/register, /auth/login, GET /auth/me
│   │       ├── upload.py          # POST /upload — document ingestion trigger
│   │       ├── documents.py       # GET/DELETE /documents — management & status polling
│   │       ├── query.py           # POST /query — RAG semantic retrieval & answer generation
│   │       └── sessions.py        # GET/DELETE /sessions — session chat history
│   │
│   ├── ingestion/
│   │   ├── parser.py              # Router for document parsers
│   │   ├── chunker.py             # Recursive character text splitter (CHUNK_SIZE=900)
│   │   ├── pipeline.py            # Ingestion workflow: parse -> chunk -> embed -> store
│   │   └── parsers/
│   │       ├── pdf_parser.py      # pypdf text parser
│   │       ├── docx_parser.py     # python-docx parser
│   │       ├── excel_parser.py    # openpyxl sheet & cell parser
│   │       ├── csv_parser.py      # pandas column-aware row serializer
│   │       ├── pptx_parser.py     # python-pptx slide & speaker note parser
│   │       ├── txt_parser.py      # Plain text & JSON parser
│   │       └── image_parser.py    # Gemini Vision OCR & multimodal analysis
│   │
│   ├── embeddings/
│   │   ├── embedder.py            # 3-tier embedding logic (HF Router -> Gemini -> Local PyTorch)
│   │   └── vector_store.py        # Abstraction layer for Pinecone & Local NumPy Store
│   │
│   ├── rag/
│   │   ├── retriever.py           # Semantic search & vector score thresholding
│   │   ├── prompt_builder.py      # System prompt construction & context formatting
│   │   └── generator.py           # LLM generation & 3-tier fallback chain
│   │
│   ├── db/
│   │   └── database.py            # SQLAlchemy engine with Supabase -> SQLite auto-fallback
│   │
│   ├── models/                    # SQLAlchemy database schemas
│   │   ├── user.py                # User accounts & auth credentials
│   │   ├── document.py            # Uploaded file metadata & parsing status
│   │   ├── session.py             # User chat sessions
│   │   └── chat_message.py        # Message history & source citations
│   │
│   └── utils/
│       ├── file_validator.py      # MIME type & file extension validation
│       └── logger.py              # Structured logging utility
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                # Main application component & layout routing
│   │   ├── index.css              # Custom design system & Tailwind directives
│   │   ├── components/
│   │   │   ├── Header.jsx         # App navigation & connection badge
│   │   │   ├── Sidebar.jsx        # Session history & document selection sidebar
│   │   │   ├── LandingPage.jsx    # Product landing page & feature showcases
│   │   │   ├── UploadZone.jsx     # Drag-and-drop document upload interface
│   │   │   ├── DocumentList.jsx   # Uploaded document status tracker
│   │   │   ├── ChatWindow.jsx     # Interactive conversational query UI
│   │   │   ├── MessageBubble.jsx  # Rich message rendering & citation tags
│   │   │   ├── SourcePanel.jsx    # Retrieved chunk source citation viewer
│   │   │   └── AuthWindow.jsx     # User authentication modal
│   │   ├── store/
│   │   │   └── useStore.js        # Zustand global state store
│   │   └── api/
│   │       └── client.js          # Axios API wrapper with request interceptors
│   ├── index.html
│   └── vite.config.js
│
├── render.yaml                    # Render cloud backend deployment config
├── .env.example                   # Template environment variables
└── README.md                      # Complete system documentation & interview guide
```

---

## ⚙️ Environment Variables Setup

Create a `.env` file in the project root directory (or copy from `.env.example`):

```env
# ─── Application Mode ───
APP_ENV=development

# ─── 1. Relational Database ───
# Primary PostgreSQL (Supabase). If unreachable, system auto-falls back to sqlite:///./docmind.db
DATABASE_URL=postgresql://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres

# ─── 2. LLM Engine Keys ───
GEMINI_API_KEY=your_google_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# ─── 3. Embeddings Engine Config ───
EMBEDDING_PROVIDER=huggingface   # Provider chain: "huggingface" | "gemini" | "local"
HUGGINGFACE_API_TOKEN=your_huggingface_api_token
EMBEDDING_MODEL=models/gemini-embedding-2
EMBEDDING_DIMENSION=384

# ─── 4. Vector Database ───
VECTOR_STORE=chroma               # "pinecone" for production cloud | "chroma" for local NumPy store
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX=docmind

# ─── 5. Authentication (JWT) ───
JWT_SECRET_KEY=your_super_secret_jwt_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080

# ─── 6. RAG Parameters ───
CHUNK_SIZE=900                   # 900 chars ≈ 220 tokens (tuned for MiniLM-L6-v2)
CHUNK_OVERLAP=150
TOP_K_RETRIEVAL=8
LLM_MODEL=gemini-3.5-flash
LLM_FALLBACK_MODEL=gemini-2.5-pro
LLM_TEMPERATURE=0.2

# ─── 7. CORS Security ───
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 🚀 Execution & Quickstart Guide

### Prerequisites
- **Python**: `v3.11` or higher
- **Node.js**: `v18` or higher

### 1. Clone & Set Up Environment
```bash
git clone https://github.com/Arjun7039/AI-Based-Document-Assistant.git
cd AI-Based-Document-Assistant
cp .env.example .env
```

### 2. Launch Backend (FastAPI)
```bash
cd backend
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# Linux / macOS:
# source venv/bin/activate

pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```
*The FastAPI backend will start on `http://localhost:8000` with Interactive Swagger Docs at `http://localhost:8000/docs`.*

### 3. Launch Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
*The frontend user interface will open at `http://localhost:5173`.*

---

## 📦 Supported File Formats

| Category | Extension | Ingestion Handler | Parsing & Extraction Logic |
|---|---|---|---|
| **PDF Documents** | `.pdf` | `pypdf` | Extracts structured text page by page |
| **Word Files** | `.docx` | `python-docx` | Iterates over paragraphs, headings, and document tables |
| **Excel Spreadsheets** | `.xlsx`, `.xls` | `openpyxl` + `pandas` | Converts workbooks and sheets into row-level contextual text strings |
| **CSV Files** | `.csv` | `pandas` | Performs column-aware row serialization |
| **PowerPoint** | `.pptx` | `python-pptx` | Extracts slide text shapes and speaker notes |
| **Plain Text / Code** | `.txt`, `.md`, `.json` | Built-in | Reads text with UTF-8 encoding & JSON pretty-printing |
| **Images & Charts** | `.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`, `.tiff` | Gemini Vision VLM | Extracts visual text (OCR), charts, graphs, tables, and visual layout descriptions |

---

## 📡 API Reference

### 🔐 Auth Endpoints
- `POST /api/auth/register` — Create user account (`email`, `password`, `full_name`)
- `POST /api/auth/login` — Authenticate and receive JWT bearer token
- `GET /api/auth/me` — Retrieve logged-in user profile

### 📄 Ingestion & Document Management
- `POST /api/upload` — Ingest document/image file asynchronously via `BackgroundTasks`
- `GET /api/documents/{id}/status` — Poll background ingestion progress percentage (`0-100%`)
- `DELETE /api/documents/{id}` — Delete document record and purge vector embeddings

### 🔍 RAG Query Engine
- `POST /api/query` — Execute semantic vector search and generate LLM answer
  ```json
  {
    "question": "What is the Q3 operating margin reported in the financial document?",
    "session_id": "sess_12345",
    "document_ids": ["doc_98765"],
    "top_k": 5
  }
  ```

---

## 🧩 Ingestion & RAG Deep-Dive Architecture

### 1. Vector Window Calibration (`CHUNK_SIZE=900`)
Many standard RAG implementations naively set `CHUNK_SIZE=1500` or `2000` while using `all-MiniLM-L6-v2` as an embedder. Because `all-MiniLM-L6-v2` has a hard token limit of 256 tokens (~1000 characters), chunks >1000 characters suffer **silent truncation**, discarding critical information.
DocMind calibrates `CHUNK_SIZE=900` chars (~220 tokens) with `CHUNK_OVERLAP=150`, guaranteeing **zero token truncation** during vectorization.

### 2. High-Availability Embedding Architecture
```
                         ┌─────────────────────────────┐
                         │   Primary: HuggingFace API  │
                         │ (Router Endpoint Check)     │
                         └──────────────┬──────────────┘
                                        │ (If connection or API fails)
                         ┌──────────────▼──────────────┐
                         │   Secondary: Gemini Cloud   │
                         │ (text-embedding-004 API)    │
                         └──────────────┬──────────────┘
                                        │ (If API quota exhausted)
                         ┌──────────────▼──────────────┐
                         │   Tertiary: Local PyTorch   │
                         │ (SentenceTransformer CPU)   │
                         └─────────────────────────────┘
```

### 3. High-Performance Local Vector Store (NumPy Vectorized Similarity)
When Pinecone API credentials are not provided, DocMind uses a lightweight, zero-dependency local vector store. Rather than calculating cosine similarity in slow Python `for` loops, DocMind uses **vectorized NumPy matrix multiplication**:
$$\text{Scores} = \frac{M \cdot q}{\|M\| \times \|q\|}$$
This executes vector queries across thousands of embedded chunks in less than **5 milliseconds**.

---

## 🎯 Interview Preparation & Technical FAQ Guide

This section equips you with precise technical answers for interview questions regarding DocMind's design and RAG implementation.

### Q1: What is RAG, and why did you choose it over fine-tuning an LLM?
> **Answer**: RAG (Retrieval-Augmented Generation) combines document vector retrieval with LLM answer generation. I chose RAG over fine-tuning because:
> 1. **Dynamic Knowledge Updates**: Users can upload new documents instantly without needing to retrain or fine-tune models.
> 2. **Zero Hallucination with Source Citations**: The prompt constrains the LLM to rely strictly on retrieved chunk context and cite explicit document filenames and page numbers.
> 3. **Data Privacy**: Grounding answers in user-specific retrieved context prevents proprietary company document data from leaking into public model weights.

### Q2: How did you design your document chunking strategy?
> **Answer**: I used LangChain's `RecursiveCharacterTextSplitter` with `CHUNK_SIZE=900` characters (~220 tokens) and `CHUNK_OVERLAP=150` characters. This choice was specifically driven by the embedding model's context length (`all-MiniLM-L6-v2` has a 256 token limit). Larger chunk sizes (e.g., 1500 chars) would lead to silent vector truncation during embedding.

### Q3: How do you handle service rate limits and API outages in production?
> **Answer**: I implemented multi-tier fallback architectures at two levels:
> - **Embeddings Tier**: Primary HuggingFace API Router → Secondary Google Gemini Embeddings → Tertiary Local PyTorch `SentenceTransformer` CPU execution.
> - **LLM Tier**: Primary `Gemini 3.5 Flash` → Secondary `Gemini 2.5 Pro` → Tertiary Groq `Llama 3.3 70B`.
> - Exponential backoff with random jitter is applied to prevent API rate-limit errors.

### Q4: How does your system process tabular files (Excel/CSV) and Images?
> **Answer**:
> - **Tabular Files**: Standard text splitters destroy table structure. My system uses `pandas` and `openpyxl` to convert table rows into structured, column-attributed text key-value strings prior to chunking.
> - **Images**: DocMind utilizes the Gemini Vision VLM API via `image_parser.py` to extract raw OCR text, chart descriptions, graph data points, and structural layout information.

### Q5: How do you ensure multi-tenant data isolation in vector search?
> **Answer**: Vectors are stored with metadata tags containing `document_id`, `filename`, and `user_id`. When a user submits a query, vector queries enforce strict metadata filter criteria (`filter={"document_id": {"$in": user_doc_ids}}`), ensuring users cannot search or retrieve data from documents owned by other users.

### Q6: How do you handle database failovers?
> **Answer**: The database engine in `db/database.py` tests the primary PostgreSQL (Supabase) pool connection on startup. If Supabase is unreachable or DNS fails, the system automatically falls back to a local SQLite database (`docmind.db`) without crashing the application.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for details.
