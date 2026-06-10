"""Retriever — embeds the query and searches the vector store for relevant chunks."""

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

    Flow: embed query → search vector store → return top-k results

    Returns:
        List of dicts with: text, document_id, filename, page, score
    """
    top_k = top_k or settings.TOP_K_RETRIEVAL

    logger.info(f"Retrieving top-{top_k} chunks for: '{query[:80]}...'")

    # Embed the query
    query_embedding = embed_query(query)

    # Search vector store
    vector_store = get_vector_store()
    results = vector_store.query(
        embedding=query_embedding,
        top_k=top_k,
        document_ids=document_ids,
    )

    logger.info(f"Retrieved {len(results)} chunks "
                f"(scores: {[r.get('score', 0) for r in results]})")

    return results
