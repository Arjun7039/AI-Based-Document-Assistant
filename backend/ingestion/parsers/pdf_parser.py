"""PDF Parser — extracts text from PDF files using pypdf."""

import io
from pypdf import PdfReader
from ingestion import TextChunk
from utils.logger import logger


def parse_pdf(content: bytes, filename: str) -> list[TextChunk]:
    """Parse a PDF file and return text chunks per page."""
    chunks = []
    try:
        reader = PdfReader(io.BytesIO(content))
        total_pages = len(reader.pages)
        logger.info(f"Parsing PDF: {filename} ({total_pages} pages)")

        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            text = text.strip()
            if text:
                chunks.append(TextChunk(
                    text=text,
                    page_number=i + 1,
                    section=f"Page {i + 1}",
                    metadata={"source": filename, "total_pages": total_pages},
                ))

        logger.info(f"PDF parsed: {len(chunks)} pages with text out of {total_pages}")
    except Exception as e:
        logger.error(f"PDF parsing failed for {filename}: {e}")
        raise

    return chunks
