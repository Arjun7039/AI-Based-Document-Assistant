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
import google.generativeai as genai
from google.api_core.exceptions import ResourceExhausted, GoogleAPIError
from config import settings
from utils.logger import logger

_gemini_configured = False
_local_model = None

# ─── HuggingFace Inference API Config ───
HF_MODEL_ID = "sentence-transformers/all-MiniLM-L6-v2"
HF_BATCH_SIZE = 128  # Max texts per API call (HF handles up to ~128 well)
HF_MAX_WORKERS = 3   # Concurrent batch requests — bounded to stay under free-tier rate limits


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
        logger.info("Initializing local SentenceTransformer model 'sentence-transformers/all-MiniLM-L6-v2'...")
        try:
            import torch
            import os
            # Use all available CPU cores for PyTorch C++ matrix multiplications
            num_threads = max(1, os.cpu_count() or 4)
            try:
                torch.set_num_threads(num_threads)
                logger.info(f"PyTorch configured to use {num_threads} CPU threads")
            except Exception:
                pass

            from sentence_transformers import SentenceTransformer
            _local_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
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
            if settings.GEMINI_API_KEY:
                logger.warning(f"HuggingFace API failed: {e}. Falling back to fast Gemini cloud embeddings...")
                try:
                    return _embed_texts_gemini(texts, progress_callback)
                except Exception as gemini_err:
                    logger.warning(f"Gemini fallback failed ({gemini_err}). Falling back to local embeddings...")
            else:
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
            if settings.GEMINI_API_KEY:
                logger.warning(f"HuggingFace query embedding failed: {e}. Falling back to Gemini...")
                try:
                    return _embed_query_gemini(text)
                except Exception:
                    pass
            logger.warning(f"Falling back to local query embedding...")
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

# Try multiple endpoints — Render blocks api-inference.huggingface.co DNS
# so we prioritize router.huggingface.co (confirmed working on Render)
HF_ENDPOINTS = [
    # Router endpoint (works on router.huggingface.co)
    f"https://router.huggingface.co/models/{HF_MODEL_ID}",
    # Legacy / direct API endpoints
    f"https://api-inference.huggingface.co/models/{HF_MODEL_ID}",
]

_working_hf_endpoint = None  # Cache tuple: (endpoint_url, use_auth)


def _hf_headers(use_auth: bool = True) -> dict:
    """Build HTTP headers for HuggingFace API."""
    headers = {"Content-Type": "application/json"}
    token = settings.HUGGINGFACE_API_TOKEN
    if use_auth and token:
        headers["Authorization"] = f"Bearer {token}"
    return headers


def _find_working_endpoint() -> tuple[str, bool]:
    """Test all HF endpoints and return tuple (endpoint_url, use_auth)."""
    global _working_hf_endpoint
    if _working_hf_endpoint:
        return _working_hf_endpoint

    import requests
    import socket

    # First, run DNS diagnostics
    for host in ['api-inference.huggingface.co', 'router.huggingface.co', 'huggingface.co']:
        try:
            ip = socket.getaddrinfo(host, 443)[0][4][0]
            logger.info(f"DNS OK: {host} -> {ip}")
        except Exception as e:
            logger.warning(f"DNS FAIL: {host} -> {e}")

    # Try each endpoint
    for endpoint in HF_ENDPOINTS:
        try:
            logger.info(f"Testing HuggingFace endpoint: {endpoint}")
            response = requests.post(
                endpoint,
                headers=_hf_headers(use_auth=True),
                json={"inputs": "test", "options": {"wait_for_model": True}},
                timeout=30,
            )
            if response.status_code in [200, 503]:  # 503 = model loading, but endpoint works
                _working_hf_endpoint = (endpoint, True)
                logger.info(f"✅ Using HuggingFace endpoint: {endpoint}")
                return _working_hf_endpoint
            elif response.status_code == 403:
                logger.info(f"Token returned 403, testing unauthenticated request to {endpoint}...")
                resp_no_auth = requests.post(
                    endpoint,
                    headers=_hf_headers(use_auth=False),
                    json={"inputs": "test", "options": {"wait_for_model": True}},
                    timeout=30,
                )
                if resp_no_auth.status_code in [200, 503]:
                    _working_hf_endpoint = (endpoint, False)
                    logger.info(f"✅ Using HuggingFace endpoint (unauthenticated): {endpoint}")
                    return _working_hf_endpoint
                else:
                    logger.warning(f"Endpoint returned {response.status_code} (token) / {resp_no_auth.status_code} (no auth): {endpoint}")
            else:
                logger.warning(f"Endpoint returned {response.status_code}: {endpoint}")
        except Exception as e:
            logger.warning(f"Endpoint unreachable: {endpoint} -> {e}")

    raise RuntimeError(
        "All HuggingFace API endpoints are unreachable. "
        "Check network connectivity or set EMBEDDING_PROVIDER=local"
    )


