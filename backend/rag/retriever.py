"""Retriever — embeds the query and searches the vector store for relevant chunks.

Includes re-ranking with keyword overlap scoring and a diversity penalty
to avoid returning redundant chunks from the same page on large documents.
"""

import re
from collections import Counter
from embeddings.embedder import embed_query
from embeddings.vector_store import get_vector_store
from config import settings
from utils.logger import logger


def retrieve_chunks(
    query: str,
    document_ids: list[str] | None = None,
    top_k: int | None = None,
) -> list[dict]:
    """Retrieve the most relevant chunks for a given query.

    Flow: embed query → search vector store → re-rank with keyword overlap → diversity filter

    Returns:
        List of dicts with: text, document_id, filename, page, score
    """
    top_k = top_k or settings.TOP_K_RETRIEVAL

    logger.info(f"Retrieving top-{top_k} chunks for: '{query[:80]}...'")

    # Embed the query
    query_embedding = embed_query(query)

    # Fetch more candidates than needed for re-ranking (2x over-fetch)
    candidate_k = min(top_k * 2, top_k + 10)

    # Search vector store
    vector_store = get_vector_store()
    results = vector_store.query(
        embedding=query_embedding,
        top_k=candidate_k,
        document_ids=document_ids,
    )

    if not results:
        logger.info("No chunks retrieved from vector store.")
        return []

    # Re-rank: combine vector similarity with keyword overlap
    results = _rerank_with_keywords(query, results)

    # Apply diversity penalty to avoid returning many chunks from the same page
    results = _apply_diversity(results)

    # Take top_k after re-ranking
    final_results = results[:top_k]

    logger.info(f"Retrieved {len(final_results)} chunks "
                f"(scores: {[round(r.get('score', 0), 3) for r in final_results]})")

    return final_results


def _rerank_with_keywords(query: str, chunks: list[dict]) -> list[dict]:
    """Re-rank chunks by combining vector similarity with keyword overlap.

    This helps large documents where the embedding similarity alone may not
    capture exact keyword matches that are important for factual retrieval.
    """
    # Extract query keywords (lowercase, 3+ chars, no stop words)
    stop_words = {
        "the", "and", "for", "are", "but", "not", "you", "all", "can",
        "had", "her", "was", "one", "our", "out", "has", "his", "how",
        "its", "may", "new", "now", "old", "see", "way", "who", "did",
        "get", "let", "say", "she", "too", "use", "what", "when", "where",
        "which", "why", "will", "with", "this", "that", "from", "have",
        "been", "they", "them", "their", "there", "about", "would", "could",
        "should", "these", "those", "does", "also", "into", "over",
    }

    query_words = set(
        w.lower() for w in re.findall(r'\b\w+\b', query)
        if len(w) >= 3 and w.lower() not in stop_words
    )

    if not query_words:
        return chunks

    for chunk in chunks:
        text = chunk.get("text", "").lower()
        text_words = set(re.findall(r'\b\w+\b', text))

        # Calculate keyword overlap ratio
        overlap = query_words & text_words
        keyword_score = len(overlap) / len(query_words) if query_words else 0

        # Blend: 70% vector similarity + 30% keyword overlap
        vector_score = chunk.get("score", 0)
        chunk["score"] = (0.7 * vector_score) + (0.3 * keyword_score)

    # Re-sort by blended score
    chunks.sort(key=lambda c: c.get("score", 0), reverse=True)
    return chunks


def _apply_diversity(chunks: list[dict]) -> list[dict]:
    """Apply a diversity penalty to reduce redundant chunks from the same page.

    If multiple chunks come from the same document + page, each subsequent
    chunk from that page gets a small score penalty. This ensures the
    final results cover more pages of the document.
    """
    page_counts: Counter = Counter()
    DIVERSITY_PENALTY = 0.05  # 5% penalty per duplicate page occurrence

    for chunk in chunks:
        key = f"{chunk.get('document_id', '')}_{chunk.get('page', 0)}"
        count = page_counts[key]
        if count > 0:
            chunk["score"] = chunk.get("score", 0) * (1 - DIVERSITY_PENALTY * count)
        page_counts[key] += 1

    # Re-sort after diversity adjustment
    chunks.sort(key=lambda c: c.get("score", 0), reverse=True)
    return chunks
