"""Ingestion Pipeline — Orchestrates: parse → chunk → embed → store.

Optimized for large documents (500+ pages) with streaming batch processing:
instead of embedding all chunks at once, processes them in batches of
PIPELINE_BATCH_SIZE, embedding and storing each batch before moving to the next.
This prevents OOM errors and API timeouts on large documents.
"""

from ingestion.parser import parse_document
from ingestion.chunker import chunk_text
from embeddings.embedder import embed_texts
from embeddings.vector_store import get_vector_store
from utils.logger import logger

# Number of chunks to embed + store per batch. Increased to 500 for concurrent speed.
PIPELINE_BATCH_SIZE = 500


def run_pipeline(doc_id: str, filename: str, file_type: str, content: bytes, db, progress_callback=None) -> dict:
    """Run the full ingestion pipeline for a document.

    Flow: parse → chunk → (embed → store) in streaming batches

    Args:
        doc_id: Unique document identifier
        filename: Original filename
        file_type: File extension (pdf, docx, etc.)
        content: Raw file bytes
        db: Database session
        progress_callback: Optional callable(stage, percent) for progress tracking.
                          stage is one of: 'parsing', 'chunking', 'embedding', 'storing'
                          percent is 0-100

    Returns:
        dict with keys: pages, chunks_indexed
    """
    logger.info(f"Pipeline START: {filename} ({file_type}, {len(content)} bytes)")

    # Report parsing stage
    if progress_callback:
        progress_callback("parsing", 5)

    # Step 1: Parse document into raw text chunks
    raw_chunks = parse_document(content, filename, file_type)
    pages = max((c.page_number for c in raw_chunks), default=0)
    logger.info(f"Step 1 — Parsed: {len(raw_chunks)} raw sections, {pages} pages")

    if not raw_chunks:
        logger.warning(f"No text extracted from {filename}")
        if progress_callback:
            progress_callback("done", 100)
        return {"pages": 0, "chunks_indexed": 0}

    # Report chunking stage
    if progress_callback:
        progress_callback("chunking", 15)

    # Step 2: Split into smaller, overlapping chunks
    chunks = chunk_text(raw_chunks, doc_id, filename)
    logger.info(f"Step 2 — Chunked: {len(chunks)} chunks")

    if not chunks:
        if progress_callback:
            progress_callback("done", 100)
        return {"pages": pages, "chunks_indexed": 0}

    # Step 3 + 4: Embed and store in streaming batches
    # Instead of embedding ALL chunks at once (which causes OOM/timeouts for large docs),
    # we process in batches of PIPELINE_BATCH_SIZE
    vector_store = get_vector_store()
    total_chunks = len(chunks)
    total_batches = (total_chunks + PIPELINE_BATCH_SIZE - 1) // PIPELINE_BATCH_SIZE
    total_indexed = 0

    logger.info(f"Step 3+4 — Streaming embed+store: {total_chunks} chunks in {total_batches} batches "
                f"(batch_size={PIPELINE_BATCH_SIZE})")

    for batch_idx in range(total_batches):
        start = batch_idx * PIPELINE_BATCH_SIZE
        end = min(start + PIPELINE_BATCH_SIZE, total_chunks)
        batch_chunks = chunks[start:end]

        # Embed this batch
        texts = [c["text"] for c in batch_chunks]
        embeddings = embed_texts(texts)

        # Store this batch in vector database
        vector_store.add(batch_chunks, embeddings, doc_id)
        total_indexed += len(batch_chunks)

        # Report progress: embedding stage spans 20% to 95%
        if progress_callback:
            embed_progress = 20 + int(75 * (batch_idx + 1) / total_batches)
            progress_callback("embedding", min(embed_progress, 95))

        logger.info(f"  Batch {batch_idx + 1}/{total_batches}: embedded+stored {len(batch_chunks)} chunks "
                    f"({total_indexed}/{total_chunks} total)")

    if progress_callback:
        progress_callback("done", 100)

    logger.info(f"Pipeline DONE: {filename} → {total_indexed} chunks indexed across {pages} pages")

    return {
        "pages": pages,
        "chunks_indexed": total_indexed,
    }
