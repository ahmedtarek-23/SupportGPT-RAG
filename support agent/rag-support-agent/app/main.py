import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.services.embedding_precompute import precompute_embeddings
from app.services.retrieval_service import RetrievalService
from app.api.routes import chat, documents, feedback, health, deadlines, notifications, planner, flashcards, analytics

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    logger.info("Starting StudyMate...")
    settings = get_settings()

    # Initialize database tables (always — pgvector tables skipped if extension unavailable)
    try:
        logger.info("Initializing database...")
        from app.db.session import init_db
        init_db()
        logger.info("✓ Database initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize database: {e}")
        logger.warning("Continuing with application startup - database may not be available")

    # Run additive schema migrations (safe to re-run on every boot)
    try:
        from app.db.migration import run_schema_migrations
        run_schema_migrations()
        logger.info("✓ Schema migrations applied")
    except Exception as e:
        logger.warning(f"Schema migration warning (non-fatal): {e}")

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
    logger.info("Shutting down StudyMate...")


# Create FastAPI app
app = FastAPI(
    title="StudyMate — AI Academic Operating System",
    description="Upload lecture PDFs and let AI extract your courses, deadlines, flashcards and study plan.",
    version="3.0.0",
    lifespan=lifespan,
)

# Add CORS middleware
settings = get_settings()
_cors_origins = (
    ["*"]
    if settings.cors_origins.strip() == "*"
    else [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(chat.router, prefix="/api", tags=["chat"])
app.include_router(documents.router, prefix="/api", tags=["documents"])
app.include_router(feedback.router, prefix="/api", tags=["feedback"])

# University Productivity Platform routes
app.include_router(deadlines.router, prefix="/api", tags=["deadlines"])
app.include_router(notifications.router, prefix="/api", tags=["notifications"])
app.include_router(planner.router, prefix="/api", tags=["planner"])
app.include_router(flashcards.router, prefix="/api", tags=["flashcards"])
app.include_router(analytics.router, prefix="/api", tags=["analytics"])


@app.get("/")
async def root():
    """Root endpoint."""
    from app.services.ollama_service import get_active_model, is_ollama_available
    return {
        "message": "StudyMate — AI Academic Operating System",
        "version": "3.0.0",
        "docs": "/docs",
        "ai_backend": "Ollama (local)",
        "ai_model": get_active_model(),
        "ollama_available": is_ollama_available(),
        "features": [
            "RAG-powered academic assistant (local LLM)",
            "Smart deadline management",
            "AI study planner",
            "Document Intelligence (auto-extract deadlines, instructor info, summaries)",
            "Notification system",
            "Flashcard generation (SM-2)",
            "Student analytics (real DB aggregation)",
            "AI insights engine",
        ],
    }


@app.get("/api/dashboard")
async def dashboard_summary():
    """Get aggregated dashboard data."""
    from app.db.session import get_session_factory
    from app.services.dashboard_service import DashboardService
    from uuid import UUID

    user_id = UUID("00000000-0000-0000-0000-000000000001")
    SessionLocal = get_session_factory()
    db = SessionLocal()
    try:
        return DashboardService.get_dashboard_summary(db, user_id)
    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
    )
