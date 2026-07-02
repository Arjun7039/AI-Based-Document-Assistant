"""Embedding Service — generates vector embeddings via HuggingFace Inference API, Google Gemini, or local SentenceTransformers.

Optimized for large documents (500+ pages) with batched processing, progress logging,
and rate-limit aware pacing with jittered backoff.

Provider priority:
  1. huggingface  — Free GPU inference via HuggingFace Inference API (fastest free option)
  2. gemini       — Paid Google Gemini Embedding API
  3. local        — Local CPU inference via SentenceTransformers (slowest, no API needed)
"""

import time
import random
import httpx
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, GoogleAPIError
from config import settings
from utils.logger import logger

_gemini_configured = False
_local_model = None

# ─── HuggingFace Inference API Config ───
HF_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
HF_API_URL = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{HF_MODEL_ID}"
HF_BATCH_SIZE = 128  # Max texts per API call (HF handles up to ~128 well)


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
        logger.info("Initializing local SentenceTransformer model 'all-MiniLM-L6-v2' (384 dimensions)...")
        try:
            from sentence_transformers import SentenceTransformer
            # Load on CPU. This model is only ~80MB, so it easily fits in Render's 512MB free tier!
            _local_model = SentenceTransformer('all-MiniLM-L6-v2', device="cpu")
            logger.info("Local SentenceTransformer model initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize local SentenceTransformer model: {e}")
            raise RuntimeError(
                "Failed to load local embedding model. Make sure sentence-transformers is installed."
            ) from e
    return _local_model


# ═══════════════════════════════════════════════════════════════════════════════
#  Public API
# ═══════════════════════════════════════════════════════════════════════════════


def embed_texts(texts: list[str], progress_callback=None) -> list[list[float]]:
    """Generate embeddings for a list of texts using the configured provider.

    Provider fallback chain:
      huggingface → local (if HF API fails)
      gemini → local (if Gemini quota exhausted)
      local (always works, just slower)

    Args:
        texts: List of text strings to embed.
        progress_callback: Optional callable(current_batch, total_batches) for progress tracking.
    """
    if not texts:
        return []

    provider = (settings.EMBEDDING_PROVIDER or "huggingface").lower().strip()

    if provider == "huggingface":
        try:
            return _embed_texts_huggingface(texts, progress_callback)
        except Exception as e:
            logger.warning(f"HuggingFace API failed: {e}. Falling back to local embeddings...")
            return _embed_texts_local(texts, progress_callback)

    elif provider == "local":
        return _embed_texts_local(texts, progress_callback)

    else:  # gemini or any other
        try:
            return _embed_texts_gemini(texts, progress_callback)
        except ResourceExhausted as e:
            if settings.APP_ENV == "production":
                raise RuntimeError("Gemini API exhausted please try again after some time")
            logger.warning(
                "Gemini API Quota Exhausted! Automatically falling back to local SentenceTransformer embeddings..."
            )
            return _embed_texts_local(texts, progress_callback)
        except Exception as e:
            logger.error(f"Gemini embedding failed with an unexpected error: {e}. Falling back to local embeddings...")
            return _embed_texts_local(texts, progress_callback)


def embed_query(text: str) -> list[float]:
    """Generate embedding for a single query string."""
    provider = (settings.EMBEDDING_PROVIDER or "huggingface").lower().strip()

    if provider == "huggingface":
        try:
            return _embed_query_huggingface(text)
        except Exception as e:
            logger.warning(f"HuggingFace query embedding failed: {e}. Falling back to local...")
            return _embed_query_local(text)

    elif provider == "local":
        return _embed_query_local(text)

    else:  # gemini
        try:
            return _embed_query_gemini(text)
        except ResourceExhausted as e:
            if settings.APP_ENV == "production":
                raise RuntimeError("Gemini API exhausted please try again after some time")
            logger.warning("Gemini query embedding quota exhausted. Falling back to local embeddings...")
            return _embed_query_local(text)
        except Exception as e:
            logger.error(f"Gemini query embedding failed: {e}. Falling back to local embeddings...")
            return _embed_query_local(text)


# ═══════════════════════════════════════════════════════════════════════════════
#  HuggingFace Inference API (FREE — GPU-accelerated on HF servers)
# ═══════════════════════════════════════════════════════════════════════════════


