import logging
from typing import List, Dict
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

from app.services.embedding_service import EmbeddingService
from app.services.embedding_store_factory import get_embedding_store
from app.services.hybrid_search_service import HybridSearchService
from app.services.query_expansion_service import QueryExpansionService
from app.schemas.chunk import ChunkWithScore
from app.core.config import get_settings

logger = logging.getLogger(__name__)


class RetrievalService:
    """Service for retrieving relevant chunks based on query similarity.
    
    Supports both vector similarity search and hybrid search combining vector
    similarity with BM25 keyword matching. Integrates query expansion for
    improved coverage.
    """

    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.store = get_embedding_store()
        self.settings = get_settings()
        
        # Initialize hybrid search service
        self.hybrid_search = HybridSearchService() if self.settings.enable_hybrid_search else None
        
        # Initialize query expansion service
        self.query_expansion = QueryExpansionService() if self.settings.enable_query_expansion else None
        
        logger.info("Initialized RetrievalService")
    
    def index(self) -> None:
        """Index all chunks for hybrid search (BM25)."""
        if not self.hybrid_search:
            return
        
        try:
            stored_chunks = self.store.load_all_chunks()
            if stored_chunks:
                self.hybrid_search.index_chunks(stored_chunks)
                logger.info(f"Indexed {len(stored_chunks)} chunks for hybrid search")
        except Exception as e:
            logger.error(f"Error indexing chunks for hybrid search: {e}")
    
    def _retrieve_vector_similarity(self, query: str, top_k: int) -> List[ChunkWithScore]:
        """Retrieve using vector similarity search."""
        # Embed the query
        query_embedding = self.embedding_service.embed_query(query)
        query_embedding = np.array(query_embedding).reshape(1, -1)

        # Load precomputed chunk embeddings
        stored_chunks = self.store.load_all_chunks()
        if not stored_chunks:
            logger.warning("No precomputed embeddings found.")
            return []

        # Compute cosine similarity
        chunk_embeddings = np.array([chunk.embedding for chunk in stored_chunks])
        similarities = cosine_similarity(query_embedding, chunk_embeddings)[0]

        # Sort by similarity
        sorted_indices = np.argsort(similarities)[::-1][:top_k]

        # Build results
        results = []
        for idx in sorted_indices:
            chunk = stored_chunks[idx]
            similarity_score = float(similarities[idx])
            result = ChunkWithScore(
                chunk_id=chunk.chunk_id,
                text=chunk.text,
                source=chunk.source,
                similarity_score=similarity_score,
                metadata=chunk.metadata,
            )
            results.append(result)

        return results
    
    def _retrieve_hybrid_search(self, query: str, top_k: int) -> List[ChunkWithScore]:
        """Retrieve using hybrid search (vector + BM25)."""
        # Get vector similarity scores
        query_embedding = self.embedding_service.embed_query(query)
        query_embedding = np.array(query_embedding).reshape(1, -1)

        stored_chunks = self.store.load_all_chunks()
        if not stored_chunks:
            logger.warning("No precomputed embeddings found.")
            return []
        
        # Compute vector similarities
        chunk_embeddings = np.array([chunk.embedding for chunk in stored_chunks])
        similarities = cosine_similarity(query_embedding, chunk_embeddings)[0]

        # Create similarity dict
        vector_similarities = {
            chunk.chunk_id: float(similarities[i])
            for i, chunk in enumerate(stored_chunks)
        }

        # Auto-rebuild BM25 index if stale (e.g., after server restart or new instance).
        # HybridSearchService keeps index in-memory; it is lost whenever a new
        # RetrievalService instance is created. We rebuild cheaply from already-loaded
        # stored_chunks rather than requiring a separate index() call.
        if not self.hybrid_search.embedded_chunks:
            logger.info(
                f"[hybrid] BM25 index empty — rebuilding from {len(stored_chunks)} stored chunks"
            )
            self.hybrid_search.index_chunks(stored_chunks)

        # Use hybrid search to combine vector + BM25
        results = self.hybrid_search.search(query, vector_similarities, top_k=top_k)
        logger.info(f"[hybrid] Returned {len(results)} results for query: {query[:60]!r}")
        return results

    def retrieve(self, query: str, top_k: int | None = None, use_expansion: bool = True) -> List[ChunkWithScore]:
        """
        Retrieve top-k most relevant chunks for a query.

        Supports both vector similarity and hybrid search (vector + BM25).
        Optionally applies query expansion to improve coverage.

        Args:
            query: The user query text
            top_k: Number of chunks to retrieve (default from config)
            use_expansion: Whether to apply query expansion (default True)

        Returns:
            List of ChunkWithScore objects sorted by relevance score
        """
        if top_k is None:
            top_k = self.settings.top_k

        logger.info(f"Retrieving top-{top_k} chunks for query: {query[:50]}...")

        # Apply query expansion if enabled
        queries_to_search = [query]
        if use_expansion and self.query_expansion:
            expanded_queries = self.query_expansion.expand_query(query)
            if len(expanded_queries) > 1:
                queries_to_search = expanded_queries
                logger.debug(f"Query expansion: {len(queries_to_search)} variations")

        # Retrieve results for each query
        all_results = {}  # chunk_id -> ChunkWithScore
        
        for expanded_query in queries_to_search:
            if self.hybrid_search and self.settings.enable_hybrid_search:
                results = self._retrieve_hybrid_search(expanded_query, top_k)
            else:
                results = self._retrieve_vector_similarity(expanded_query, top_k)
            
            # Accumulate results (higher scores win for duplicates)
            for result in results:
                if result.chunk_id not in all_results:
                    all_results[result.chunk_id] = result
                else:
                    # Keep the result with higher score
                    if result.similarity_score > all_results[result.chunk_id].similarity_score:
                        all_results[result.chunk_id] = result

        # Sort by score and return top-k
        sorted_results = sorted(
            all_results.values(),
            key=lambda r: r.similarity_score,
            reverse=True
        )[:top_k]

        for result in sorted_results:
            logger.debug(f"  - Chunk {result.chunk_id}: score={result.similarity_score:.4f}")

        avg_score = np.mean([r.similarity_score for r in sorted_results]) if sorted_results else 0
        logger.info(f"Retrieved {len(sorted_results)} chunks with average score {avg_score:.4f}")
        return sorted_results
