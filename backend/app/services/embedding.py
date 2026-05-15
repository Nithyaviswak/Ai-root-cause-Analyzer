"""Embedding service using sentence-transformers."""

import logging
from pathlib import Path
from sentence_transformers import SentenceTransformer
import numpy as np
from app.config import settings

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generates embeddings using sentence-transformers.
    
    Plugin: https://github.com/huggingface/sentence-transformers
    - Supports loading pre-trained and fine-tuned models
    - Default model: all-MiniLM-L6-v2 (fast, 384-dim)
    """

    def __init__(self):
        self.model: SentenceTransformer | None = None
        self.model_name: str = settings.EMBEDDING_MODEL_NAME

    def load_model(self):
        """Load the embedding model (pre-trained or fine-tuned)."""
        model_path = settings.FINETUNED_MODEL_PATH

        if model_path and Path(model_path).exists():
            logger.info(f"Loading fine-tuned embedding model from {model_path}")
            self.model = SentenceTransformer(model_path)
        else:
            logger.info(f"Loading pre-trained model: {self.model_name}")
            self.model = SentenceTransformer(self.model_name)

        logger.info(f"Embedding model loaded. Dimension: {self.model.get_sentence_embedding_dimension()}")

    def encode_texts(self, texts: list[str], batch_size: int = 32) -> list[list[float]]:
        """Encode a list of texts into embeddings."""
        if not self.model:
            self.load_model()

        embeddings = self.model.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=False,
            convert_to_numpy=True,
        )
        return embeddings.tolist()

    def encode_single(self, text: str) -> list[float]:
        """Encode a single text into an embedding."""
        return self.encode_texts([text])[0]

    def compute_similarity(self, text1: str, text2: str) -> float:
        """Compute cosine similarity between two texts."""
        embeddings = self.encode_texts([text1, text2])
        vec1 = np.array(embeddings[0])
        vec2 = np.array(embeddings[1])
        similarity = np.dot(vec1, vec2) / (np.linalg.norm(vec1) * np.linalg.norm(vec2))
        return float(similarity)

    def find_most_similar(self, query: str, candidates: list[str], top_k: int = 5) -> list[dict]:
        """Find most similar texts to a query."""
        if not candidates:
            return []

        all_texts = [query] + candidates
        embeddings = self.encode_texts(all_texts)

        query_vec = np.array(embeddings[0])
        candidate_vecs = np.array(embeddings[1:])

        # Cosine similarities
        norms = np.linalg.norm(candidate_vecs, axis=1)
        similarities = np.dot(candidate_vecs, query_vec) / (norms * np.linalg.norm(query_vec) + 1e-10)

        # Top-k indices
        top_indices = np.argsort(similarities)[::-1][:top_k]

        results = []
        for idx in top_indices:
            results.append({
                "text": candidates[idx],
                "score": float(similarities[idx]),
                "index": int(idx),
            })
        return results

    @property
    def dimension(self) -> int:
        """Get embedding dimension."""
        if not self.model:
            self.load_model()
        return self.model.get_sentence_embedding_dimension()


embedding_service = EmbeddingService()
