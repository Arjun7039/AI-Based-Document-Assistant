"""Ingestion Pipeline — Orchestrates: parse → chunk → embed → store."""

from ingestion.parser import parse_document
from ingestion.chunker import chunk_text
from embeddings.embedder import embed_texts
from embeddings.vector_store import get_vector_store
from utils.logger import logger


def run_pipeline(doc_id: str, filename: str, file_type: str, content: bytes, db) -> dict:
    """Run the full ingestion pipeline for a document.

    Flow: parse → chunk → embed → store in vector DB

    Args:
        doc_id: Unique document identifier
        filename: Original filename
        file_type: File extension (pdf, docx, etc.)
        content: Raw file bytes
        db: Database session

    Returns:
        dict with keys: pages, chunks_indexed
    """
    logger.info(f"Pipeline START: {filename} ({file_type}, {len(content)} bytes)")

    # Step 1: Parse document into raw text chunks
    raw_chunks = parse_document(content, filename, file_type)
    pages = max((c.page_number for c in raw_chunks), default=0)
    logger.info(f"Step 1 — Parsed: {len(raw_chunks)} raw sections, {pages} pages")

    if not raw_chunks:
        logger.warning(f"No text extracted from {filename}")
        return {"pages": 0, "chunks_indexed": 0}

    # Step 2: Split into smaller, overlapping chunks
    chunks = chunk_text(raw_chunks, doc_id, filename)
    logger.info(f"Step 2 — Chunked: {len(chunks)} chunks")

    if not chunks:
        return {"pages": pages, "chunks_indexed": 0}

    # No artificial cap on document chunks to ensure full scalability for large documents
    logger.info(f"Indexing all {len(chunks)} chunks for full document coverage")

    # Step 3: Generate embeddings
    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts)
    logger.info(f"Step 3 — Embedded: {len(embeddings)} vectors")

    # Step 4: Store in vector database
    vector_store = get_vector_store()
    vector_store.add(chunks, embeddings, doc_id)
    logger.info(f"Step 4 — Stored in vector DB")

    logger.info(f"Pipeline DONE: {filename} → {len(chunks)} chunks indexed")

    return {
        "pages": pages,
        "chunks_indexed": len(chunks),
    }
