from pydantic import BaseModel
from typing import Optional
import uuid


class Chunk(BaseModel):
    """Represents a text chunk from the knowledge base."""

    id: str = None
    text: str
    source: str = "faq.txt"
    start_idx: int = 0  # Character index in original document
    metadata: dict = {}

    def __init__(self, **data):
        super().__init__(**data)
        if self.id is None:
            self.id = str(uuid.uuid4())


class EmbeddedChunk(BaseModel):
    """Represents a chunk with its precomputed embedding."""

    chunk_id: str
    text: str
    source: str
    embedding: list  # 1536-dim vector for text-embedding-3-small
    metadata: dict = {}


class ChunkWithScore(BaseModel):
    """Chunk with similarity score, used in retrieval results."""

    chunk_id: str
    text: str
    source: str
    similarity_score: float
    metadata: dict = {}
