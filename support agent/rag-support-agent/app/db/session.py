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

    # Enable pgvector extension on first connection (best-effort — not available on all installs)
    @event.listens_for(Engine, "connect")
    def receive_connect(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        try:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS vector")
            dbapi_conn.commit()
        except Exception:
            dbapi_conn.rollback()
        finally:
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


def seed_default_user(engine) -> None:
    """Ensure the hardcoded MVP user exists (idempotent)."""
    from uuid import UUID as _UUID
    from sqlalchemy import text

    DEFAULT_USER_ID = _UUID("00000000-0000-0000-0000-000000000001")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        result = db.execute(
            text("SELECT 1 FROM users WHERE id = :uid"),
            {"uid": str(DEFAULT_USER_ID)},
        ).fetchone()
        if not result:
            db.execute(
                text(
                    "INSERT INTO users (id, email, display_name, preferences, created_at, updated_at) "
                    "VALUES (:uid, :email, :name, '{}'::jsonb, NOW(), NOW())"
                ),
                {
                    "uid": str(DEFAULT_USER_ID),
                    "email": "student@studymate.local",
                    "name": "Student",
                },
            )
            db.commit()
            logger.info("Default user seeded (id=00000000-0000-0000-0000-000000000001)")
    except Exception as e:
        db.rollback()
        logger.warning(f"Could not seed default user: {e}")
    finally:
        db.close()


def init_db():
    """Initialize database (create tables, skipping pgvector tables if extension unavailable)."""
    from app.db.models import Base

    engine = get_engine()
    # Try creating all tables; if vector extension is missing, skip EmbeddingChunk only
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        if "vector" in str(e).lower():
            logger.warning("pgvector extension not available — skipping embedding_chunks table, creating all other tables")
            tables_to_skip = {"embedding_chunks"}
            tables = [t for t in Base.metadata.sorted_tables if t.name not in tables_to_skip]
            Base.metadata.create_all(bind=engine, tables=tables)
            logger.info("Database tables created (excluding embedding_chunks)")
        else:
            raise

    # Seed the default MVP user so FK constraints work on first run
    seed_default_user(engine)


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
