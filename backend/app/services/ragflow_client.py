"""RAGFlow HTTP API client for enhanced retrieval.

Plugin: https://github.com/infiniflow/ragflow
- Deep document parsing
- Knowledge graph extraction
- Context-aware retrieval
"""

import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


class RAGFlowClient:
    """HTTP client for RAGFlow API integration.
    
    RAGFlow provides advanced RAG capabilities including deep document parsing,
    knowledge graph extraction, and template-based chunking.
    Falls back gracefully if RAGFlow is not available.
    """

    def __init__(self):
        self._base_url = settings.RAGFLOW_API_URL
        self._api_key = settings.RAGFLOW_API_KEY
        self._dataset_id = settings.RAGFLOW_DATASET_ID
        self._available: bool | None = None

    def is_available(self) -> bool:
        """Check if RAGFlow is configured and reachable."""
        if not self._base_url or not self._api_key:
            return False
        if self._available is not None:
            return self._available
        return True  # Assume available, will fail gracefully

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    async def check_health(self) -> bool:
        """Check if RAGFlow service is healthy."""
        if not self._base_url:
            self._available = False
            return False

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    f"{self._base_url}/api/v1/datasets",
                    headers=self._headers(),
                )
                self._available = resp.status_code == 200
                return self._available
        except Exception as e:
            logger.warning(f"RAGFlow health check failed: {e}")
            self._available = False
            return False

    async def upload_document(self, filename: str, content: str, dataset_id: str | None = None) -> dict:
        """Upload a document to RAGFlow for processing."""
        if not self.is_available():
            return {"status": "skipped", "reason": "RAGFlow not available"}

        ds_id = dataset_id or self._dataset_id
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{self._base_url}/api/v1/datasets/{ds_id}/documents",
                    headers=self._headers(),
                    files={"file": (filename, content.encode(), "text/plain")},
                )
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.error(f"RAGFlow document upload failed: {e}")
            return {"status": "error", "error": str(e)}

    async def query_knowledge_base(
        self,
        query: str,
        dataset_ids: list[str] | None = None,
        top_k: int = 5,
    ) -> list[dict]:
        """Query the RAGFlow knowledge base for relevant chunks."""
        if not self.is_available():
            return []

        ds_ids = dataset_ids or ([self._dataset_id] if self._dataset_id else [])

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{self._base_url}/api/v1/retrieval",
                    headers=self._headers(),
                    json={
                        "question": query,
                        "dataset_ids": ds_ids,
                        "top_k": top_k,
                    },
                )
                resp.raise_for_status()
                data = resp.json()

                chunks = data.get("data", {}).get("chunks", [])
                return [
                    {
                        "content": chunk.get("content", ""),
                        "score": chunk.get("similarity", 0.0),
                        "document": chunk.get("document_name", ""),
                        "metadata": chunk.get("metadata", {}),
                    }
                    for chunk in chunks
                ]
        except Exception as e:
            logger.error(f"RAGFlow query failed: {e}")
            return []

    async def create_dataset(self, name: str, description: str = "") -> dict:
        """Create a new dataset in RAGFlow."""
        if not self.is_available():
            return {"status": "skipped"}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{self._base_url}/api/v1/datasets",
                    headers=self._headers(),
                    json={"name": name, "description": description},
                )
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.error(f"RAGFlow dataset creation failed: {e}")
            return {"status": "error", "error": str(e)}


ragflow_client = RAGFlowClient()
