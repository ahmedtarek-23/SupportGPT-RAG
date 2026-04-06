"""
Factory for creating appropriate EmbeddingStore instance based on configuration.
"""

import logging
from app.core.config import get_settings
from app.services.embedding_storage import EmbeddingStore, JSONEmbeddingStore

logger = logging.getLogger(__name__)


def get_embedding_store() -> EmbeddingStore:
    """
    Create and return the appropriate EmbeddingStore instance.

    Returns:
        EmbeddingStore instance (JSONEmbeddingStore or PgVectorStore)
    """
    settings = get_settings()
    store_type = settings.embedding_store_type.lower()

    if store_type == "pgvector":
        try:
            from app.services.pgvector_store import PgVectorStore
            logger.info("Using PgVectorStore for embeddings")
            return PgVectorStore()
        except ImportError:
            logger.warning("pgvector dependencies not available, falling back to JSONEmbeddingStore")
            return JSONEmbeddingStore()
    else:
        logger.info("Using JSONEmbeddingStore for embeddings")
        return JSONEmbeddingStore()
