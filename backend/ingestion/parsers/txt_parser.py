"""TXT Parser — handles plain text, markdown, and JSON files."""

import json
from ingestion import TextChunk
from utils.logger import logger


def parse_txt(content: bytes, filename: str) -> list[TextChunk]:
    """Parse a text-based file (txt, md, json)."""
    chunks = []
    try:
        text = content.decode("utf-8", errors="replace").strip()
        if not text:
            return chunks

        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"
        logger.info(f"Parsing {ext.upper()}: {filename} ({len(text)} chars)")

        # Pretty-print JSON before chunking
        if ext == "json":
            try:
                data = json.loads(text)
                text = json.dumps(data, indent=2, ensure_ascii=False)
            except json.JSONDecodeError:
                pass  # Use raw text if invalid JSON

        # Split into page-like sections (by double newlines or every ~3000 chars)
        sections = text.split("\n\n")
        current_chunk = []
        current_len = 0
        page = 1

        for section in sections:
            section = section.strip()
            if not section:
                continue

            if current_len + len(section) > 3000 and current_chunk:
                chunks.append(TextChunk(
                    text="\n\n".join(current_chunk),
                    page_number=page,
                    section=f"Section {page}",
                    metadata={"source": filename},
                ))
                current_chunk = []
                current_len = 0
                page += 1

            current_chunk.append(section)
            current_len += len(section)

        if current_chunk:
            chunks.append(TextChunk(
                text="\n\n".join(current_chunk),
                page_number=page,
                section=f"Section {page}",
                metadata={"source": filename},
            ))

        logger.info(f"Text parsed: {len(chunks)} sections")
    except Exception as e:
        logger.error(f"Text parsing failed for {filename}: {e}")
        raise

    return chunks