def _hf_headers() -> dict:
    """Build HTTP headers for HuggingFace API. Token is optional but recommended."""
    headers = {"Content-Type": "application/json"}
    token = settings.HUGGINGFACE_API_TOKEN
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _hf_embed_batch(texts: list[str], batch_index: int = 0) -> list[list[float]]:
    """Send a batch of texts to HuggingFace Inference API and return embeddings.

    Handles cold starts (model loading on HF servers) with retries.
    """
    retries = 4
    delay = 5.0  # Initial delay — HF model cold start can take up to 20s

    for attempt in range(retries):
        try:
            with httpx.Client(timeout=120.0) as client:
                response = client.post(
                    HF_API_URL,
                    headers=_hf_headers(),
                    json={"inputs": texts, "options": {"wait_for_model": True}},
                )

            if response.status_code == 200:
                embeddings = response.json()
                # HuggingFace returns list of list of floats for feature-extraction
                # For sentence-transformers models, each text → [384] float vector
                # But the API wraps each in an extra list: [[384 floats]] per text
                # We need to handle both cases
                result = []
                for emb in embeddings:
                    if isinstance(emb[0], list):
                        # Model returned token-level embeddings, mean-pool them
                        import numpy as np
                        pooled = list(np.mean(emb, axis=0).tolist())
                        result.append(pooled)
                    else:
                        result.append(emb)
                return result

            elif response.status_code == 503:
                # Model is loading (cold start) — wait and retry
                estimated_time = response.json().get("estimated_time", delay)
                wait_time = min(estimated_time + 2, 30)
                logger.info(f"HuggingFace model loading (cold start), waiting {wait_time:.0f}s...")
                time.sleep(wait_time)
                continue

            elif response.status_code == 429:
                # Rate limited
                jitter = random.uniform(0.5, 1.5)
                wait_time = delay * jitter
                logger.warning(f"HuggingFace rate limit hit on batch {batch_index}. Retrying in {wait_time:.1f}s...")
                time.sleep(wait_time)
                delay *= 2.0
                continue

            else:
                error_msg = response.text[:200]
                raise RuntimeError(f"HuggingFace API error {response.status_code}: {error_msg}")

        except httpx.TimeoutException:
            if attempt == retries - 1:
                raise RuntimeError(f"HuggingFace API timeout after {retries} attempts on batch {batch_index}")
            logger.warning(f"HuggingFace API timeout on batch {batch_index}, retrying...")
            time.sleep(delay)
            delay *= 1.5

    raise RuntimeError(f"HuggingFace API failed after {retries} retries on batch {batch_index}")


def _embed_texts_huggingface(texts: list[str], progress_callback=None) -> list[list[float]]:
    """Generate embeddings via HuggingFace Inference API with batched processing.

    Processes in batches of 128 texts per API call. Handles documents of any size
    (tested with 500+ chunks from 100+ page documents).
    """
    batch_size = HF_BATCH_SIZE
    batches = [texts[i:i + batch_size] for i in range(0, len(texts), batch_size)]
    total_batches = len(batches)

    logger.info(
        f"Embedding {len(texts)} texts via HuggingFace Inference API "
        f"(model={HF_MODEL_ID}) in {total_batches} batch(es)"
    )

    all_embeddings = []
    for batch_idx, batch in enumerate(batches):
        batch_embeddings = _hf_embed_batch(batch, batch_index=batch_idx)
        all_embeddings.extend(batch_embeddings)

        if progress_callback:
            progress_callback(batch_idx + 1, total_batches)

        if (batch_idx + 1) % 5 == 0 or batch_idx == total_batches - 1:
            logger.info(
                f"  HuggingFace embedding progress: batch {batch_idx + 1}/{total_batches} "
                f"({len(all_embeddings)}/{len(texts)} vectors)"
            )

        # Small delay between batches to be polite to free tier
        if batch_idx < total_batches - 1:
            time.sleep(0.3)

    logger.info(f"HuggingFace embedding complete: {len(all_embeddings)} vectors generated")
    return all_embeddings


def _embed_query_huggingface(text: str) -> list[float]:
    """Generate query embedding via HuggingFace Inference API."""
    result = _hf_embed_batch([text], batch_index=0)
    return result[0]


# ═══════════════════════════════════════════════════════════════════════════════
#  Gemini Embedding API (Paid)
# ═══════════════════════════════════════════════════════════════════════════════


def _embed_texts_gemini(texts: list[str], progress_callback=None) -> list[list[float]]:
    """Generate embeddings via Gemini with concurrent batched processing for speed.

    Uses jittered exponential backoff to avoid thundering herd on rate limits.
    """
    _ensure_gemini_configured()

    import concurrent.futures

    embeddings_map = {}
    batch_size = 90  # Safe batch size for Gemini embedding requests
    batches = []
    
    for i in range(0, len(texts), batch_size):
        batches.append(texts[i : i + batch_size])
        
    total_batches = len(batches)
    logger.info(f"Embedding {len(texts)} texts via Gemini in {total_batches} batches (batch_size={batch_size}) concurrently")

    # Use 1 worker in development to prevent hitting burst limits, 2 in production
    max_workers = 2 if settings.APP_ENV == "production" else 1

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
                # Jittered exponential backoff to prevent thundering herd
                jitter = random.uniform(0.5, 1.5)
                wait_time = delay * jitter
                logger.warning(f"Gemini API rate limit hit on batch {idx} (Retrying in {wait_time:.1f}s...)")
                time.sleep(wait_time)
                delay *= 2.0
            except Exception as e:
                logger.error(f"Unexpected error during embedding on batch {idx}: {e}")
                raise

    completed_batches = 0

    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        # Submit tasks with a slight delay to prevent hitting burst limits instantly
        futures = {}
        for i, batch in enumerate(batches):
            futures[executor.submit(process_batch, i, batch)] = i
            # Strict pacing: wait 5s in production to stay safely under the 15 RPM limit (12 RPM max)
            delay_sec = 5.0 if settings.APP_ENV == "production" else 0.5
            time.sleep(delay_sec)
            
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
            jitter = random.uniform(0.5, 1.5)
            time.sleep(delay * jitter)
            delay *= 2.0


# ═══════════════════════════════════════════════════════════════════════════════
#  Local SentenceTransformers (Free — CPU, slower)
# ═══════════════════════════════════════════════════════════════════════════════


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
