from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    # ── Local AI (Ollama) ────────────────────────────────────────
    # Primary AI backend. Run Ollama locally: https://ollama.ai
    # Pull model: `ollama pull llama3` or `ollama pull mistral`
    ollama_base_url: str = "http://localhost:11434/v1"
    ollama_model: str = "llama3"                     # or "mistral", "phi3"
    use_local_ai: bool = True                         # Use Ollama instead of OpenAI

    # ── OpenAI (optional, used only if use_local_ai=False) ───────
    openai_api_key: str = "ollama"                   # Dummy key when using Ollama
    embedding_model: str = "all-MiniLM-L6-v2"        # sentence-transformers model
    embedding_dimensions: int = 384                   # Dimensions for local embeddings
    chat_model: str = "llama3"                        # Overridden by ollama_model when use_local_ai=True

    # Chunking Configuration
    chunk_size: int = 500  # tokens
    chunk_overlap: int = 100  # tokens

    # Retrieval Configuration
    top_k: int = 3

    # Storage Configuration
    embedding_storage_path: str = ".cache/embeddings.json"
    embedding_store_type: str = "json"  # json or pgvector
    database_url: Optional[str] = None  # PostgreSQL connection string
    faq_file_path: str = "app/data/faq.txt"

    # Redis Configuration
    redis_url: str = "redis://localhost:6379/0"
    enable_caching: bool = True
    cache_ttl_seconds: int = 3600  # 1 hour default
    enable_session_memory: bool = True
    session_ttl_seconds: int = 86400  # 24 hours default

    # Hybrid Search Configuration (Phase 4)
    enable_hybrid_search: bool = True
    hybrid_vector_weight: float = 0.7  # Weight for vector similarity (0-1)
    hybrid_keyword_weight: float = 0.3  # Weight for BM25 keyword matching (0-1)
    hybrid_normalize_scores: bool = True  # Normalize scores before combining

    # Reranking Configuration (Phase 4)
    enable_reranking: bool = True
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"  # Cross-encoder model
    reranker_batch_size: int = 32
    reranker_top_k: int = 3  # Keep top-k after reranking

    # Query Expansion Configuration (Phase 4)
    enable_query_expansion: bool = True
    query_expansion_synonyms: bool = True  # Expand with synonyms
    query_expansion_rewriting: bool = True  # Rewrite queries (e.g., "How to X" -> "X")
    query_expansion_decomposition: bool = True  # Break complex queries into sub-queries
    query_expansion_max_expansions: int = 5  # Max query variations to generate

    # Document Upload & Async Ingestion (Phase 5)
    enable_async_ingestion: bool = True
    document_upload_dir: str = ".uploads"  # Directory for temporary uploaded files
    max_document_size_mb: int = 100  # Max file size in MB
    celery_broker_url: str = "redis://localhost:6379/1"  # Redis DB 1 for Celery
    celery_result_backend_url: str = "redis://localhost:6379/1"
    ingestion_task_timeout_seconds: int = 1800  # 30 minutes
    enable_document_cleanup: bool = True  # Auto-cleanup uploaded files after ingestion

    # Advanced Conversation Features (Phase 6)
    enable_context_summarization: bool = True  # Summarize multi-turn conversations
    enable_clarifications: bool = True  # Ask clarifying questions for ambiguous queries
    enable_confidence_scoring: bool = True  # Score answer confidence with explanations
    clarification_ambiguity_threshold: float = 0.6  # Threshold to trigger clarifications
    context_summarization_threshold: int = 10  # Number of messages before summarizing
    confidence_high_threshold: float = 0.75  # Score threshold for high confidence
    confidence_medium_threshold: float = 0.50  # Score threshold for medium confidence
    confidence_low_threshold: float = 0.30  # Score threshold for low confidence

    # University Platform Features (Phase 8+)
    enable_deadline_reminders: bool = True
    default_reminder_hours: str = "48,24,2"  # Comma-separated hours before deadline
    enable_study_planner: bool = True
    study_planner_model: str = "llama3"       # Uses Ollama model
    max_study_hours_per_day: int = 8
    enable_flashcard_generation: bool = True
    flashcard_generation_model: str = "llama3"
    max_flashcards_per_request: int = 50

    # CORS
    cors_origins: str = "*"  # Comma-separated list of allowed origins, or "*" for all

    # Application Settings
    precompute_on_startup: bool = True
    debug: bool = False

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
