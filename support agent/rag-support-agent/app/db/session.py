from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.engine import Engine
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# ── Module-level singleton ────────────────────────────────────────────────────
# Engine is created once; the event listener is registered once on the instance.
# Previously, get_engine() created a new engine AND re-registered the listener
# on the Engine CLASS every call — causing listener accumulation and multi-second
# latency per request.
_engine = None
_session_factory = None


def get_engine():
    """Return (or create) the module-level database engine singleton."""
    global _engine
    if _engine is not None:
        return _engine

    settings = get_settings()
    if not settings.database_url:
        raise ValueError("DATABASE_URL not set in environment variables")

    _engine = create_engine(
        settings.database_url,
        echo=settings.debug,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
    )

    # Register the pgvector extension handler ONCE on this specific engine instance.
    # Using listen() on the instance (not the class) ensures it runs exactly once
    # per connection, regardless of how many times get_engine() is called.
    @event.listens_for(_engine, "connect")
    def _enable_pgvector(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        try:
            cursor.execute("CREATE EXTENSION IF NOT EXISTS vector")
            dbapi_conn.commit()
        except Exception:
            dbapi_conn.rollback()
        finally:
            cursor.close()

    logger.info(f"Database engine created: {settings.database_url}")
    return _engine


def get_session_factory():
    """Return (or create) the module-level session factory singleton."""
    global _session_factory
    if _session_factory is None:
        _session_factory = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return _session_factory


def seed_default_user(engine) -> None:
    """Ensure the hardcoded MVP user exists (idempotent)."""
    from uuid import UUID as _UUID

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
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        if "vector" in str(e).lower():
            logger.warning("pgvector extension not available — skipping embedding_chunks table")
            tables_to_skip = {"embedding_chunks"}
            tables = [t for t in Base.metadata.sorted_tables if t.name not in tables_to_skip]
            Base.metadata.create_all(bind=engine, tables=tables)
            logger.info("Database tables created (excluding embedding_chunks)")
        else:
            raise

    seed_default_user(engine)


def get_db():
    """FastAPI dependency — yields a database session."""
    db = get_session_factory()()
    try:
        yield db
    finally:
        db.close()
