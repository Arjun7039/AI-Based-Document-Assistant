"""Embedding Service — generates vector embeddings via Google Gemini or local SentenceTransformers.

Optimized for large documents (500+ pages) with batched processing, progress logging,
and rate-limit aware pacing.
"""

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


def embed_texts(texts: list[str], progress_callback=None) -> list[list[float]]:
    """Generate embeddings for a list of texts using the configured provider (gemini or local).

    Args:
        texts: List of text strings to embed.
        progress_callback: Optional callable(current_batch, total_batches) for progress tracking.
    """
    if not texts:
        return []

    provider = (settings.EMBEDDING_PROVIDER or "gemini").lower().strip()

    if provider == "local":
        return _embed_texts_local(texts, progress_callback)
    else:
        try:
            return _embed_texts_gemini(texts, progress_callback)
        except ResourceExhausted as e:
            logger.warning(
                "Gemini API Quota Exhausted! Automatically falling back to local SentenceTransformer embeddings..."
            )
            return _embed_texts_local(texts, progress_callback)
        except Exception as e:
            logger.error(f"Gemini embedding failed with an unexpected error: {e}. Falling back to local embeddings...")
            return _embed_texts_local(texts, progress_callback)


def embed_query(text: str) -> list[float]:
    """Generate embedding for a single query string."""
    provider = (settings.EMBEDDING_PROVIDER or "gemini").lower().strip()

    if provider == "local":
        return _embed_query_local(text)
    else:
        try:
            return _embed_query_gemini(text)
        except ResourceExhausted as e:
            logger.warning("Gemini query embedding quota exhausted. Falling back to local embeddings...")
            return _embed_query_local(text)
        except Exception as e:
            logger.error(f"Gemini query embedding failed: {e}. Falling back to local embeddings...")
            return _embed_query_local(text)


def _embed_texts_gemini(texts: list[str], progress_callback=None) -> list[list[float]]:
    """Generate embeddings via Gemini with concurrent batched processing for speed."""
    _ensure_gemini_configured()

    import concurrent.futures

    embeddings_map = {}
    batch_size = 90  # Safe batch size for Gemini embedding requests
    batches = []
    
    for i in range(0, len(texts), batch_size):
        batches.append(texts[i : i + batch_size])
        
    total_batches = len(batches)
    logger.info(f"Embedding {len(texts)} texts via Gemini in {total_batches} batches (batch_size={batch_size}) concurrently")

    def process_batch(idx, batch):
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
                return idx, result['embedding']
            except (ResourceExhausted, GoogleAPIError) as e:
                if attempt == retries - 1:
                    raise
                logger.warning(f"Gemini Embedding rate limit hit on batch {idx}: {e}. Retrying in {delay}s...")
                time.sleep(delay)
                delay *= 2.0
            except Exception as e:
                logger.error(f"Unexpected error during embedding on batch {idx}: {e}")
                raise

    completed_batches = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(process_batch, i, batch): i for i, batch in enumerate(batches)}
        
        for future in concurrent.futures.as_completed(futures):
            idx, batch_embeddings = future.result()
            embeddings_map[idx] = batch_embeddings
            
            completed_batches += 1
            if progress_callback:
                progress_callback(completed_batches, total_batches)
            
            if completed_batches % 5 == 0 or completed_batches == total_batches:
                logger.info(f"  Gemini embedding progress: batch {completed_batches}/{total_batches}")

    # Reconstruct in original order
    final_embeddings = []
    for i in range(total_batches):
        final_embeddings.extend(embeddings_map[i])

    return final_embeddings


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


def _embed_texts_local(texts: list[str], progress_callback=None) -> list[list[float]]:
    """Generate embeddings locally using sentence-transformers with batched processing.

    Processes in batches of 64 to prevent OOM on large documents (500+ pages).
    """
    model = _get_local_model()
    batch_size = 64
    total_batches = (len(texts) + batch_size - 1) // batch_size

    logger.info(f"Embedding {len(texts)} texts locally in {total_batches} batches (batch_size={batch_size})")

    all_embeddings = []
    for batch_idx in range(total_batches):
        start = batch_idx * batch_size
        end = min(start + batch_size, len(texts))
        batch = texts[start:end]

        batch_embeddings = model.encode(batch, show_progress_bar=False)
        all_embeddings.extend(batch_embeddings.tolist())

        # Progress callback
        if progress_callback:
            progress_callback(batch_idx + 1, total_batches)

        if (batch_idx + 1) % 10 == 0 or batch_idx == total_batches - 1:
            logger.info(f"  Local embedding progress: batch {batch_idx + 1}/{total_batches} "
                        f"({len(all_embeddings)}/{len(texts)} vectors)")

    return all_embeddings


def _embed_query_local(text: str) -> list[float]:
    """Generate query embedding locally using sentence-transformers."""
    model = _get_local_model()
    embedding = model.encode(text, show_progress_bar=False)
    return embedding.tolist()
