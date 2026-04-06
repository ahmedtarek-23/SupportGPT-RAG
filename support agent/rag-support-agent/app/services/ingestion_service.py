import logging
from typing import List, Optional
from app.schemas.chunk import Chunk
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class IngestService:
    """Service for ingesting and chunking documents."""
    
    def __init__(self):
        self.settings = get_settings()
        self.chunk_size = self.settings.chunk_size
        self.chunk_overlap = self.settings.chunk_overlap
    
    def chunk_text(
        self,
        text: str,
        source: str = "unknown",
        chunk_size: Optional[int] = None,
        overlap: Optional[int] = None,
    ) -> List[Chunk]:
        """
        Split text into chunks with sliding window overlap.

        Args:
            text: The text to chunk
            source: Source document name
            chunk_size: Size of each chunk in characters (default from config)
            overlap: Number of overlapping characters between chunks (default from config)

        Returns:
            List of Chunk objects with IDs and metadata
        """
        chunk_size = chunk_size or self.chunk_size
        overlap = overlap or self.chunk_overlap

        chunks = []
        start_idx = 0

        while start_idx < len(text):
            end_idx = min(start_idx + chunk_size, len(text))
            chunk_text = text[start_idx:end_idx].strip()

            if chunk_text:  # Only add non-empty chunks
                chunk = Chunk(
                    text=chunk_text,
                    source=source,
                    start_idx=start_idx,
                    metadata={
                        "chunk_size": len(chunk_text),
                        "source": source,
                    },
                )
                chunks.append(chunk)

            # Move start_idx forward by (chunk_size - overlap)
            start_idx = end_idx - overlap if end_idx < len(text) else len(text)

        logger.debug(f"Created {len(chunks)} chunks from {source}")
        return chunks


# Legacy function-based interface for backward compatibility
def load_text_file(file_path: str | None = None) -> str:
    """Load text from a file."""
    if file_path is None:
        file_path = get_settings().faq_file_path

    with open(file_path, "r", encoding="utf-8") as f:
        return f.read()


def chunk_text(text: str, chunk_size: int = None, overlap: int = None) -> List[Chunk]:
    """
    Split text into chunks with sliding window overlap.

    Args:
        text: The text to chunk
        chunk_size: Size of each chunk in characters (default from config)
        overlap: Number of overlapping characters between chunks (default from config)

    Returns:
        List of Chunk objects with IDs and metadata
    """
    service = IngestService()
    return service.chunk_text(text, source="faq.txt", chunk_size=chunk_size, overlap=overlap)


def ingest_knowledge_base(file_path: str | None = None) -> List[Chunk]:
    """
    Load knowledge base and split into chunks.

    Args:
        file_path: Path to the FAQ file (optional)

    Returns:
        List of chunked text
    """
    text = load_text_file(file_path)
    chunks = chunk_text(text)
    return chunks