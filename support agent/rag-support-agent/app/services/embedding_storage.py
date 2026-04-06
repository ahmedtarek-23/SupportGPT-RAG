from abc import ABC, abstractmethod
from typing import Dict, List
from pathlib import Path
import json
import logging
from app.schemas.chunk import EmbeddedChunk
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class EmbeddingStore(ABC):
    """Abstract base class for embedding storage."""

    @abstractmethod
    def save(self, embedded_chunks: List[EmbeddedChunk]) -> None:
        """Save embedded chunks to storage."""
        pass

    @abstractmethod
    def load(self) -> Dict[str, List[float]]:
        """Load embeddings from storage. Returns mapping of chunk_id -> embedding."""
        pass

    @abstractmethod
    def exists(self) -> bool:
        """Check if embeddings exist in storage."""
        pass

    @abstractmethod
    def get_chunk_metadata(self, chunk_id: str) -> dict:
        """Get metadata for a chunk (text, source, etc.)."""
        pass


class JSONEmbeddingStore(EmbeddingStore):
    """JSON file-based embedding storage (MVP implementation)."""

    def __init__(self, storage_path: str | None = None):
        if storage_path is None:
            storage_path = get_settings().embedding_storage_path

        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        logger.info(f"Initialized JSONEmbeddingStore at {self.storage_path}")

    def save(self, embedded_chunks: List[EmbeddedChunk]) -> None:
        """Save embedded chunks to JSON file."""
        data = {
            "chunks": [
                {
                    "chunk_id": chunk.chunk_id,
                    "text": chunk.text,
                    "source": chunk.source,
                    "embedding": chunk.embedding,
                    "metadata": chunk.metadata,
                }
                for chunk in embedded_chunks
            ],
            "count": len(embedded_chunks),
            "embedding_dim": len(embedded_chunks[0].embedding) if embedded_chunks else 0,
        }

        with open(self.storage_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

        logger.info(f"Saved {len(embedded_chunks)} embeddings to {self.storage_path}")

    def load(self) -> Dict[str, List[float]]:
        """Load embeddings from JSON file."""
        if not self.exists():
            logger.warning(f"No embeddings found at {self.storage_path}")
            return {}

        with open(self.storage_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Return mapping of chunk_id -> embedding
        embeddings = {chunk["chunk_id"]: chunk["embedding"] for chunk in data["chunks"]}
        logger.info(f"Loaded {len(embeddings)} embeddings from {self.storage_path}")
        return embeddings

    def load_all_chunks(self) -> List[EmbeddedChunk]:
        """Load all chunks with embeddings."""
        if not self.exists():
            return []

        with open(self.storage_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        chunks = [
            EmbeddedChunk(
                chunk_id=chunk["chunk_id"],
                text=chunk["text"],
                source=chunk["source"],
                embedding=chunk["embedding"],
                metadata=chunk.get("metadata", {}),
            )
            for chunk in data["chunks"]
        ]
        return chunks

    def exists(self) -> bool:
        """Check if embeddings file exists."""
        return self.storage_path.exists()

    def get_chunk_metadata(self, chunk_id: str) -> dict:
        """Get metadata and text for a chunk."""
        if not self.exists():
            return {}

        with open(self.storage_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        for chunk in data["chunks"]:
            if chunk["chunk_id"] == chunk_id:
                return {
                    "text": chunk["text"],
                    "source": chunk["source"],
                    "metadata": chunk.get("metadata", {}),
                }
        return {}
