from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from db.database import get_db
from models.session import Session
from models.document import Document
from models.chat_message import ChatMessage
from api.dependencies import get_current_user_required

router = APIRouter()


@router.get("/sessions")
async def list_sessions(
    db: DBSession = Depends(get_db),
    user=Depends(get_current_user_required),
):
    """List all chat sessions for the authenticated user."""
    sessions = db.query(Session).filter(Session.user_id == user.id).order_by(Session.created_at.desc()).all()
    return {"sessions": [s.to_dict() for s in sessions]}


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    db: DBSession = Depends(get_db),
    user=Depends(get_current_user_required),
):
    """Get a specific session with its messages, verifying ownership."""
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied to this session")

    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    return {
        **session.to_dict(),
        "messages": [m.to_dict() for m in messages],
    }


@router.get("/sessions/{session_id}/documents")
async def get_session_documents(
    session_id: str,
    db: DBSession = Depends(get_db),
    user=Depends(get_current_user_required),
):
    """List all documents in a session, verifying session ownership."""
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied to this session")

    docs = (
        db.query(Document)
        .filter(Document.session_id == session_id)
        .order_by(Document.created_at.desc())
        .all()
    )

    return {
        "session_id": session_id,
        "documents": [doc.to_dict() for doc in docs],
    }


@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    db: DBSession = Depends(get_db),
    user=Depends(get_current_user_required),
):
    """Delete a session and all its messages, verifying ownership."""
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied to this session")

    db.delete(session)
    db.commit()
    return {"message": "Session deleted", "session_id": session_id}
