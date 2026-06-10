"""Text Chunker — splits parsed text into smaller chunks for embedding."""

from langchain_text_splitters import RecursiveCharacterTextSplitter
from config import settings
from ingestion import TextChunk
from utils.logger import logger


def chunk_text(raw_chunks: list[TextChunk], document_id: str, filename: str) -> list[dict]:
    """Split raw text chunks into smaller, overlapping pieces.

    Returns a list of dicts with: text, document_id, filename, chunk_index, page_number
    """
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
        length_function=len,
    )

    all_chunks = []
    chunk_index = 0

    for raw in raw_chunks:
        if not raw.text.strip():
            continue

        splits = splitter.split_text(raw.text)

        for split_text in splits:
            all_chunks.append({
                "text": split_text,
                "document_id": document_id,
                "filename": filename,
                "chunk_index": chunk_index,
                "page_number": raw.page_number,
                "section": raw.section,
            })
            chunk_index += 1

    logger.info(f"Chunked {len(raw_chunks)} raw sections → {len(all_chunks)} chunks "
                f"(size={settings.CHUNK_SIZE}, overlap={settings.CHUNK_OVERLAP})")
    return all_chunks
