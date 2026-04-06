from typing import List, Dict
from openai import OpenAI
from app.schemas.chunk import Chunk, EmbeddedChunk
from app.core.config import get_settings
import logging

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating embeddings using OpenAI API."""

    def __init__(self):
        settings = get_settings()
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.embedding_model
        logger.info(f"Initialized EmbeddingService with model: {self.model}")

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.

        Args:
            text: The text to embed

        Returns:
            1536-dimensional embedding vector
        """
        try:
            response = self.client.embeddings.create(model=self.model, input=text)
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            raise

    def generate_embeddings(self, chunks: List[Chunk]) -> List[EmbeddedChunk]:
        """
        Generate embeddings for multiple chunks.

        Args:
            chunks: List of Chunk objects

        Returns:
            List of EmbeddedChunk objects with computed embeddings
        """
        embedded_chunks = []

        for i, chunk in enumerate(chunks):
            logger.info(f"Embedding chunk {i + 1}/{len(chunks)}")
            embedding = self.generate_embedding(chunk.text)

            embedded_chunk = EmbeddedChunk(
                chunk_id=chunk.id,
                text=chunk.text,
                source=chunk.source,
                embedding=embedding,
                metadata=chunk.metadata,
            )
            embedded_chunks.append(embedded_chunk)

        logger.info(f"Successfully generated embeddings for {len(embedded_chunks)} chunks")
        return embedded_chunks

    def embed_query(self, query: str) -> List[float]:
        """
        Generate embedding for a query.

        Args:
            query: The query text

        Returns:
            Embedding vector
        """
        return self.generate_embedding(query)
