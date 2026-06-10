import os
import sys

# Ensure backend directory is on the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from db.database import init_db
from utils.logger import logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting DocMind API...")
    logger.info(f"Environment: {settings.APP_ENV}")
    logger.info(f"Database: {settings.DATABASE_URL.split('://')[0]}")
    logger.info(f"Vector Store: {settings.VECTOR_STORE}")
    logger.info(f"Storage Backend: {settings.STORAGE_BACKEND}")

    # Create database tables
    init_db()
    logger.info("Database tables initialized.")

    # Create upload directory for local storage
    if settings.STORAGE_BACKEND == "local":
        os.makedirs(settings.LOCAL_UPLOAD_DIR, exist_ok=True)
        logger.info(f"Local upload dir: {settings.LOCAL_UPLOAD_DIR}")

    yield

    logger.info("Shutting down DocMind API...")


app = FastAPI(
    title="DocMind API",
    description="RAG-based Document Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ─── CORS Middleware ───
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Health Check ───
@app.get("/api/health")
async def health_check():
    """Health check endpoint used by frontend to detect backend availability."""
    return {"status": "ok", "version": "1.0.0", "env": settings.APP_ENV}


# ─── Diagnostic Check ───
@app.get("/api/debug/config")
async def debug_config():
    """Shows config status (no secrets exposed). Use this to troubleshoot."""
    return {
        "openai_key_set": bool(settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-...")),
        "openai_key_preview": settings.OPENAI_API_KEY[:12] + "..." if settings.OPENAI_API_KEY else "NOT SET",
        "groq_key_set": bool(settings.GROQ_API_KEY and not settings.GROQ_API_KEY.startswith("gsk_...")),
        "vector_store": settings.VECTOR_STORE,
        "storage_backend": settings.STORAGE_BACKEND,
        "database": settings.DATABASE_URL.split("://")[0],
        "env_file_used": str(settings.Config.env_file),
    }


# ─── Register Route Modules ───
from api.routes import upload, documents, query, sessions, auth  # noqa: E402

app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(documents.router, prefix="/api", tags=["Documents"])
app.include_router(query.router, prefix="/api", tags=["Query"])
app.include_router(sessions.router, prefix="/api", tags=["Sessions"])
