"""Data classes shared across the ingestion pipeline."""

from dataclasses import dataclass, field


@dataclass
class TextChunk:
    """Represents a chunk of text extracted from a document."""
    text: str
    page_number: int = 0
    section: str = ""
    metadata: dict = field(default_factory=dict)


@dataclass
class EmbeddedChunk:
    """A text chunk with its embedding vector and document metadata."""
    text: str
    embedding: list[float] = field(default_factory=list)
    document_id: str = ""
    filename: str = ""
    page_number: int = 0
    chunk_index: int = 0
    metadata: dict = field(default_factory=dict)
