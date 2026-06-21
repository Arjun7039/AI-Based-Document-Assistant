"""Parser Router — maps file extensions to the correct parser (lazy imports)."""

from ingestion import TextChunk
from utils.logger import logger


def parse_document(content: bytes, filename: str, file_type: str) -> list[TextChunk]:
    """Route to the correct parser based on file type."""
    ft = file_type.lower()
    logger.info(f"Routing {filename} to {ft} parser")

    if ft == "pdf":
        from ingestion.parsers.pdf_parser import parse_pdf
        return parse_pdf(content, filename)
    elif ft == "docx":
        from ingestion.parsers.docx_parser import parse_docx
        return parse_docx(content, filename)
    elif ft in ("xlsx", "xls"):
        from ingestion.parsers.excel_parser import parse_excel
        return parse_excel(content, filename)
    elif ft == "csv":
        from ingestion.parsers.csv_parser import parse_csv
        return parse_csv(content, filename)
    elif ft == "pptx":
        from ingestion.parsers.pptx_parser import parse_pptx
        return parse_pptx(content, filename)
    elif ft in ("txt", "md", "json"):
        from ingestion.parsers.txt_parser import parse_txt
        return parse_txt(content, filename)
    elif ft in ("png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff"):
        from ingestion.parsers.image_parser import parse_image
        return parse_image(content, filename)
    else:
        raise ValueError(f"No parser available for file type: {ft}")
