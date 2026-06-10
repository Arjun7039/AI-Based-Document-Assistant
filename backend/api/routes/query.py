import time

import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from db.database import get_db
from models.chat_message import ChatMessage
from models.session import Session
from api.dependencies import get_current_user_required
from utils.logger import logger

router = APIRouter()


class QueryRequest(BaseModel):
    question: str
    session_id: str | None = None
    document_ids: list[str] | None = None
    top_k: int | None = None


@router.post("/query")
async def query_documents(
    question: str = Form(""),
    session_id: str | None = Form(None),
    document_ids: str | None = Form(None),
    top_k: int | None = Form(None),
    file: UploadFile | None = File(None),
    db: DBSession = Depends(get_db),
    user=Depends(get_current_user_required),
):
    """Ask a question about uploaded documents using RAG, optionally with an image."""
    start_time = time.time()

    if not question.strip() and not file:
        raise HTTPException(status_code=400, detail="Question or image must be provided")

    # parse document_ids
    parsed_doc_ids = None
    if document_ids:
        try:
            parsed_doc_ids = json.loads(document_ids)
        except Exception:
            pass

    # Read image
    image_bytes = None
    image_mime = None
    if file:
        image_bytes = await file.read()
        image_mime = file.content_type

    # Get or create session
    if session_id:
        session = db.query(Session).filter(Session.id == session_id).first()
        if not session:
            session = Session(id=session_id, user_id=user.id)
            db.add(session)
            db.flush()
        elif session.user_id != user.id:
            raise HTTPException(status_code=403, detail="Access denied to this session")
    else:
        session = Session(user_id=user.id)
        db.add(session)
        db.flush()
        session_id = session.id

    # Save user message
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=question.strip(),
    )
    db.add(user_msg)

    try:
        # Run RAG pipeline
        from rag.retriever import retrieve_chunks
        from rag.prompt_builder import build_prompt
        from rag.generator import generate_answer

        top_k = top_k or 5

        # 1. Retrieve relevant chunks
        chunks = retrieve_chunks(
            query=question,
            document_ids=parsed_doc_ids,
            top_k=top_k,
        )

        # 2. Build prompt with context
        messages = build_prompt(question, chunks)

        # 3. Generate answer
        result = generate_answer(messages, image_bytes, image_mime)

        latency_ms = int((time.time() - start_time) * 1000)

        # Format sources
        sources = [
            {
                "document_id": c.get("document_id", ""),
                "filename": c.get("filename", ""),
                "page": c.get("page", 0),
                "chunk": c.get("text", ""),
                "score": round(c.get("score", 0.0), 4),
            }
            for c in chunks
        ]

        # Save assistant message
        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=result["answer"],
            tokens_used=result.get("tokens_used", 0),
            latency_ms=latency_ms,
        )
        assistant_msg.sources = sources
        db.add(assistant_msg)
        db.commit()

        logger.info(f"Query answered in {latency_ms}ms — {len(chunks)} chunks retrieved")

        return {
            "answer": result["answer"],
            "sources": sources,
            "tokens_used": result.get("tokens_used", 0),
            "latency_ms": latency_ms,
        }

    except ImportError:
        # RAG modules not yet built — return helpful message
        latency_ms = int((time.time() - start_time) * 1000)
        answer = "The RAG pipeline is not yet configured. Please complete Phase 3 (Ingestion) and Phase 4 (Query Engine) setup."

        assistant_msg = ChatMessage(
            session_id=session_id,
            role="assistant",
            content=answer,
            latency_ms=latency_ms,
        )
        db.add(assistant_msg)
        db.commit()

        return {
            "answer": answer,
            "sources": [],
            "tokens_used": 0,
            "latency_ms": latency_ms,
        }

    except Exception as e:
        logger.error(f"Query failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
