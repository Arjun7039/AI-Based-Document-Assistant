"""PDF Parser — extracts text from PDF files using pypdf with OCR fallback for scanned pages.

For pages where pypdf cannot extract text (scanned/image-based pages), uses PyMuPDF (fitz)
to extract page images and Gemini Vision API to OCR them. This ensures 500+ page documents
with mixed digital and scanned content are fully processed.
"""

import io
import time
from pypdf import PdfReader
from ingestion import TextChunk
from utils.logger import logger

# Minimum characters to consider a page as having extractable text
MIN_TEXT_THRESHOLD = 30


def parse_pdf(content: bytes, filename: str) -> list[TextChunk]:
    """Parse a PDF file and return text chunks per page.

    Uses pypdf for digital text extraction. Falls back to OCR via
    Gemini Vision API for scanned/image-based pages.
    """
    chunks = []
    ocr_pages = []  # Track pages that need OCR

    try:
        reader = PdfReader(io.BytesIO(content))
        total_pages = len(reader.pages)
        logger.info(f"Parsing PDF: {filename} ({total_pages} pages)")

        for i, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            text = text.strip()

            if len(text) >= MIN_TEXT_THRESHOLD:
                # Good digital text extraction
                chunks.append(TextChunk(
                    text=text,
                    page_number=i + 1,
                    section=f"Page {i + 1}",
                    metadata={"source": filename, "total_pages": total_pages},
                ))
            else:
                # Page has little or no extractable text — likely scanned
                ocr_pages.append(i)

            # Progress logging for large documents
            if total_pages > 100 and (i + 1) % 100 == 0:
                logger.info(f"  Text extraction progress: {i + 1}/{total_pages} pages")

        logger.info(f"PDF text extraction: {len(chunks)} pages with text, "
                    f"{len(ocr_pages)} pages need OCR, out of {total_pages} total")

        # OCR fallback for scanned pages
        if ocr_pages:
            ocr_chunks = _ocr_scanned_pages(content, filename, ocr_pages, total_pages)
            chunks.extend(ocr_chunks)

        # Sort by page number to maintain order
        chunks.sort(key=lambda c: c.page_number)

        logger.info(f"PDF parsed: {len(chunks)} total pages with content out of {total_pages}")

    except Exception as e:
        logger.error(f"PDF parsing failed for {filename}: {e}")
        raise

    return chunks


def _ocr_scanned_pages(content: bytes, filename: str, page_indices: list[int], total_pages: int) -> list[TextChunk]:
    """OCR scanned PDF pages using PyMuPDF for image extraction and Gemini Vision for text recognition.

    Processes pages in batches to avoid API rate limits. Gracefully handles failures
    on individual pages without aborting the entire document.
    """
    chunks = []

    try:
        import fitz  # PyMuPDF
    except ImportError:
        logger.warning("PyMuPDF (fitz) not installed. Skipping OCR for scanned pages. "
                       "Install with: pip install pymupdf")
        return chunks

    try:
        import google.generativeai as genai
        from config import settings

        if not settings.GEMINI_API_KEY:
            logger.warning("GEMINI_API_KEY not set. Cannot OCR scanned pages.")
            return chunks

        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.LLM_MODEL)

    except Exception as e:
        logger.warning(f"Failed to initialize Gemini for OCR: {e}")
        return chunks

    logger.info(f"OCR: Processing {len(page_indices)} scanned pages from {filename}")

    doc = fitz.open(stream=content, filetype="pdf")

    ocr_prompt = ("Extract ALL text from this scanned document page. "
                  "Reproduce the text exactly as written, preserving structure, "
                  "tables, and formatting where possible. If there are images, "
                  "charts, or diagrams, describe their content and any visible data.")

    for idx, page_num in enumerate(page_indices):
        try:
            page = doc[page_num]

            # Render page to image (150 DPI for good quality vs speed tradeoff)
            pix = page.get_pixmap(dpi=150)
            img_bytes = pix.tobytes("png")

            # Send to Gemini Vision for OCR
            response = model.generate_content(
                [
                    ocr_prompt,
                    {"mime_type": "image/png", "data": img_bytes},
                ],
                generation_config=genai.types.GenerationConfig(
                    temperature=0.1,
                    max_output_tokens=4096,
                ),
            )

            text = response.text.strip() if response.text else ""

            if text and len(text) >= MIN_TEXT_THRESHOLD:
                chunks.append(TextChunk(
                    text=text,
                    page_number=page_num + 1,
                    section=f"Page {page_num + 1} (OCR)",
                    metadata={
                        "source": filename,
                        "total_pages": total_pages,
                        "ocr": True,
                    },
                ))

            # Rate limiting: brief pause between OCR calls
            if idx < len(page_indices) - 1:
                time.sleep(0.3)

            # Progress logging
            if (idx + 1) % 10 == 0 or idx == len(page_indices) - 1:
                logger.info(f"  OCR progress: {idx + 1}/{len(page_indices)} pages")

        except Exception as e:
            logger.warning(f"OCR failed for page {page_num + 1} of {filename}: {e}")
            continue  # Skip failed pages, don't abort the whole document

    doc.close()
    logger.info(f"OCR complete: extracted text from {len(chunks)}/{len(page_indices)} scanned pages")

    return chunks
