"""Corrective RAG (CRAG) & Self-RAG Evaluator Module.

Grades the relevance and sufficiency of retrieved document chunks against the user's question.
If the retrieved context is graded:
- 'CORRECT': High relevance, proceeds directly to answer generation.
- 'AMBIGUOUS': Partial relevance, generates query expansion (HyDE) for a second-pass retrieval.
- 'INCORRECT': Low relevance, reformulates the search query or flags insufficient context.
"""

import math
import re
from typing import Literal
from utils.logger import logger

EvaluationGrade = Literal["CORRECT", "AMBIGUOUS", "INCORRECT"]


def calibrate_score(raw_score: float) -> float:
    """Normalize raw Pinecone cosine similarity (typically 0.08 - 0.50) into an intuitive 0.0 - 1.0 match score."""
    if raw_score <= 0.02:
        return 0.20
    # Sigmoidal mapping centered around 0.09 with smooth progression to 0.98
    scaled = 1.0 / (1.0 + math.exp(-14 * (raw_score - 0.09)))
    return round(min(max(scaled, 0.35), 0.98), 4)


def grade_retrieval(query: str, chunks: list[dict]) -> tuple[EvaluationGrade, float, str]:
    """Grade the relevance and quality of retrieved chunks for the given query.

    Handles both specific factual queries and broad exploratory/summary queries
    (e.g., 'what is there in this', 'summarize this document').
    """
    if not chunks:
        logger.info("CRAG Grade: INCORRECT — No chunks were retrieved.")
        return "INCORRECT", 0.0, "No chunks retrieved from vector store."

    raw_top_score = chunks[0].get("score", 0.0)
    calibrated_vector_score = calibrate_score(raw_top_score)

    # Stopwords to filter out conversational tokens
    stopwords = {
        "what", "when", "where", "which", "who", "whom", "whose", "why", "how",
        "does", "explain", "tell", "show", "describe", "about", "with", "from",
        "that", "this", "these", "those", "have", "been", "will", "would", "could",
        "there", "here", "are", "was", "were", "the", "and", "for", "its", "into",
        "give", "document", "file", "all", "any", "some", "overview", "summary",
    }
    query_terms = [
        w.lower() for w in re.findall(r"\b\w+\b", query)
        if len(w) >= 3 and w.lower() not in stopwords
    ]

    # Broad exploratory/summary query patterns
    broad_patterns = [
        "what is there", "what is in", "what is this", "summarize", "summary",
        "overview", "explain this", "tell me about", "describe this", "key points",
        "main points", "what does this say", "what is this about", "walk me through"
    ]
    is_broad_query = any(p in query.lower() for p in broad_patterns) or len(query_terms) == 0

    if is_broad_query:
        # User is requesting a document overview/summary and chunks were retrieved
        confidence = max(calibrated_vector_score, 0.88)
        logger.info(f"CRAG Evaluation (Broad Query) — Confidence: {confidence:.3f}")
        return "CORRECT", confidence, "Comprehensive context retrieved for document overview."

    # Specific query keyword coverage
    combined_top_text = " ".join(c.get("text", "") for c in chunks[:3]).lower()
    matches = sum(1 for term in query_terms if term in combined_top_text)
    keyword_coverage = (matches / len(query_terms)) if query_terms else 1.0

    confidence = (0.55 * calibrated_vector_score) + (0.45 * keyword_coverage)
    confidence = min(max(confidence, 0.15), 0.98)
    logger.info(f"CRAG Evaluation — Top Score: {raw_top_score:.3f} (Calibrated: {calibrated_vector_score:.3f}), Keyword: {keyword_coverage:.2f}, Confidence: {confidence:.3f}")

    if confidence >= 0.65:
        return "CORRECT", confidence, "High confidence context match with strong grounded evidence."
    elif confidence >= 0.40:
        return "AMBIGUOUS", confidence, "Partial context match. Query expansion recommended."
    else:
        return "INCORRECT", confidence, "Low relevance context. Document may not contain the answer."


def reformulate_query(query: str) -> str:
    """HyDE / Keyword expansion to reformulate ambiguous search queries."""
    clean_query = query.strip()
    clean_query = re.sub(
        r"(?i)^(can you (please )?(tell me|explain|find)|what is|show me|how do I)\s+",
        "",
        clean_query,
    ).strip()
    logger.info(f"CRAG Reformulation: '{query}' -> '{clean_query}'")
    return clean_query
