import time
import json
import asyncio
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session as DBSession

from db.database import get_db
from models.chat_message import ChatMessage
from models.session import Session
from api.dependencies import get_current_user_required
from utils.logger import logger

from rag.guardrails import sanitize_user_input, audit_model_output
from rag.semantic_cache import semantic_cache
from rag.query_planner import retrieve_with_decomposition
from rag.evaluator import grade_retrieval, reformulate_query, calibrate_score
from rag.retriever import retrieve_chunks
from rag.prompt_builder import build_prompt
from rag.generator import generate_answer, generate_answer_stream
from embeddings.embedder import embed_query
from config import settings as app_settings

router = APIRouter()


class QueryRequest(BaseModel):
    question: str
    session_id: str | None = None
    document_ids: list[str] | None = None
    top_k: int | None = None


def _clean_page(p):
    """Normalize page numbers — strip trailing '.0' from float casts."""
    s = str(p) if p is not None else ""
    return s[:-2] if s.endswith(".0") else s


def _format_sources(chunks: list[dict]) -> list[dict]:
    """Format chunk metadata into structured citation objects with calibrated match scores."""
    return [
        {
            "document_id": c.get("document_id", ""),
            "filename": c.get("filename", ""),
            "page": _clean_page(c.get("page", 0)),
            "chunk": c.get("text", ""),
            "score": round(calibrate_score(c.get("score", 0.0)), 4),
        }
        for c in chunks
    ]


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
    """Synchronous RAG query endpoint with Guardrails, Semantic Cache, Query Decomposition, and CRAG Evaluator."""
    start_time = time.time()

    if not question.strip() and not file:
        raise HTTPException(status_code=400, detail="Question or image must be provided")

    # 1. Guardrail input sanitization
    cleaned_question, is_suspicious = sanitize_user_input(question)
    if is_suspicious:
        logger.warning(f"Suspicious prompt pattern handled for user {user.id}")

    # Parse document IDs
    parsed_doc_ids = None
    if document_ids:
        try:
            parsed_doc_ids = json.loads(document_ids)
        except Exception:
            pass

    # Read image if provided
    image_bytes = None
    image_mime = None
    if file:
        image_bytes = await file.read()
        image_mime = file.content_type

    # Get or create chat session
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

    # Record user message
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=cleaned_question.strip(),
    )
    db.add(user_msg)

    # 2. Semantic Cache lookup (only for pure text queries)
    query_emb = None
    if not image_bytes:
        try:
            query_emb = embed_query(cleaned_question)
            cached_result = semantic_cache.get(query_emb, parsed_doc_ids)
            if cached_result:
                latency_ms = int((time.time() - start_time) * 1000)
                cached_result["latency_ms"] = latency_ms

                assistant_msg = ChatMessage(
                    session_id=session_id,
                    role="assistant",
                    content=cached_result["answer"],
                    latency_ms=latency_ms,
                    tokens_used=0,
                )
                assistant_msg.sources = cached_result.get("sources", [])
                db.add(assistant_msg)
                db.commit()

                return cached_result
        except Exception as cache_err:
            logger.warning(f"Semantic cache lookup skipped: {cache_err}")

    # 3. Agentic Retrieval with Query Decomposition
    effective_top_k = top_k or app_settings.TOP_K_RETRIEVAL
    chunks, sub_queries = retrieve_with_decomposition(
        cleaned_question,
        document_ids=parsed_doc_ids,
        top_k=effective_top_k,
    )

    # 4. Corrective RAG (CRAG) Evaluation
    grade, confidence, explanation = grade_retrieval(cleaned_question, chunks)

    # If ambiguous, trigger query reformulation for second-pass retrieval
    if grade == "AMBIGUOUS" and not image_bytes:
        reformulated = reformulate_query(cleaned_question)
        extra_chunks = retrieve_chunks(reformulated, document_ids=parsed_doc_ids, top_k=4)
        # Merge without duplicates
        existing_keys = {(c.get("document_id"), c.get("chunk_index")) for c in chunks}
        for ec in extra_chunks:
            if (ec.get("document_id"), ec.get("chunk_index")) not in existing_keys:
                chunks.append(ec)
        chunks.sort(key=lambda c: c.get("score", 0.0), reverse=True)
        chunks = chunks[:effective_top_k]

    # 5. Build prompt & generate answer
    messages = build_prompt(cleaned_question, chunks)
    result = generate_answer(messages, image_bytes, image_mime)

    # 6. Audit output for guardrail compliance
    sanitized_answer = audit_model_output(result["answer"])
    latency_ms = int((time.time() - start_time) * 1000)

    sources = _format_sources(chunks)

    # Save assistant message
    assistant_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        content=sanitized_answer,
        tokens_used=result.get("tokens_used", 0),
        latency_ms=latency_ms,
    )
    assistant_msg.sources = sources
    db.add(assistant_msg)
    db.commit()

    response_payload = {
        "answer": sanitized_answer,
        "sources": sources,
        "tokens_used": result.get("tokens_used", 0),
        "latency_ms": latency_ms,
        "crag_grade": grade,
        "confidence_score": round(confidence * 100, 1),
        "evaluation_details": explanation,
        "sub_queries": sub_queries if len(sub_queries) > 1 else [],
        "cached": False,
    }

    # Store in semantic cache if not an image query
    if query_emb and not image_bytes and grade != "INCORRECT":
        semantic_cache.set(query_emb, cleaned_question, parsed_doc_ids, response_payload)

    return response_payload


