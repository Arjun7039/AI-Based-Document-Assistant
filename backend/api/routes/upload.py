import os
import time
import uuid

from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session as DBSession

from config import settings
from db.database import get_db
from models.document import Document
from models.session import Session
from api.dependencies import get_current_user_required
from utils.logger import logger

router = APIRouter()


@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    session_id: str = Form(None),
    db: DBSession = Depends(get_db),
    user=Depends(get_current_user_required),
):
    """Upload a document for processing."""
    start_time = time.time()

    # Validate file extension
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in settings.allowed_extensions_list:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: .{ext}. Allowed: {', '.join(settings.allowed_extensions_list)}",
        )

    # Read file content
    content = await file.read()
    file_size = len(content)

    # Validate file size
    if file_size > settings.max_file_size_bytes:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE_MB}MB.",
        )

    # Create or get session
    if session_id:
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            session = Session(id=session_id, title=file.filename[:50], user_id=user.id)
            db.add(session)
        elif session.user_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied to this session")
    else:
        session = Session(title=file.filename[:50], user_id=user.id)
        db.add(session)
        db.flush()
        session_id = session.id

    # Save file locally
    doc_id = str(uuid.uuid4())
    storage_key = f"{doc_id}/{file.filename}"

    if settings.STORAGE_BACKEND == "local":
        file_dir = os.path.join(settings.LOCAL_UPLOAD_DIR, doc_id)
        os.makedirs(file_dir, exist_ok=True)
        file_path = os.path.join(file_dir, file.filename)
        with open(file_path, "wb") as f:
            f.write(content)
        logger.info(f"Saved file locally: {file_path}")
    else:
        # R2 upload will be implemented in Phase 3
        from utils.storage import FileStorage
        storage = FileStorage()
        storage.upload(content, storage_key)

    # Create document record
    document = Document(
        id=doc_id,
        filename=file.filename,
        file_type=ext,
        status="processing",
        file_size_bytes=file_size,
        storage_key=storage_key,
        session_id=session_id,
        user_id=user.id if user else None,
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    logger.info(f"Document uploaded successfully, queueing background processing: {file.filename} -> {doc_id}")

    # Queue ingestion pipeline execution in the background
    background_tasks.add_task(
        run_ingestion_in_background,
        doc_id,
        file.filename,
        ext,
        content
    )

    return document.to_dict()


def run_ingestion_in_background(doc_id: str, filename: str, ext: str, content: bytes):
    """Run ingestion pipeline in a background task with a fresh database session.

    Includes real-time progress tracking that writes to the database so the
    frontend can poll for accurate progress during large document processing.
    """
    from db.database import SessionLocal
    from models.document import Document
    from ingestion.pipeline import run_pipeline

    logger.info(f"Background Ingestion START: {filename} ({doc_id})")
    start_time = time.time()
    db = SessionLocal()

    def _update_progress(stage: str, percent: int):
        """Write processing progress to the database for frontend polling."""
        try:
            doc = db.query(Document).filter(Document.id == doc_id).first()
            if doc:
                doc.progress_percent = min(percent, 99)  # Reserve 100 for completion
                db.commit()
                logger.debug(f"Progress update: {doc_id} → {stage} {percent}%")
        except Exception as e:
            logger.warning(f"Failed to update progress for {doc_id}: {e}")
            try:
                db.rollback()
            except Exception:
                pass

    try:
        document = db.query(Document).filter(Document.id == doc_id).first()
        if not document:
            logger.error(f"Document {doc_id} not found in database for background ingestion")
            return

        result = run_pipeline(doc_id, filename, ext, content, db, progress_callback=_update_progress)
        elapsed_ms = int((time.time() - start_time) * 1000)

        document = db.query(Document).filter(Document.id == doc_id).first()
        if document:
            document.status = "ready"
            document.pages = result.get("pages", 0)
            document.chunks_indexed = result.get("chunks_indexed", 0)
            document.processing_time_ms = elapsed_ms
            document.progress_percent = 100
            db.commit()
        logger.info(f"Background Ingestion DONE: {doc_id} — {result.get('chunks_indexed', 0)} chunks in {elapsed_ms}ms")
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        logger.error(f"Background Ingestion FAILED for {doc_id}: {e}\n{error_details}")
        try:
            document = db.query(Document).filter(Document.id == doc_id).first()
            if document:
                document.status = "failed"
                document.error_message = str(e)
                document.progress_percent = 0
                db.commit()
        except Exception as db_err:
            logger.error(f"Failed to update document error status: {db_err}")
    finally:
        db.close()

