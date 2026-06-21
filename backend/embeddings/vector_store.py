"""Vector Store — abstraction layer for Pinecone (prod) and local JSON (dev)."""

import os
import json
import math
import uuid
from config import settings
from utils.logger import logger

_store = None


def get_vector_store():
    """Get or create the vector store singleton."""
    global _store
    if _store is None:
        if settings.VECTOR_STORE == "pinecone" and settings.PINECONE_API_KEY:
            _store = PineconeStore()
        else:
            _store = LocalStore()
    return _store


class VectorStore:
    """Base interface for vector stores."""

    def add(self, chunks: list[dict], embeddings: list[list[float]], document_id: str):
        raise NotImplementedError

    def query(self, embedding: list[float], top_k: int = 5, document_ids: list[str] | None = None) -> list[dict]:
        raise NotImplementedError

    def delete(self, document_id: str):
        raise NotImplementedError


class PineconeStore(VectorStore):
    """Pinecone vector store for production."""

    def __init__(self):
        from pinecone import Pinecone
        self.pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        self.index = self.pc.Index(settings.PINECONE_INDEX)
        logger.info(f"Connected to Pinecone index: {settings.PINECONE_INDEX}")

    def add(self, chunks: list[dict], embeddings: list[list[float]], document_id: str):
        vectors = []
        for chunk, embedding in zip(chunks, embeddings):
            vec_id = f"{document_id}_{chunk['chunk_index']}"
            vectors.append({
                "id": vec_id,
                "values": embedding,
                "metadata": {
                    "text": chunk["text"],  # Full text (fits within 40KB Pinecone metadata limit)
                    "document_id": document_id,
                    "filename": chunk["filename"],
                    "page_number": chunk["page_number"],
                    "chunk_index": chunk["chunk_index"],
                    "section": chunk.get("section", ""),
                },
            })

        # Upsert in batches of 100
        for i in range(0, len(vectors), 100):
            batch = vectors[i:i + 100]
            self.index.upsert(vectors=batch)

        logger.info(f"Stored {len(vectors)} vectors in Pinecone for doc {document_id}")

    def query(self, embedding: list[float], top_k: int = 5, document_ids: list[str] | None = None):
        filter_dict = {}
        if document_ids:
            filter_dict["document_id"] = {"$in": document_ids}

        results = self.index.query(
            vector=embedding,
            top_k=top_k,
            include_metadata=True,
            filter=filter_dict if filter_dict else None,
        )

        chunks = []
        for match in results.get("matches", []):
            meta = match.get("metadata", {})
            chunks.append({
                "text": meta.get("text", ""),
                "document_id": meta.get("document_id", ""),
                "filename": meta.get("filename", ""),
                "page": meta.get("page_number", 0),
                "chunk_index": meta.get("chunk_index", 0),
                "section": meta.get("section", ""),
                "score": match.get("score", 0.0),
            })

        return chunks

    def delete(self, document_id: str):
        # Delete all vectors with this document_id prefix
        try:
            self.index.delete(filter={"document_id": document_id})
            logger.info(f"Deleted vectors for doc {document_id} from Pinecone")
        except Exception as e:
            logger.warning(f"Pinecone delete failed: {e}")


class LocalStore(VectorStore):
    """Simple JSON file-based vector store for local development."""

    def __init__(self):
        self.store_dir = settings.CHROMA_PERSIST_DIR
        os.makedirs(self.store_dir, exist_ok=True)
        self.store_file = os.path.join(self.store_dir, "vectors.json")
        self.data = self._load()
        logger.info(f"Local vector store: {self.store_file} ({len(self.data)} vectors)")

    def _load(self) -> list[dict]:
        if os.path.exists(self.store_file):
            with open(self.store_file, "r") as f:
                return json.load(f)
        return []

    def _save(self):
        with open(self.store_file, "w") as f:
            json.dump(self.data, f)

    def add(self, chunks: list[dict], embeddings: list[list[float]], document_id: str):
        for chunk, embedding in zip(chunks, embeddings):
            self.data.append({
                "id": f"{document_id}_{chunk['chunk_index']}",
                "embedding": embedding,
                "metadata": {
                    "text": chunk["text"],
                    "document_id": document_id,
                    "filename": chunk["filename"],
                    "page_number": chunk["page_number"],
                    "chunk_index": chunk["chunk_index"],
                    "section": chunk.get("section", ""),
                },
            })
        self._save()
        logger.info(f"Stored {len(chunks)} vectors locally for doc {document_id}")

    def query(self, embedding: list[float], top_k: int = 5, document_ids: list[str] | None = None):
        scored = []
        for item in self.data:
            # Filter by document_ids if specified
            if document_ids and item["metadata"]["document_id"] not in document_ids:
                continue

            score = self._cosine_similarity(embedding, item["embedding"])
            scored.append((score, item))

        # Sort by score descending
        scored.sort(key=lambda x: x[0], reverse=True)

        results = []
        for score, item in scored[:top_k]:
            meta = item["metadata"]
            results.append({
                "text": meta["text"],
                "document_id": meta["document_id"],
                "filename": meta["filename"],
                "page": meta["page_number"],
                "chunk_index": meta["chunk_index"],
                "section": meta.get("section", ""),
                "score": round(score, 4),
            })

        return results

    def delete(self, document_id: str):
        before = len(self.data)
        self.data = [v for v in self.data if v["metadata"]["document_id"] != document_id]
        self._save()
        logger.info(f"Deleted {before - len(self.data)} vectors for doc {document_id}")

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)