@router.post("/query/stream")
async def query_documents_stream(
    question: str = Form(""),
    session_id: str | None = Form(None),
    document_ids: str | None = Form(None),
    top_k: int | None = Form(None),
    file: UploadFile | None = File(None),
    db: DBSession = Depends(get_db),
    user=Depends(get_current_user_required),
):
    """Server-Sent Events (SSE) streaming endpoint for real-time token generation."""
    start_time = time.time()

    if not question.strip() and not file:
        raise HTTPException(status_code=400, detail="Question or image must be provided")

    cleaned_question, is_suspicious = sanitize_user_input(question)

    parsed_doc_ids = None
    if document_ids:
        try:
            parsed_doc_ids = json.loads(document_ids)
        except Exception:
            pass

    image_bytes = None
    image_mime = None
    if file:
        image_bytes = await file.read()
        image_mime = file.content_type

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

    user_msg = ChatMessage(session_id=session_id, role="user", content=cleaned_question.strip())
    db.add(user_msg)
    db.commit()

    async def sse_event_generator():
        # Check cache first
        query_emb = None
        if not image_bytes:
            try:
                query_emb = embed_query(cleaned_question)
                cached = semantic_cache.get(query_emb, parsed_doc_ids)
                if cached:
                    yield f"event: status\ndata: {json.dumps({'stage': 'cache_hit', 'message': 'Loaded from semantic cache (0ms)'})}\n\n"
                    yield f"event: sources\ndata: {json.dumps({'sources': cached.get('sources', [])})}\n\n"
                    # Stream cached text in quick bursts
                    words = cached["answer"].split(" ")
                    for word in words:
                        yield f"event: token\ndata: {json.dumps({'delta': word + ' '})}\n\n"
                        await asyncio.sleep(0.01)
                    latency = int((time.time() - start_time) * 1000)
                    yield f"event: done\ndata: {json.dumps({'latency_ms': latency, 'cached': True})}\n\n"
                    return
            except Exception as e:
                logger.warning(f"Stream cache check failed: {e}")

        # Planning & Decomposition stage
        yield f"event: status\ndata: {json.dumps({'stage': 'planning', 'message': 'Decomposing query & analyzing intent...'})}\n\n"
        effective_top_k = top_k or app_settings.TOP_K_RETRIEVAL
        chunks, sub_queries = retrieve_with_decomposition(
            cleaned_question,
            document_ids=parsed_doc_ids,
            top_k=effective_top_k,
        )

        # Retrieval & CRAG stage
        yield f"event: status\ndata: {json.dumps({'stage': 'evaluating', 'message': f'Retrieved {len(chunks)} chunks across {len(sub_queries)} sub-queries. Grading relevance...'})}\n\n"
        grade, confidence, explanation = grade_retrieval(cleaned_question, chunks)

        if grade == "AMBIGUOUS" and not image_bytes:
            yield f"event: status\ndata: {json.dumps({'stage': 'reformulating', 'message': 'Partial context match. Performing query expansion...'})}\n\n"
            reformulated = reformulate_query(cleaned_question)
            extra = retrieve_chunks(reformulated, document_ids=parsed_doc_ids, top_k=4)
            existing_keys = {(c.get("document_id"), c.get("chunk_index")) for c in chunks}
            for ec in extra:
                if (ec.get("document_id"), ec.get("chunk_index")) not in existing_keys:
                    chunks.append(ec)
            chunks.sort(key=lambda c: c.get("score", 0.0), reverse=True)
            chunks = chunks[:effective_top_k]

        sources = _format_sources(chunks)
        yield f"event: sources\ndata: {json.dumps({'sources': sources, 'crag_grade': grade, 'confidence_score': round(confidence * 100, 1), 'evaluation_details': explanation})}\n\n"

        # Generation stage
        yield f"event: status\ndata: {json.dumps({'stage': 'generating', 'message': 'Generating verified response...'})}\n\n"
        messages = build_prompt(cleaned_question, chunks)

        full_answer = []
        try:
            for token in generate_answer_stream(messages, image_bytes, image_mime):
                full_answer.append(token)
                yield f"event: token\ndata: {json.dumps({'delta': token})}\n\n"
                await asyncio.sleep(0.005)
        except Exception as gen_err:
            logger.error(f"Stream generation error: {gen_err}")
            yield f"event: token\ndata: {json.dumps({'delta': ' [Error completing stream]'})}\n\n"

        complete_text = "".join(full_answer)
        sanitized_answer = audit_model_output(complete_text)
        latency_ms = int((time.time() - start_time) * 1000)

        # Persist to database
        try:
            assistant_msg = ChatMessage(
                session_id=session_id,
                role="assistant",
                content=sanitized_answer,
                latency_ms=latency_ms,
            )
            assistant_msg.sources = sources
            db.add(assistant_msg)
            db.commit()
        except Exception as db_err:
            logger.warning(f"Could not persist streamed message: {db_err}")

        # Store in cache
        if query_emb and not image_bytes and grade != "INCORRECT":
            semantic_cache.set(query_emb, cleaned_question, parsed_doc_ids, {
                "answer": sanitized_answer,
                "sources": sources,
                "tokens_used": 0,
                "latency_ms": latency_ms,
            })

        yield f"event: done\ndata: {json.dumps({'latency_ms': latency_ms, 'cached': False, 'crag_grade': grade, 'confidence_score': round(confidence * 100, 1)})}\n\n"

    return StreamingResponse(sse_event_generator(), media_type="text/event-stream")
