"""
Hybrid search service combining vector similarity and BM25 keyword matching.

Improves retrieval by combining semantic (vector) search with lexical (BM25) search,
capturing both conceptual similarity and exact keyword matches.
"""

import logging
from typing import List, Dict, Tuple
from bm25 import BM25Okapi
import numpy as np

from app.schemas.chunk import EmbeddedChunk, ChunkWithScore
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class HybridSearchService:
    """
    Hybrid search combining vector similarity and BM25 keyword matching.
    
    Tokenizes documents and queries for BM25, then combines BM25 scores with
    vector similarity scores using configurable weighting.
    """
    
    def __init__(self):
        """Initialize hybrid search service."""
        settings = get_settings()
        self.vector_weight = settings.hybrid_vector_weight
        self.keyword_weight = settings.hybrid_keyword_weight
        self.normalize_scores = settings.hybrid_normalize_scores
        
        # Initialize BM25 with empty corpus
        self.bm25 = None
        self.embedded_chunks = {}
        logger.info(
            f"Hybrid search initialized: vector_weight={self.vector_weight}, "
            f"keyword_weight={self.keyword_weight}"
        )
    
    def _tokenize(self, text: str) -> List[str]:
        """
        Simple whitespace tokenization with lowercasing.
        
        Args:
            text: Text to tokenize
        
        Returns:
            List of tokens
        """
        return text.lower().split()
    
    def index_chunks(self, chunks: List[EmbeddedChunk]) -> None:
        """
        Build BM25 index from chunks.
        
        Args:
            chunks: List of EmbeddedChunk objects to index
        """
        if not chunks:
            logger.warning("No chunks provided for indexing")
            return
        
        try:
            # Tokenize all chunk texts for BM25
            tokenized_corpus = [self._tokenize(chunk.text) for chunk in chunks]
            
            # Initialize BM25
            self.bm25 = BM25Okapi(tokenized_corpus)
            
            # Store chunks for later retrieval
            self.embedded_chunks = {chunk.chunk_id: chunk for chunk in chunks}
            
            logger.info(f"Indexed {len(chunks)} chunks for hybrid search")
        except Exception as e:
            logger.error(f"Error indexing chunks for hybrid search: {e}")
            self.bm25 = None
    
    def _normalize_scores(self, scores: np.ndarray) -> np.ndarray:
        """
        Normalize scores to 0-1 range using min-max normalization.
        
        Args:
            scores: Array of scores
        
        Returns:
            Normalized scores
        """
        if len(scores) == 0:
            return scores
        
        min_score = np.min(scores)
        max_score = np.max(scores)
        
        if max_score - min_score < 1e-6:  # Avoid division by zero
            return np.ones_like(scores) * 0.5
        
        return (scores - min_score) / (max_score - min_score)
    
    def search(
        self,
        query: str,
        vector_similarities: Dict[str, float],
        top_k: int = 10,
    ) -> List[ChunkWithScore]:
        """
        Perform hybrid search combining vector and BM25 scores.
        
        Args:
            query: Search query
            vector_similarities: Dict mapping chunk_id to vector similarity score
            top_k: Number of top results to return
        
        Returns:
            List of ChunkWithScore sorted by hybrid score
        """
        if not vector_similarities or not self.embedded_chunks:
            return []
        
        try:
            # Get BM25 scores
            bm25_scores = {}
            if self.bm25:
                tokenized_query = self._tokenize(query)
                bm25_doc_scores = self.bm25.get_scores(tokenized_query)
                
                # Map BM25 scores back to chunk IDs
                for idx, chunk_id in enumerate(self.embedded_chunks.keys()):
                    if idx < len(bm25_doc_scores):
                        bm25_scores[chunk_id] = bm25_doc_scores[idx]
            
            # Prepare scores for normalization
            vector_scores_list = list(vector_similarities.values())
            bm25_scores_list = list(bm25_scores.values())
            
            # Normalize scores if requested
            if self.normalize_scores:
                vector_scores_array = np.array(vector_scores_list) if vector_scores_list else np.array([])
                bm25_scores_array = np.array(bm25_scores_list) if bm25_scores_list else np.array([])
                
                normalize_vector = self._normalize_scores(vector_scores_array)
                normalize_bm25 = self._normalize_scores(bm25_scores_array)
                
                # Reconstruct normalized dicts
                vector_scores = {
                    chunk_id: float(normalize_vector[i])
                    for i, chunk_id in enumerate(vector_similarities.keys())
                }
                bm25_scores = {
                    chunk_id: float(normalize_bm25[i])
                    for i, chunk_id in enumerate(bm25_scores.keys())
                }
            else:
                vector_scores = vector_similarities
            
            # Combine scores with weighting
            hybrid_scores = {}
            for chunk_id in self.embedded_chunks.keys():
                vector_score = vector_scores.get(chunk_id, 0.0)
                bm25_score = bm25_scores.get(chunk_id, 0.0)
                
                # Weighted combination
                hybrid_score = (
                    self.vector_weight * vector_score +
                    self.keyword_weight * bm25_score
                )
                hybrid_scores[chunk_id] = hybrid_score
            
            # Sort by hybrid score
            sorted_chunks = sorted(
                hybrid_scores.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            # Build ChunkWithScore results
            results = []
            for chunk_id, score in sorted_chunks[:top_k]:
                chunk = self.embedded_chunks[chunk_id]
                results.append(
                    ChunkWithScore(
                        chunk_id=chunk.chunk_id,
                        text=chunk.text,
                        source=chunk.source,
                        similarity_score=score,
                        metadata=chunk.metadata,
                    )
                )
            
            logger.debug(
                f"Hybrid search returned {len(results)} results "
                f"(vector_weight={self.vector_weight}, bm25_weight={self.keyword_weight})"
            )
            return results
            
        except Exception as e:
            logger.error(f"Error during hybrid search: {e}")
            # Fallback: return vector similarity results
            return [
                ChunkWithScore(
                    chunk_id=chunk_id,
                    text=self.embedded_chunks[chunk_id].text,
                    source=self.embedded_chunks[chunk_id].source,
                    similarity_score=score,
                    metadata=self.embedded_chunks[chunk_id].metadata,
                )
                for chunk_id, score in sorted(
                    vector_similarities.items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:top_k]
            ]
    
    def get_stats(self) -> dict:
        """Get statistics about the indexed chunks."""
        return {
            "num_chunks_indexed": len(self.embedded_chunks),
            "bm25_available": self.bm25 is not None,
            "vector_weight": self.vector_weight,
            "keyword_weight": self.keyword_weight,
        }
