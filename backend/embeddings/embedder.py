"""Embedding Service — generates vector embeddings via Google Gemini or local SentenceTransformers."""

import time
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, GoogleAPIError
from config import settings
from utils.logger import logger

_gemini_configured = False
_local_model = None


def _ensure_gemini_configured():
    global _gemini_configured
    if not _gemini_configured:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError(
                "GEMINI_API_KEY is not set. Add it to your .env file."
            )
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_configured = True


def _get_local_model():
    global _local_model
    if _local_model is None:
        logger.info("Initializing local SentenceTransformer model 'all-mpnet-base-v2' (768 dimensions)...")
        try:
            from sentence_transformers import SentenceTransformer
            # Load on CPU for safety and compatibility
            _local_model = SentenceTransformer('all-mpnet-base-v2', device="cpu")
            logger.info("Local SentenceTransformer model initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize local SentenceTransformer model: {e}")
            raise RuntimeError(
                "Failed to load local embedding model. Make sure sentence-transformers is installed."
            ) from e
    return _local_model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of texts using the configured provider (gemini or local)."""
    if not texts:
        return []

    provider = (settings.EMBEDDING_PROVIDER or "gemini").lower().strip()

    if provider == "local":
        return _embed_texts_local(texts)
    else:
        try:
            return _embed_texts_gemini(texts)
        except ResourceExhausted as e:
            msg = (
                "\n"
                "========================================================================================\n"
                "❌ GEMINI DAILY EMBEDDING QUOTA EXHAUSTED (1,000/day limit on Free API keys).\n"
                "To fix this immediately, please open your .env file and update:\n"
                "  EMBEDDING_PROVIDER=local\n"
                "This will seamlessly switch your embeddings to a local CPU-based 768-dimension model.\n"
                "========================================================================================"
            )
            logger.error(msg)
            raise RuntimeError(f"Gemini API Quota Exhausted. {msg}") from e


def embed_query(text: str) -> list[float]:
    """Generate embedding for a single query string."""
    provider = (settings.EMBEDDING_PROVIDER or "gemini").lower().strip()

    if provider == "local":
        return _embed_query_local(text)
    else:
        try:
            return _embed_query_gemini(text)
        except ResourceExhausted as e:
            msg = (
                "Gemini daily embedding quota exhausted. Please set EMBEDDING_PROVIDER=local in your .env file."
            )
            logger.error(msg)
            raise RuntimeError(msg) from e


def _embed_texts_gemini(texts: list[str]) -> list[list[float]]:
    """Generate embeddings via Gemini."""
    _ensure_gemini_configured()
    
    embeddings = []
    batch_size = 90  # Safe batch size for Gemini embedding requests
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        
        # Exponential backoff retry loop
        retries = 5
        delay = 2.0
        for attempt in range(retries):
            try:
                model_name = settings.EMBEDDING_MODEL
                result = genai.embed_content(
                    model=model_name,
                    content=batch,
                    task_type="retrieval_document",
                    output_dimensionality=settings.EMBEDDING_DIMENSION
                )
                embeddings.extend(result['embedding'])
                break
            except (ResourceExhausted, GoogleAPIError) as e:
                if attempt == retries - 1:
                    raise
                logger.warning(f"Gemini Embedding rate limit hit: {e}. Retrying in {delay}s...")
                time.sleep(delay)
                delay *= 2.0
            except Exception as e:
                logger.error(f"Unexpected error during embedding: {e}")
                raise

    return embeddings


def _embed_query_gemini(text: str) -> list[float]:
    """Generate query embedding via Gemini."""
    _ensure_gemini_configured()
    
    retries = 3
    delay = 1.0
    for attempt in range(retries):
        try:
            model_name = settings.EMBEDDING_MODEL
            result = genai.embed_content(
                model=model_name,
                content=text,
                task_type="retrieval_query",
                output_dimensionality=settings.EMBEDDING_DIMENSION
            )
            return result['embedding']
        except (ResourceExhausted, GoogleAPIError) as e:
            if attempt == retries - 1:
                raise
            time.sleep(delay)
            delay *= 2.0


def _embed_texts_local(texts: list[str]) -> list[list[float]]:
    """Generate embeddings locally using sentence-transformers."""
    model = _get_local_model()
    logger.info(f"Embedding {len(texts)} texts locally on CPU...")
    embeddings = model.encode(texts, show_progress_bar=False)
    return embeddings.tolist()


def _embed_query_local(text: str) -> list[float]:
    """Generate query embedding locally using sentence-transformers."""
    model = _get_local_model()
    embedding = model.encode(text, show_progress_bar=False)
    return embedding.tolist()
