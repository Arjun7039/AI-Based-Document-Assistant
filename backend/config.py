from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path

# Find .env file — check backend/ dir first, then project root
_backend_dir = Path(__file__).resolve().parent
_env_file = _backend_dir / ".env"
if not _env_file.exists():
    _env_file = _backend_dir.parent / ".env"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # ─── App ───
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    # ─── Database ───
    DATABASE_URL: str = "sqlite:///./docmind.db"

    # ─── LLM ───
    GEMINI_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gemini-3.5-flash"
    LLM_TEMPERATURE: float = 0.2
    MAX_CONTEXT_TOKENS: int = 16000

    # ─── Embeddings ───
    EMBEDDING_PROVIDER: str = "gemini"  # "gemini" | "local" | "groq"
    EMBEDDING_MODEL: str = "models/gemini-embedding-2"
    EMBEDDING_DIMENSION: int = 768

    # ─── Vector DB ───
    VECTOR_STORE: str = "chroma"  # "chroma" | "pinecone"
    CHROMA_PERSIST_DIR: str = "./chroma_store"
    PINECONE_API_KEY: Optional[str] = None
    PINECONE_INDEX: str = "docmind"
    PINECONE_ENVIRONMENT: Optional[str] = None

    # ─── File Storage ───
    STORAGE_BACKEND: str = "local"  # "local" | "r2"
    LOCAL_UPLOAD_DIR: str = "./uploads"
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    R2_BUCKET_NAME: str = "docmind-uploads"

    # ─── Auth ───
    JWT_SECRET_KEY: str = "dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ─── RAG Settings ───
    CHUNK_SIZE: int = 800
    CHUNK_OVERLAP: int = 150
    TOP_K_RETRIEVAL: int = 5

    # ─── Upload Limits ───
    MAX_FILE_SIZE_MB: int = 200
    ALLOWED_EXTENSIONS: str = "pdf,docx,xlsx,xls,csv,pptx,txt,md,json,png,jpg,jpeg,webp,gif,bmp,tiff"

    # ─── Redis (production only) ───
    REDIS_URL: Optional[str] = None

    # ─── CORS ───
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    @property
    def allowed_extensions_list(self) -> list[str]:
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    class Config:
        env_file = str(_env_file)
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()

