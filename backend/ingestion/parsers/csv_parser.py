"""CSV Parser — extracts text from CSV files."""

import io
import csv
from ingestion import TextChunk
from utils.logger import logger


def parse_csv(content: bytes, filename: str) -> list[TextChunk]:
    """Parse a CSV file, converting rows to structured text."""
    chunks = []
    try:
        text_content = content.decode("utf-8", errors="replace")
        reader = csv.reader(io.StringIO(text_content))
        rows = list(reader)

        if not rows:
            return chunks

        logger.info(f"Parsing CSV: {filename} ({len(rows)} rows)")

        headers = rows[0] if rows else []
        data_rows = rows[1:] if len(rows) > 1 else rows

        row_texts = []
        for row in data_rows:
            if any(cell.strip() for cell in row):
                pairs = []
                for h, v in zip(headers, row):
                    if v.strip():
                        pairs.append(f"{h}: {v}" if h.strip() else v)
                row_texts.append(", ".join(pairs))

        # Group rows into chunks (50 rows per chunk)
        for i in range(0, len(row_texts), 50):
            batch = row_texts[i:i + 50]
            chunks.append(TextChunk(
                text="\n".join(batch),
                page_number=i // 50 + 1,
                section="CSV Data",
                metadata={"source": filename, "headers": headers},
            ))

        logger.info(f"CSV parsed: {len(chunks)} chunks")
    except Exception as e:
        logger.error(f"CSV parsing failed for {filename}: {e}")
        raise

    return chunks
