"""ChromaDB vector store for log embeddings and semantic search."""

import logging
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.config import settings
from app.services.embedding import embedding_service

logger = logging.getLogger(__name__)


class VectorStore:
    """ChromaDB-based vector store for logs, incidents, and documentation.
    
    Collections:
    - logs: Embedded log chunks for similarity search
    - incidents: Past incident reports and analyses
    - documentation: Runbooks, documentation snippets
    """

    COLLECTIONS = ["logs", "incidents", "documentation"]

    def __init__(self):
        self.client: chromadb.ClientAPI | None = None
        self._collections: dict = {}

    def initialize(self):
        """Initialize ChromaDB client and collections."""
        logger.info(f"Initializing ChromaDB at {settings.CHROMA_PERSIST_DIR}")
        self.client = chromadb.PersistentClient(
            path=settings.CHROMA_PERSIST_DIR,
            settings=ChromaSettings(anonymized_telemetry=False),
        )

        for name in self.COLLECTIONS:
            self._collections[name] = self.client.get_or_create_collection(
                name=name,
                metadata={"hnsw:space": "cosine"},
            )
        logger.info(f"ChromaDB initialized with collections: {self.COLLECTIONS}")

    def add_documents(
        self,
        collection_name: str,
        documents: list[str],
        metadatas: list[dict] | None = None,
        ids: list[str] | None = None,
    ) -> int:
        """Add documents to a collection with auto-generated embeddings."""
        if collection_name not in self._collections:
            raise ValueError(f"Unknown collection: {collection_name}")

        collection = self._collections[collection_name]

        # Generate IDs if not provided
        if ids is None:
            import uuid
            ids = [f"{collection_name}_{uuid.uuid4().hex[:12]}" for _ in range(len(documents))]

        # Generate embeddings
        embeddings = embedding_service.encode_texts(documents)

        # Add to ChromaDB
        collection.add(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas or [{}] * len(documents),
            ids=ids,
        )

        logger.info(f"Added {len(documents)} documents to '{collection_name}'")
        return len(documents)

    def search_similar(
        self,
        collection_name: str,
        query: str,
        top_k: int = 5,
        where: dict | None = None,
    ) -> list[dict]:
        """Search for similar documents using semantic similarity."""
        if collection_name not in self._collections:
            return []

        collection = self._collections[collection_name]
        if collection.count() == 0:
            return []

        query_embedding = embedding_service.encode_single(query)

        search_kwargs = {
            "query_embeddings": [query_embedding],
            "n_results": min(top_k, collection.count()),
        }
        if where:
            search_kwargs["where"] = where

        results = collection.query(**search_kwargs)

        formatted = []
        for i in range(len(results["ids"][0])):
            formatted.append({
                "id": results["ids"][0][i],
                "document": results["documents"][0][i] if results["documents"] else "",
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "distance": results["distances"][0][i] if results["distances"] else 0.0,
                "score": 1 - results["distances"][0][i] if results["distances"] else 0.0,
            })

        return formatted

    def hybrid_search(
        self,
        collection_name: str,
        query: str,
        keywords: list[str] | None = None,
        top_k: int = 5,
    ) -> list[dict]:
        """Hybrid search combining semantic and keyword matching."""
        # Semantic search
        semantic_results = self.search_similar(collection_name, query, top_k=top_k * 2)

        if not keywords:
            return semantic_results[:top_k]

        # Boost results that contain keywords
        for result in semantic_results:
            doc_lower = result["document"].lower()
            keyword_hits = sum(1 for kw in keywords if kw.lower() in doc_lower)
            # Boost score by keyword matches
            result["score"] = result["score"] + (keyword_hits * 0.1)
            result["keyword_hits"] = keyword_hits

        # Re-sort by boosted score
        semantic_results.sort(key=lambda x: x["score"], reverse=True)
        return semantic_results[:top_k]

    def get_collection_stats(self) -> dict:
        """Get statistics for all collections."""
        stats = {}
        for name, collection in self._collections.items():
            stats[name] = {"count": collection.count()}
        return stats


vector_store = VectorStore()
