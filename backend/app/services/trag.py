"""T-RAG (Trace-Native Retrieval) engine — hybrid search combining semantic and keyword."""

import logging
import re
from app.services.vector_store import vector_store
from app.services.ragflow_client import ragflow_client

logger = logging.getLogger(__name__)


class TRAGEngine:
    """Trace-Native Retrieval-Augmented Generation engine.
    
    Combines:
    - Semantic search via ChromaDB embeddings
    - Keyword/regex matching for exact patterns
    - RAGFlow enhanced retrieval (when available)
    - Context merging from logs + traces + metrics
    """

    def extract_keywords(self, query: str) -> list[str]:
        """Extract important keywords from a query for hybrid search."""
        # Extract error codes, service names, HTTP status codes
        keywords = []

        # HTTP status codes
        keywords.extend(re.findall(r"\b[45]\d{2}\b", query))

        # Exception/error class names
        keywords.extend(re.findall(r"\b\w*(?:Error|Exception|Failure|Timeout)\b", query))

        # Service names (word-dash-word patterns)
        keywords.extend(re.findall(r"\b[\w]+-[\w]+(?:-[\w]+)*\b", query))

        # IP addresses
        keywords.extend(re.findall(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", query))

        # Port numbers
        keywords.extend(re.findall(r":\d{2,5}\b", query))

        return list(set(keywords))

    async def retrieve(
        self,
        query: str,
        collections: list[str] | None = None,
        top_k: int = 5,
        use_ragflow: bool = True,
    ) -> dict:
        """Retrieve relevant context using hybrid search.
        
        Returns combined context from multiple sources.
        """
        if collections is None:
            collections = ["logs", "incidents", "documentation"]

        keywords = self.extract_keywords(query)
        all_results = {}

        # 1. ChromaDB hybrid search across collections
        for collection in collections:
            results = vector_store.hybrid_search(
                collection_name=collection,
                query=query,
                keywords=keywords,
                top_k=top_k,
            )
            if results:
                all_results[collection] = results

        # 2. RAGFlow enhanced retrieval (if available)
        ragflow_results = []
        if use_ragflow and ragflow_client.is_available():
            try:
                ragflow_results = await ragflow_client.query_knowledge_base(
                    query=query,
                    top_k=top_k,
                )
                if ragflow_results:
                    all_results["ragflow"] = ragflow_results
            except Exception as e:
                logger.warning(f"RAGFlow query failed: {e}")

        return {
            "query": query,
            "keywords_extracted": keywords,
            "results": all_results,
            "context": self._build_retrieval_context(all_results),
            "sources_used": list(all_results.keys()),
        }

    def _build_retrieval_context(self, results: dict) -> str:
        """Build a combined context string from retrieval results."""
        parts = []

        for source, items in results.items():
            parts.append(f"\n--- Retrieved from: {source} ---")
            for item in items[:5]:
                doc = item.get("document", item.get("content", ""))
                score = item.get("score", 0)
                parts.append(f"[relevance: {score:.2f}] {doc[:500]}")

        return "\n".join(parts) if parts else "No similar past incidents found."

    async def retrieve_similar_incidents(self, error_summary: str, top_k: int = 3) -> list[dict]:
        """Specifically retrieve similar past incidents."""
        results = vector_store.search_similar(
            collection_name="incidents",
            query=error_summary,
            top_k=top_k,
        )
        return results

    async def retrieve_documentation(self, topic: str, top_k: int = 3) -> list[dict]:
        """Retrieve relevant documentation/runbooks."""
        results = vector_store.search_similar(
            collection_name="documentation",
            query=topic,
            top_k=top_k,
        )
        return results


trag_engine = TRAGEngine()
