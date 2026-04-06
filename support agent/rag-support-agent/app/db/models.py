from sqlalchemy import Column, String, Float, Text, DateTime, JSON, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from pgvector.sqlalchemy import Vector
from datetime import datetime
import uuid

Base = declarative_base()


class EmbeddingChunk(Base):
    """SQLAlchemy model for storing text chunks with embeddings in PostgreSQL."""

    __tablename__ = "embedding_chunks"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Main fields
    chunk_id = Column(String(255), unique=True, nullable=False, index=True)
    text = Column(Text, nullable=False)
    source = Column(String(255), nullable=False)
    embedding = Column(Vector(1536), nullable=False)  # OpenAI embedding dimension

    # Metadata
    metadata_json = Column(JSON, nullable=True, default={})
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Indexes for fast lookup
    __table_args__ = (
        Index("ix_embedding_chunks_source", "source"),
        Index("ix_embedding_chunks_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<EmbeddingChunk(chunk_id={self.chunk_id}, source={self.source})>"


class IngestLog(Base):
    """Track ingestion events."""

    __tablename__ = "ingest_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_file = Column(String(255), nullable=False)
    num_chunks = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)  # success, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_ingest_logs_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<IngestLog(source={self.source_file}, status={self.status})>"
