"""Image Parser — extracts text and descriptions from image files using Gemini Vision API."""

import google.generativeai as genai
from config import settings
from ingestion import TextChunk
from utils.logger import logger

_gemini_configured = False


def _ensure_gemini():
    global _gemini_configured
    if not _gemini_configured:
        if not settings.GEMINI_API_KEY:
            raise RuntimeError("GEMINI_API_KEY is not set for image analysis.")
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _gemini_configured = True


IMAGE_ANALYSIS_PROMPT = """Analyze this image thoroughly and extract ALL information:

1. **Text Extraction**: Extract every piece of text visible in the image exactly as written (OCR).
2. **Data Extraction**: If the image contains tables, charts, graphs, or diagrams, extract all data points, labels, values, and relationships.
3. **Visual Description**: Describe the visual content, layout, colors, and any meaningful visual elements.
4. **Context**: Provide any contextual interpretation of what the image represents.

Be comprehensive and precise. Format your output as structured text that can be searched and queried later."""


def parse_image(content: bytes, filename: str) -> list[TextChunk]:
    """Parse an image file using Gemini Vision API and return extracted text/description.

    Args:
        content: Raw image bytes
        filename: Original filename

    Returns:
        List containing a single TextChunk with the extracted text and description
    """
    chunks = []
    try:
        _ensure_gemini()

        # Determine MIME type from extension
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        mime_map = {
            "png": "image/png",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "webp": "image/webp",
            "gif": "image/gif",
            "bmp": "image/bmp",
            "tiff": "image/tiff",
        }
        mime_type = mime_map.get(ext, "image/png")

        logger.info(f"Analyzing image: {filename} ({mime_type}, {len(content)} bytes)")

        model = genai.GenerativeModel(settings.LLM_MODEL)
        response = model.generate_content(
            [
                IMAGE_ANALYSIS_PROMPT,
                {"mime_type": mime_type, "data": content},
            ],
            generation_config=genai.types.GenerationConfig(
                temperature=0.1,
                max_output_tokens=4096,
            ),
        )

        extracted_text = response.text if response.text else ""

        if extracted_text.strip():
            chunks.append(TextChunk(
                text=extracted_text,
                page_number=1,
                section="Image Analysis",
                metadata={
                    "source": filename,
                    "type": "image",
                    "mime_type": mime_type,
                },
            ))
            logger.info(f"Image parsed: extracted {len(extracted_text)} chars from {filename}")
        else:
            logger.warning(f"No content extracted from image: {filename}")

    except Exception as e:
        logger.error(f"Image parsing failed for {filename}: {e}")
        raise

    return chunks
