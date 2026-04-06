import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.services.embedding_precompute import precompute_embeddings
from app.services.retrieval_service import RetrievalService
from app.api.routes import chat, documents, feedback, health

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    logger.info("Starting SupportGPT-RAG application...")
    settings = get_settings()

    # Initialize database if using pgvector
    if settings.embedding_store_type.lower() == "pgvector":
        try:
            logger.info("Initializing pgvector database...")
            from app.db.session import init_db
            init_db()
            logger.info("✓ Database initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            logger.warning("Continuing with application startup - database may not be available")

    if settings.precompute_on_startup:
        try:
            was_computed = precompute_embeddings()
            if was_computed:
                logger.info("✓ Embeddings precomputed successfully")
            else:
                logger.info("✓ Using existing precomputed embeddings")
        except Exception as e:
            logger.error(f"Failed to precompute embeddings: {e}")
            logger.warning("Continuing with application startup - embeddings may not be available")

    # Initialize hybrid search index (Phase 4)
    if settings.enable_hybrid_search:
        try:
            logger.info("Initializing hybrid search index...")
            retrieval_service = RetrievalService()
            retrieval_service.index()
            logger.info("✓ Hybrid search index initialized successfully")
        except Exception as e:
            logger.warning(f"Failed to initialize hybrid search index: {e}")
            logger.warning("Continuing with application startup - hybrid search may not be available")

    logger.info("Application startup complete")

    yield

    # Shutdown
    logger.info("Shutting down SupportGPT-RAG application...")


# Create FastAPI app
app = FastAPI(
    title="SupportGPT-RAG",
    description="AI-powered customer support agent with RAG",
    version="0.1.0",
    lifespan=lifespan,
)

# Add CORS middleware
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(documents.router, prefix="/api", tags=["documents"])
app.include_router(feedback.router, prefix="/api", tags=["feedback"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "SupportGPT-RAG API",
        "version": "0.1.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
