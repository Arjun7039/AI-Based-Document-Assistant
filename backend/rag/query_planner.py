"""Query Planner & Decomposition Module.

Analyzes question complexity and breaks multi-hop or comparative questions
into focused sub-queries for parallel retrieval, combining results for synthesis.
"""

import re
from typing import Optional
from rag.retriever import retrieve_chunks
from utils.logger import logger


def is_complex_query(query: str) -> bool:
    """Determine if a user query requires decomposition (comparative or multi-part)."""
    q = query.lower()

    comparative_markers = [
        "compare", "difference between", " versus ", " vs ", " vs. ",
        "in comparison to", "contrasting", "on one hand",
    ]
    if any(marker in q for marker in comparative_markers):
        return True

    multi_part_markers = [
        " and also ", " as well as ", " alongside ", " furthermore ",
        " and what is ", " and how does ", " in addition to ",
    ]
    if any(marker in q for marker in multi_part_markers):
        return True

    return False


def decompose_query(query: str) -> list[str]:
    """Decompose a complex query into 2 to 3 targeted sub-queries.

    Uses rule-based semantic splitting to guarantee zero external API latency.
    """
    q = query.strip()

    # Pattern 1: "Compare X and Y [with Z]"
    compare_match = re.search(r"(?i)compare\s+(.+?)\s+(?:and|with|to|vs\.?)\s+(.+?)(?:\s+(?:and|with)\s+(.+))?$", q)
    if compare_match:
        groups = [g.strip() for g in compare_match.groups() if g]
        if len(groups) >= 2:
            sub_queries = [f"{g} details and metrics" for g in groups]
            logger.info(f"Query Decomposition (Comparative): '{query}' -> {sub_queries}")
            return sub_queries

    # Pattern 2: Multi-clause split via "as well as", "and also"
    clauses = re.split(r"(?i)\s+(?:and also|as well as|in addition to)\s+", q)
    if len(clauses) >= 2:
        sub_queries = [c.strip() for c in clauses if c.strip()]
        logger.info(f"Query Decomposition (Multi-clause): '{query}' -> {sub_queries}")
        return sub_queries

    # Fallback: Single query
    return [query]


def retrieve_with_decomposition(
    query: str,
    document_ids: Optional[list[str]] = None,
    top_k: int = 8,
) -> tuple[list[dict], list[str]]:
    """Decompose query if complex, retrieve chunks for all sub-queries, and deduplicate.

    Returns:
        tuple[list[dict], list[str]]: (deduplicated_chunks, sub_queries_executed)
    """
    if not is_complex_query(query):
        chunks = retrieve_chunks(query, document_ids=document_ids, top_k=top_k)
        return chunks, [query]

    sub_queries = decompose_query(query)
    logger.info(f"Executing parallel retrieval across {len(sub_queries)} sub-queries")

    # Allocate sub-k per sub-query
    sub_k = max(3, (top_k // len(sub_queries)) + 2)

    seen_keys = set()
    merged_chunks = []

    for sub_q in sub_queries:
        sub_results = retrieve_chunks(sub_q, document_ids=document_ids, top_k=sub_k)
        for chunk in sub_results:
            key = (chunk.get("document_id"), chunk.get("chunk_index", 0))
            if key not in seen_keys:
                seen_keys.add(key)
                merged_chunks.append(chunk)

    # Sort merged chunks by relevance score
    merged_chunks.sort(key=lambda c: c.get("score", 0.0), reverse=True)
    final_chunks = merged_chunks[:top_k]

    logger.info(f"Decomposition yielded {len(final_chunks)} deduplicated chunks from {len(sub_queries)} sub-queries")
    return final_chunks, sub_queries
