"""
Database migration and initialization script.
Use this to set up PostgreSQL with pgvector and load embeddings.
"""

import logging
import sys
from app.core.config import get_settings
from app.db.session import init_db, get_engine, get_session_factory
from app.services.embedding_precompute import precompute_embeddings
from app.services.embedding_store_factory import get_embedding_store

logger = logging.getLogger(__name__)


def run_schema_migrations():
    """
    Apply additive ALTER TABLE / CREATE TABLE migrations.

    Safe to run multiple times — each statement checks for existence first.
    Called automatically on startup from app/main.py.
    """
    engine = get_engine()
    migrations = [
        # ── documents table additions ─────────────────────────────
        """
        ALTER TABLE documents
          ADD COLUMN IF NOT EXISTS confidence_band VARCHAR(20) DEFAULT NULL
        """,
        """
        ALTER TABLE documents
          ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP DEFAULT NULL
        """,
        """
        ALTER TABLE documents
          ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}'
        """,
        # ── flashcards table additions ────────────────────────────
        """
        ALTER TABLE flashcards
          ADD COLUMN IF NOT EXISTS document_id UUID
            REFERENCES documents(id) ON DELETE SET NULL
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_flashcards_document_id
          ON flashcards(document_id)
        """,
        # ── courses table additions ───────────────────────────────
        """
        ALTER TABLE courses
          ADD COLUMN IF NOT EXISTS difficulty_score FLOAT DEFAULT NULL
        """,
        """
        ALTER TABLE courses
          ADD COLUMN IF NOT EXISTS primary_document_id UUID
            REFERENCES documents(id) ON DELETE SET NULL
        """,
        # ── document_processing_events table ─────────────────────
        """
        CREATE TABLE IF NOT EXISTS document_processing_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
          event_type VARCHAR(50) NOT NULL,
          message TEXT,
          progress_pct INTEGER DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
        )
        """,
        """
        CREATE INDEX IF NOT EXISTS ix_doc_events_document
          ON document_processing_events(document_id, created_at)
        """,
    ]

    with engine.connect() as conn:
        for sql in migrations:
            try:
                conn.execute(__import__("sqlalchemy").text(sql.strip()))
                conn.commit()
            except Exception as e:
                conn.rollback()
                logger.warning(f"Migration skipped (may already exist): {e}")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def migrate_embeddings_json_to_pgvector():
    """Migrate embeddings from JSON file to PostgreSQL pgvector."""
    logger.info("Starting migration from JSON to pgvector...")

    try:
        # Load embeddings from JSON
        from app.services.embedding_storage import JSONEmbeddingStore
        json_store = JSONEmbeddingStore()

        if not json_store.exists():
            logger.warning("No JSON embeddings found. Skipping migration.")
            return False

        json_chunks = json_store.load_all_chunks()
        logger.info(f"Loaded {len(json_chunks)} chunks from JSON")

        # Save to pgvector
        from app.services.pgvector_store import PgVectorStore
        pgvector_store = PgVectorStore()
        pgvector_store.save(json_chunks)

        logger.info(f"✓ Successfully migrated {len(json_chunks)} chunks to pgvector")
        return True

    except Exception as e:
        logger.error(f"Error during migration: {e}")
        raise


def initialize_pgvector():
    """Initialize PostgreSQL database with pgvector."""
    logger.info("Initializing PostgreSQL with pgvector...")

    try:
        settings = get_settings()

        if not settings.database_url:
            logger.error("DATABASE_URL not set. Cannot initialize pgvector.")
            return False

        # Create tables
        init_db()
        logger.info("✓ Database tables created successfully")

        # Check if we should migrate from JSON
        from app.services.embedding_storage import JSONEmbeddingStore
        json_store = JSONEmbeddingStore()

        if json_store.exists():
            logger.info("JSON embeddings found. Migrating to pgvector...")
            migrate_embeddings_json_to_pgvector()
        else:
            logger.info("No existing embeddings found. Will regenerate on next startup.")

        return True

    except Exception as e:
        logger.error(f"Error during pgvector initialization: {e}")
        raise


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Database migration and initialization")
    parser.add_argument(
        "--init-pgvector",
        action="store_true",
        help="Initialize PostgreSQL with pgvector extension and tables",
    )
    parser.add_argument(
        "--migrate-to-pgvector",
        action="store_true",
        help="Migrate embeddings from JSON to pgvector",
    )
    parser.add_argument(
        "--regenerate",
        action="store_true",
        help="Force regenerate embeddings",
    )

    args = parser.parse_args()

    try:
        if args.init_pgvector:
            initialize_pgvector()
        elif args.migrate_to_pgvector:
            migrate_embeddings_json_to_pgvector()
        elif args.regenerate:
            logger.info("Forcing embedding regeneration...")
            precompute_embeddings(force_refresh=True)
        else:
            logger.info("No action specified. Use --help for options.")

    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)
        sys.exit(1)
