"""
PostgreSQL + pgvector implementation of EmbeddingStore.
Uses vector similarity search for fast retrieval.
"""

import logging
from typing import Dict, List
from sqlalchemy.orm import Session

from app.services.embedding_storage import EmbeddingStore
from app.schemas.chunk import EmbeddedChunk
from app.core.config import get_settings
from app.db.models import EmbeddingChunk as EmbeddingChunkModel
from app.db.session import get_session_factory

logger = logging.getLogger(__name__)


class PgVectorStore(EmbeddingStore):
    """PostgreSQL + pgvector-based embedding storage and retrieval."""

    def __init__(self):
        self.settings = get_settings()
        self.SessionLocal = get_session_factory()
        logger.info("Initialized PgVectorStore")

    def save(self, embedded_chunks: List[EmbeddedChunk]) -> None:
        """
        Save embedded chunks to PostgreSQL.

        Args:
            embedded_chunks: List of EmbeddedChunk objects
        """
        db: Session = self.SessionLocal()
        try:
            for chunk in embedded_chunks:
                # Check if chunk already exists
                existing = db.query(EmbeddingChunkModel).filter(
                    EmbeddingChunkModel.chunk_id == chunk.chunk_id
                ).first()

                if existing:
                    # Update existing chunk
                    existing.text = chunk.text
                    existing.embedding = chunk.embedding
                    existing.metadata_json = chunk.metadata
                    logger.debug(f"Updated chunk {chunk.chunk_id}")
                else:
                    # Create new chunk
                    db_chunk = EmbeddingChunkModel(
                        chunk_id=chunk.chunk_id,
                        text=chunk.text,
                        source=chunk.source,
                        embedding=chunk.embedding,
                        metadata_json=chunk.metadata,
                    )
                    db.add(db_chunk)
                    logger.debug(f"Created chunk {chunk.chunk_id}")

            db.commit()
            logger.info(f"Saved {len(embedded_chunks)} embeddings to PostgreSQL")

        except Exception as e:
            db.rollback()
            logger.error(f"Error saving embeddings: {e}")
            raise
        finally:
            db.close()

    def load(self) -> Dict[str, List[float]]:
        """
        Load all embeddings from PostgreSQL.

        Returns:
            Dict mapping chunk_id to embedding vector
        """
        db: Session = self.SessionLocal()
        try:
            chunks = db.query(EmbeddingChunkModel).all()

            if not chunks:
                logger.warning("No embeddings found in database")
                return {}

            embeddings = {chunk.chunk_id: chunk.embedding for chunk in chunks}
            logger.info(f"Loaded {len(embeddings)} embeddings from PostgreSQL")
            return embeddings

        except Exception as e:
            logger.error(f"Error loading embeddings: {e}")
            raise
        finally:
            db.close()

    def load_all_chunks(self) -> List[EmbeddedChunk]:
        """
        Load all chunks with embeddings from PostgreSQL.

        Returns:
            List of EmbeddedChunk objects
        """
        db: Session = self.SessionLocal()
        try:
            db_chunks = db.query(EmbeddingChunkModel).all()

            chunks = [
                EmbeddedChunk(
                    chunk_id=str(chunk.chunk_id),
                    text=chunk.text,
                    source=chunk.source,
                    embedding=chunk.embedding,
                    metadata=chunk.metadata_json or {},
                )
                for chunk in db_chunks
            ]
            logger.info(f"Loaded {len(chunks)} chunks from PostgreSQL")
            return chunks

        except Exception as e:
            logger.error(f"Error loading chunks: {e}")
            raise
        finally:
            db.close()

    def exists(self) -> bool:
        """Check if embeddings exist in database."""
        db: Session = self.SessionLocal()
        try:
            count = db.query(EmbeddingChunkModel).count()
            exists = count > 0
            logger.info(f"Database has {count} chunks")
            return exists
        except Exception as e:
            logger.error(f"Error checking if embeddings exist: {e}")
            return False
        finally:
            db.close()

    def get_chunk_metadata(self, chunk_id: str) -> dict:
        """Get metadata and text for a specific chunk."""
        db: Session = self.SessionLocal()
        try:
            chunk = db.query(EmbeddingChunkModel).filter(
                EmbeddingChunkModel.chunk_id == chunk_id
            ).first()

            if chunk:
                return {
                    "text": chunk.text,
                    "source": chunk.source,
                    "metadata": chunk.metadata_json or {},
                }
            return {}

        except Exception as e:
            logger.error(f"Error getting chunk metadata: {e}")
            return {}
        finally:
            db.close()

    def delete_all(self) -> None:
        """Delete all embeddings from database (for cleanup/reset)."""
        db: Session = self.SessionLocal()
        try:
            db.query(EmbeddingChunkModel).delete()
            db.commit()
            logger.info("Deleted all embeddings from database")
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting embeddings: {e}")
            raise
        finally:
            db.close()
