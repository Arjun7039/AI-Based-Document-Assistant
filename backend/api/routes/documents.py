from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from db.database import get_db
from models.document import Document
from api.dependencies import get_current_user_required
from utils.logger import logger
from embeddings.vector_store import get_vector_store

router = APIRouter()


@router.get("/documents/{document_id}/status")
async def get_document_status(
    document_id: str,
    db: DBSession = Depends(get_db),
    user=Depends(get_current_user_required),
):
    """Poll the processing status of a document, verifying ownership."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied to this document")

    return {
        "document_id": doc.id,
        "status": doc.status,
        "chunks_indexed": doc.chunks_indexed,
        "pages": doc.pages,
        "progress_percent": doc.progress_percent or 0,
        "processing_time_ms": doc.processing_time_ms,
        "error_message": doc.error_message,
    }


@router.delete("/documents/{document_id}")
async def delete_document(
    document_id: str,
    db: DBSession = Depends(get_db),
    user=Depends(get_current_user_required),
):
    """Delete a document and its associated vector store data, verifying ownership."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if doc.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied to this document")

    # Delete from vector store using correct singleton accessor
    try:
        vector_store = get_vector_store()
        vector_store.delete(document_id)
    except Exception as e:
        logger.warning(f"Failed to delete vectors for {document_id}: {e}")

    # Delete from database
    db.delete(doc)
    db.commit()

    logger.info(f"Document deleted: {document_id} by user {user.id}")
    return {"message": "Document deleted", "document_id": document_id}


@router.get("/documents")
async def list_documents(
    db: DBSession = Depends(get_db),
    user=Depends(get_current_user_required),
):
    """List all documents owned by the authenticated user."""
    docs = db.query(Document).filter(Document.user_id == user.id).order_by(Document.created_at.desc()).all()
    return {"documents": [doc.to_dict() for doc in docs]}
