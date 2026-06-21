"""Text Chunker — splits parsed text into smaller chunks for embedding.

Uses a custom recursive character text splitter (no langchain dependency)
to avoid pydantic v1/v2 compatibility issues with Python 3.12+.
"""

from config import settings
from ingestion import TextChunk
from utils.logger import logger


class RecursiveTextSplitter:
    """Lightweight recursive character text splitter.

    Splits text by trying separators in order of preference:
    paragraph breaks → line breaks → sentences → spaces → characters.
    Each chunk has configurable size and overlap.
    """

    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 150,
                 separators: list[str] = None):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", " ", ""]

    def split_text(self, text: str) -> list[str]:
        """Split text into chunks recursively using separator hierarchy."""
        return self._split(text, self.separators)

    def _split(self, text: str, separators: list[str]) -> list[str]:
        if len(text) <= self.chunk_size:
            return [text] if text.strip() else []

        # Find the best separator that exists in the text
        separator = ""
        remaining_separators = []
        for i, sep in enumerate(separators):
            if sep == "" or sep in text:
                separator = sep
                remaining_separators = separators[i + 1:]
                break

        # Split by the chosen separator
        if separator:
            parts = text.split(separator)
        else:
            parts = [text]

        # Merge small parts into chunks of appropriate size
        chunks = []
        current = ""

        for part in parts:
            piece = part if not separator else (part + separator)

            if not current:
                current = piece
            elif len(current) + len(piece) <= self.chunk_size:
                current += piece
            else:
                # Current chunk is ready
                chunk_text = current.rstrip(separator).strip()
                if chunk_text:
                    chunks.append(chunk_text)

                # Start new chunk with overlap from previous
                if self.chunk_overlap > 0 and current:
                    overlap_text = current[-self.chunk_overlap:]
                    current = overlap_text + piece
                else:
                    current = piece

        # Don't forget the last chunk
        if current.strip():
            chunk_text = current.rstrip(separator).strip()
            if chunk_text:
                chunks.append(chunk_text)

        # If any chunk is still too large, recursively split with next separator
        final_chunks = []
        for chunk in chunks:
            if len(chunk) > self.chunk_size and remaining_separators:
                sub_chunks = self._split(chunk, remaining_separators)
                final_chunks.extend(sub_chunks)
            else:
                final_chunks.append(chunk)

        return final_chunks


def chunk_text(raw_chunks: list[TextChunk], document_id: str, filename: str) -> list[dict]:
    """Split raw text chunks into smaller, overlapping pieces.

    Returns a list of dicts with: text, document_id, filename, chunk_index, page_number
    """
    splitter = RecursiveTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
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
