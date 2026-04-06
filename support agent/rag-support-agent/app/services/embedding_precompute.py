"""
Orchestration script for precomputing embeddings.
Run once to generate embeddings for the knowledge base.
"""

import logging
from app.services.ingestion_service import ingest_knowledge_base
from app.services.embedding_service import EmbeddingService
from app.services.embedding_store_factory import get_embedding_store
from app.core.config import get_settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def precompute_embeddings(force_refresh: bool = False) -> bool:
    """
    Load knowledge base, generate embeddings, and store them.

    Args:
        force_refresh: If True, regenerate embeddings even if they exist

    Returns:
        True if embeddings were generated, False if they already exist
    """
    settings = get_settings()
    store = get_embedding_store()

    # Check if embeddings already exist
    if store.exists() and not force_refresh:
        logger.info("Embeddings already exist. Skipping precomputation.")
        return False

    logger.info("Starting embedding precomputation...")

    try:
        # Step 1: Load and chunk knowledge base
        logger.info("Loading knowledge base...")
        chunks = ingest_knowledge_base()
        logger.info(f"Loaded {len(chunks)} chunks from knowledge base")

        # Step 2: Generate embeddings
        logger.info("Generating embeddings...")
        embedding_service = EmbeddingService()
        embedded_chunks = embedding_service.generate_embeddings(chunks)

        # Step 3: Store embeddings
        logger.info("Storing embeddings...")
        store.save(embedded_chunks)

        logger.info("✓ Embedding precomputation completed successfully")
        return True

    except Exception as e:
        logger.error(f"Error during embedding precomputation: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    # Manual precompute script
    import sys

    force_refresh = "--force" in sys.argv or "-f" in sys.argv
    precompute_embeddings(force_refresh=force_refresh)
