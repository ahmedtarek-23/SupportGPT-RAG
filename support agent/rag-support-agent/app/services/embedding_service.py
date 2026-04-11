"""
Local embedding service using sentence-transformers.

Replaces OpenAI embeddings with a fully local model (all-MiniLM-L6-v2).
No API key required. 384-dimensional vectors, ~80MB model.
"""

from typing import List
from app.schemas.chunk import Chunk, EmbeddedChunk
from app.core.config import get_settings
import logging
import numpy as np

logger = logging.getLogger(__name__)

_model_cache = None


def _get_model(model_name: str):
    """Lazy-load the sentence-transformers model (cached globally)."""
    global _model_cache
    if _model_cache is None:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading embedding model: {model_name}")
        _model_cache = SentenceTransformer(model_name)
        logger.info("Embedding model loaded successfully")
    return _model_cache


class EmbeddingService:
    """Local embedding service using sentence-transformers."""

    def __init__(self):
        settings = get_settings()
        self.model_name = settings.embedding_model
        self.dimensions = settings.embedding_dimensions
        # Lazy-load model on first use to avoid startup delay
        self._model = None
        logger.info(f"EmbeddingService configured: model={self.model_name} dims={self.dimensions}")

    @property
    def model(self):
        if self._model is None:
            self._model = _get_model(self.model_name)
        return self._model

    def generate_embedding(self, text: str) -> List[float]:
        """Generate a single embedding vector."""
        try:
            embedding = self.model.encode(text, normalize_embeddings=True)
            return embedding.tolist()
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise

    def generate_embeddings(self, chunks: List[Chunk]) -> List[EmbeddedChunk]:
        """Batch-generate embeddings for efficiency."""
        if not chunks:
            return []

        texts = [chunk.text for chunk in chunks]
        logger.info(f"Generating embeddings for {len(texts)} chunks...")

        try:
            embeddings = self.model.encode(
                texts,
                normalize_embeddings=True,
                show_progress_bar=len(texts) > 10,
                batch_size=32,
            )
        except Exception as e:
            logger.error(f"Batch embedding failed: {e}")
            raise

        embedded_chunks = []
        for chunk, embedding in zip(chunks, embeddings):
            embedded_chunks.append(
                EmbeddedChunk(
                    chunk_id=chunk.id,
                    text=chunk.text,
                    source=chunk.source,
                    embedding=embedding.tolist(),
                    metadata=chunk.metadata,
                )
            )

        logger.info(f"Generated {len(embedded_chunks)} embeddings successfully")
        return embedded_chunks

    def embed_query(self, query: str) -> List[float]:
        """Generate query embedding (same as generate_embedding)."""
        return self.generate_embedding(query)
