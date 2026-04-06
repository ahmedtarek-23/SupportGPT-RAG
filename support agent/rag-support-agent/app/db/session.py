from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)


def get_engine():
    """Create database engine."""
    settings = get_settings()

    if not settings.database_url:
        raise ValueError("DATABASE_URL not set in environment variables")

    # Create engine with connection pooling
    engine = create_engine(
        settings.database_url,
        echo=settings.debug,
        pool_pre_ping=True,  # Verify connections before using
        pool_size=10,
        max_overflow=20,
    )

    # Enable pgvector extension on first connection
    @event.listens_for(Engine, "connect")
    def receive_connect(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("CREATE EXTENSION IF NOT EXISTS vector")
        dbapi_conn.commit()
        cursor.close()

    logger.info(f"Database engine created: {settings.database_url}")
    return engine


def get_session_factory():
    """Create session factory."""
    engine = get_engine()
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal


# Global session factory
SessionLocal = None


def init_db():
    """Initialize database (create tables)."""
    from app.db.models import Base

    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables created successfully")


def get_db():
    """Dependency for FastAPI to get database session."""
    global SessionLocal
    if SessionLocal is None:
        SessionLocal = get_session_factory()

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