def _hf_embed_batch(texts: list[str], batch_index: int = 0) -> list[list[float]]:
    """Send a batch of texts to HuggingFace Inference API and return embeddings.

    Tries multiple API endpoints and caches the working one.
    """
    import requests
    import numpy as np

    endpoint, use_auth = _find_working_endpoint()
    retries = 4
    delay = 5.0

    for attempt in range(retries):
        try:
            response = requests.post(
                endpoint,
                headers=_hf_headers(use_auth=use_auth),
                json={"inputs": texts, "options": {"wait_for_model": True}},
                timeout=120,
            )

            if response.status_code == 200:
                embeddings = response.json()
                result = []
                for emb in embeddings:
                    if isinstance(emb, list) and len(emb) > 0 and isinstance(emb[0], list):
                        # Token-level embeddings → mean-pool
                        pooled = np.mean(emb, axis=0).tolist()
                        result.append(pooled)
                    else:
                        result.append(emb)
                return result

            elif response.status_code == 503:
                # Model loading (cold start)
                body = response.json() if response.headers.get('content-type', '').startswith('application/json') else {}
                estimated_time = body.get("estimated_time", delay)
                wait_time = min(estimated_time + 2, 30)
                logger.info(f"HuggingFace model loading (cold start), waiting {wait_time:.0f}s...")
                time.sleep(wait_time)
                continue

            elif response.status_code == 429:
                jitter = random.uniform(0.5, 1.5)
                wait_time = delay * jitter
                logger.warning(f"HuggingFace rate limit on batch {batch_index}. Retrying in {wait_time:.1f}s...")
                time.sleep(wait_time)
                delay *= 2.0
                continue

            else:
                error_msg = response.text[:300]
                raise RuntimeError(f"HuggingFace API error {response.status_code}: {error_msg}")

        except requests.exceptions.ConnectionError as e:
            if attempt == retries - 1:
                raise
            logger.warning(f"HuggingFace connection error on batch {batch_index} (attempt {attempt+1}): {e}")
            # Reset cached endpoint — maybe a different one works
            global _working_hf_endpoint
            _working_hf_endpoint = None
            time.sleep(delay)
            delay *= 1.5

        except requests.exceptions.Timeout:
            if attempt == retries - 1:
                raise RuntimeError(f"HuggingFace API timeout after {retries} attempts on batch {batch_index}")
            logger.warning(f"HuggingFace API timeout on batch {batch_index}, retrying...")
            time.sleep(delay)
            delay *= 1.5

    raise RuntimeError(f"HuggingFace API failed after {retries} retries on batch {batch_index}")


def _embed_texts_huggingface(texts: list[str], progress_callback=None) -> list[list[float]]:
    """Generate embeddings via HuggingFace Inference API with concurrent batched processing.

    Sends up to HF_MAX_WORKERS batches in parallel (each of HF_BATCH_SIZE texts)
    and reconstructs results in original order. Falls back internally per-batch
    via _hf_embed_batch's retry logic.
    """
    import concurrent.futures

    batch_size = HF_BATCH_SIZE
    batches = [texts[i:i + batch_size] for i in range(0, len(texts), batch_size)]
    total_batches = len(batches)

    # Single small document → skip the executor machinery entirely
    if total_batches <= 1:
        return _hf_embed_batch(batches[0] if batches else [], batch_index=0)

    logger.info(
        f"Embedding {len(texts)} texts via HuggingFace Inference API "
        f"(model={HF_MODEL_ID}) in {total_batches} concurrent batch(es), "
        f"max_workers={HF_MAX_WORKERS}"
    )

    embeddings_map = {}
    completed = 0

    def process_batch(idx: int, batch: list[str]):
        result = _hf_embed_batch(batch, batch_index=idx)
        return idx, result

    with concurrent.futures.ThreadPoolExecutor(max_workers=HF_MAX_WORKERS) as executor:
        futures = [executor.submit(process_batch, i, batch) for i, batch in enumerate(batches)]
        for future in concurrent.futures.as_completed(futures):
            idx, batch_embeddings = future.result()
            embeddings_map[idx] = batch_embeddings

            completed += 1
            if progress_callback:
                progress_callback(completed, total_batches)

            if completed % 5 == 0 or completed == total_batches:
                done_vectors = sum(len(v) for v in embeddings_map.values())
                logger.info(
                    f"  HuggingFace embedding progress: batch {completed}/{total_batches} "
                    f"({done_vectors}/{len(texts)} vectors)"
                )

    # Reconstruct in original order (raises here if any batch ultimately failed)
    all_embeddings = []
    for i in range(total_batches):
        all_embeddings.extend(embeddings_map[i])

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
                model_name = settings.EMBEDDING_MODEL if "text-embedding" in str(settings.EMBEDDING_MODEL) else "models/text-embedding-004"
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
            model_name = settings.EMBEDDING_MODEL if "text-embedding" in str(settings.EMBEDDING_MODEL) else "models/text-embedding-004"
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
    """Generate embeddings locally using sentence-transformers with multi-threaded C++ batch processing."""
    model = _get_local_model()
    batch_size = 128
    total_batches = (len(texts) + batch_size - 1) // batch_size
    logger.info(f"Embedding {len(texts)} texts locally in {total_batches} batch(es) (batch_size={batch_size})")

    # Pass full text list directly to SentenceTransformer for PyTorch C++ SIMD parallelization
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        convert_to_numpy=True,
        normalize_embeddings=True,
    )
    if progress_callback:
        progress_callback(total_batches, total_batches)

    logger.info(f"Local C++ embedding complete: {len(embeddings)} vectors generated")
    return embeddings.tolist()


def _embed_query_local(text: str) -> list[float]:
    """Generate query embedding locally using sentence-transformers."""
    model = _get_local_model()
    embedding = model.encode(text, show_progress_bar=False)
    return embedding.tolist()
