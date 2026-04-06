"""
Reranking service using cross-encoders for semantic relevance re-scoring.

Improves retrieval quality by re-ranking initial results using a cross-encoder model
that jointly encodes query and candidate text for more accurate relevance scoring.
"""

import logging
from typing import List, Optional, Tuple
from sentence_transformers import CrossEncoder

from app.schemas.chunk import ChunkWithScore
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class RerankerService:
    """
    Cross-encoder based reranking service.
    
    Provides semantic re-ranking of retrieved chunks using cross-encoder models.
    Cross-encoders directly score query-document pairs, providing more accurate
    relevance assessments than vector similarity alone.
    """
    
    def __init__(self, model_name: Optional[str] = None):
        """
        Initialize the reranker with a cross-encoder model.
        
        Args:
            model_name: Cross-encoder model identifier (defaults to config value)
        """
        settings = get_settings()
        self.model_name = model_name or settings.reranker_model
        self.batch_size = settings.reranker_batch_size
        self.top_k = settings.reranker_top_k
        
        try:
            self.model = CrossEncoder(self.model_name)
            self.available = True
            logger.info(f"Reranker initialized with model: {self.model_name}")
        except Exception as e:
            logger.warning(f"Failed to initialize reranker model: {e}. Reranking disabled.")
            self.model = None
            self.available = False
    
    def rerank(
        self,
        query: str,
        chunks: List[ChunkWithScore],
        top_k: Optional[int] = None,
    ) -> Tuple[List[ChunkWithScore], List[float]]:
        """
        Re-rank chunks using cross-encoder model.
        
        Args:
            query: The search query
            chunks: List of ChunkWithScore objects to rerank
            top_k: Number of top results to return (defaults to config value)
        
        Returns:
            Tuple of:
                - Re-ranked chunks (sorted by cross-encoder score)
                - Raw scores from cross-encoder
        """
        if not self.available or not chunks:
            return chunks, []
        
        top_k = top_k or self.top_k
        
        try:
            # Prepare chunk texts for cross-encoder
            chunk_texts = [chunk.text for chunk in chunks]
            
            # Create query-document pairs
            pairs = [[query, text] for text in chunk_texts]
            
            # Get cross-encoder scores
            scores = self.model.predict(pairs, batch_size=self.batch_size, convert_to_numpy=True)
            
            # Create scored chunks with reranker scores
            scored_chunks = [
                {
                    "chunk": chunks[i],
                    "rerank_score": float(scores[i]),
                    "original_score": chunks[i].similarity_score,
                }
                for i in range(len(chunks))
            ]
            
            # Sort by cross-encoder score (descending)
            scored_chunks.sort(key=lambda x: x["rerank_score"], reverse=True)
            
            # Extract top-k chunks and update their scores
            top_chunks = scored_chunks[:top_k]
            reranked_chunks = [
                ChunkWithScore(
                    chunk_id=item["chunk"].chunk_id,
                    text=item["chunk"].text,
                    source=item["chunk"].source,
                    similarity_score=item["rerank_score"],  # Updated to cross-encoder score
                    metadata=item["chunk"].metadata,
                )
                for item in top_chunks
            ]
            
            # Collect raw scores
            rerank_scores = [item["rerank_score"] for item in top_chunks]
            
            logger.debug(f"Reranked {len(chunks)} chunks to top {len(reranked_chunks)}")
            return reranked_chunks, rerank_scores
            
        except Exception as e:
            logger.error(f"Error during reranking: {e}")
            return chunks[:top_k], []
    
    def get_model_info(self) -> dict:
        """Get information about the loaded reranker model."""
        return {
            "model_name": self.model_name,
            "available": self.available,
            "batch_size": self.batch_size,
        }
