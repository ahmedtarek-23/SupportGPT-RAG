"""
Background task service for asynchronous document ingestion.

Uses Celery for distributed task processing with Redis as message broker.
Supports parallel document processing and status tracking.
"""

import logging
import json
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
from celery import Celery, Task
from celery.result import AsyncResult

from app.core.config import get_settings

logger = logging.getLogger(__name__)

# Initialize Celery app
settings = get_settings()
celery_app = Celery(
    'supportgpt_rag',
    broker=settings.redis_url,
    backend=settings.redis_url,
)

# Configure Celery
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes hard limit
    task_soft_time_limit=25 * 60,  # 25 minutes soft limit
)


class BaseTask(Task):
    """Base Celery task class with custom error handling."""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Called when task fails."""
        logger.error(f"Task {task_id} failed: {exc}")
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Called when task is retried."""
        logger.warning(f"Task {task_id} retrying after: {exc}")
    
    def on_success(self, result, task_id, args, kwargs):
        """Called when task succeeds."""
        logger.info(f"Task {task_id} completed successfully")


celery_app.Task = BaseTask


class IngestionTask:
    """Wrapper for ingestion task status and management."""
    
    def __init__(self, task_id: str, file_path: str, metadata: Optional[Dict[str, Any]] = None):
        self.task_id = task_id
        self.file_path = file_path
        self.metadata = metadata or {}
        self.created_at = datetime.utcnow()
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "task_id": self.task_id,
            "file_path": self.file_path,
            "created_at": self.created_at.isoformat(),
            "metadata": self.metadata,
        }


@celery_app.task(
    name='tasks.ingest_document',
    bind=True,
    max_retries=0,  # no auto-retry — we manage state manually
)
def ingest_document_task(self, file_path: str, source_name: str = None, document_id: str = None):
    """
    Full ingestion pipeline:
      1. Parse → chunk → embed → store
      2. Extract AI metadata (course, teacher, dates, flashcards)
      3. Score confidence
      4. Auto-provision entities (HIGH) or mark pending (LOW/NONE)
      5. Persist Document record with all results

    Args:
        file_path:    Path to saved file
        source_name:  Optional display name
        document_id:  DB Document UUID (pre-created by upload route)
    """
    from app.db.session import get_session_factory
    from app.db.models import Document
    from uuid import UUID as _UUID

    SessionLocal = get_session_factory()
    db = SessionLocal()
    doc = None

    def _update_doc_status(status: str, note: str = ""):
        if doc is not None:
            doc.status = status
            if note:
                doc.error_message = note
            try:
                db.commit()
            except Exception:
                db.rollback()

    try:
        from app.services.document_parser_service import DocumentParserFactory
        from app.services.embedding_service import EmbeddingService
        from app.services.embedding_store_factory import get_embedding_store
        from app.services.ingestion_service import IngestService

        # ── Fetch the Document record ────────────────────────────────
        if document_id:
            doc = db.query(Document).filter(Document.id == _UUID(document_id)).first()
        if doc is None:
            logger.warning(f"No Document record for id={document_id}; continuing without DB updates")

        logger.info(f"Starting ingestion task for: {file_path} (doc={document_id})")
        _update_doc_status("processing")
        self.update_state(state='PROCESSING', meta={'current': 'Parsing document…', 'document_id': document_id})

        # ── 1. Parse ────────────────────────────────────────────────
        content, doc_metadata = DocumentParserFactory.parse(file_path)
        source = source_name or doc_metadata.filename
        logger.info(
            f"Parsed {doc_metadata.filename}: "
            f"text_length={len(content)} chars, words={doc_metadata.num_words}"
        )
        if not content or len(content.strip()) < 50:
            logger.error(
                f"Extracted text is too short ({len(content)} chars) — "
                "document may be image-based or corrupted"
            )

        # ── 2. Chunk ────────────────────────────────────────────────
        self.update_state(state='PROCESSING', meta={'current': 'Chunking…', 'document_id': document_id})
        chunks = IngestService().chunk_text(content, source=source)
        logger.info(f"Created {len(chunks)} chunks from {doc_metadata.filename}")

        # ── 3. Embed (batch — single model call for all chunks) ─────
        self.update_state(state='PROCESSING', meta={'current': f'Embedding {len(chunks)} chunks…', 'document_id': document_id})
        embedding_service = EmbeddingService()
        embedded_chunks = embedding_service.generate_embeddings(chunks)

        # ── 4. Store embeddings ─────────────────────────────────────
        self.update_state(state='PROCESSING', meta={'current': 'Storing embeddings…', 'document_id': document_id})
        store = get_embedding_store()
        store.save(embedded_chunks)

        if get_settings().enable_hybrid_search:
            try:
                from app.services.retrieval_service import RetrievalService
                RetrievalService().index()
            except Exception as e:
                logger.warning(f"Hybrid search reindex failed: {e}")

        # ── 5. Persist chunk count + mark COMPLETED immediately ──────
        # The document is searchable as soon as embeddings are stored.
        # Mark completed now so the UI unblocks; LLM enrichment follows.
        if doc is not None:
            try:
                doc.num_chunks = len(embedded_chunks)
                doc.ingested_at = datetime.utcnow()
                db.commit()
            except Exception as e:
                logger.warning(f"Failed to persist num_chunks/ingested_at: {e}")
                db.rollback()

        _update_doc_status("completed")
        logger.info(f"Document {document_id} marked completed — starting LLM enrichment")

        # ── 6. AI Metadata Extraction (post-completion enrichment) ───
        extraction = {}
        confidence = {"overall": "NONE", "overall_score": 0.0, "scores": {}, "review_fields": []}
        try:
            self.update_state(state='PROCESSING', meta={'current': 'Extracting intelligence…', 'document_id': document_id})
            from app.services.document_metadata_extractor_service import (
                DocumentMetadataExtractor, apply_extraction_to_document,
            )
            extractor = DocumentMetadataExtractor()
            extraction = extractor.extract(content)
            logger.info(f"Metadata extracted for {doc_metadata.filename}: "
                        f"course={extraction.get('course_title')}, "
                        f"dates={len(extraction.get('important_dates', []))}")
        except Exception as e:
            logger.warning(f"Metadata extraction failed (non-fatal): {e}")

        # ── 7. Confidence Scoring ────────────────────────────────────
        try:
            if extraction:
                from app.services.confidence_scorer import ConfidenceScorer
                confidence = ConfidenceScorer().score_extraction(extraction)
                logger.info(f"Confidence band: {confidence['overall']} ({confidence['overall_score']:.2f})")
        except Exception as e:
            logger.warning(f"Confidence scoring failed (non-fatal): {e}")

        # ── 8. Persist extraction onto the Document record ───────────
        if doc is not None and extraction:
            try:
                apply_extraction_to_document(db, doc, extraction)
                doc.confidence_band = confidence.get("overall", "NONE")
                db.commit()
                db.refresh(doc)
            except Exception as e:
                logger.warning(f"Failed to persist extraction: {e}")
                db.rollback()

        # ── 9. Generate rich academic summary ────────────────────────
        if doc is not None and content:
            try:
                from app.services.summary_service import SummaryService
                rich_summary = SummaryService().generate_document_summary(content)
                if rich_summary:
                    doc.extracted_summary = rich_summary
                    db.commit()
                    logger.info(
                        f"Rich summary generated for {doc_metadata.filename}: "
                        f"{len(rich_summary)} chars"
                    )
                else:
                    logger.warning("SummaryService returned empty — keeping extractor summary")
            except Exception as e:
                logger.warning(f"Rich summary generation failed (non-fatal): {e}")

        # ── 10. Entity Provisioning ──────────────────────────────────
        provisioned_course_id = None
        try:
            if doc is not None and extraction and confidence.get("overall") == "HIGH":
                from app.services.entity_provisioner_service import EntityProvisioner
                from app.db.models import User
                user = db.query(User).filter(User.id == doc.user_id).first()
                if user:
                    result_p = EntityProvisioner().provision(db, doc, extraction, confidence, doc.user_id)
                    provisioned_course_id = result_p.course_id
                    logger.info(f"Auto-provisioned: course={result_p.course_id}, "
                                f"deadlines={result_p.deadlines_created}, "
                                f"flashcards={result_p.flashcards_created}")
        except Exception as e:
            logger.warning(f"Entity provisioning failed (non-fatal): {e}")

        result = {
            'task_id': self.request.id,
            'document_id': document_id,
            'filename': doc_metadata.filename,
            'document_type': doc_metadata.document_type.value if doc_metadata.document_type else 'unknown',
            'num_chunks': len(embedded_chunks),
            'num_words': doc_metadata.num_words,
            'source': source,
            'confidence_band': confidence.get('overall', 'NONE'),
            'extracted_title': extraction.get('course_title') or (extraction.get('summary') or '')[:60],
            'course_id': provisioned_course_id,
            'status': 'completed',
            'completed_at': datetime.utcnow().isoformat(),
        }
        logger.info(f"Ingestion complete for: {doc_metadata.filename}")
        return result

    except Exception as e:
        logger.error(f"Ingestion task failed: {e}", exc_info=True)
        _update_doc_status("failed", str(e))
        self.update_state(state='FAILURE', meta={'error': str(e), 'document_id': document_id})
        raise
    finally:
        db.close()


@celery_app.task(name='tasks.ingest_batch')
def ingest_batch_task(file_paths: list, source_prefix: str = None):
    """
    Async task for ingesting multiple documents.
    
    Args:
        file_paths: List of file paths
        source_prefix: Optional prefix for source names
        
    Returns:
        List of task IDs
    """
    task_ids = []
    
    for file_path in file_paths:
        source_name = None
        if source_prefix:
            from pathlib import Path
            filename = Path(file_path).name
            source_name = f"{source_prefix}/{filename}"
        
        task = ingest_document_task.delay(file_path, source_name)
        task_ids.append(task.id)
        logger.info(f"Queued ingestion task: {task.id} for {file_path}")
    
    return task_ids


def _run_ingestion_sync(file_path: str, source_name: str, document_id: str) -> None:
    """Run the full ingestion pipeline synchronously (used when Celery/Redis is unavailable)."""
    from datetime import datetime as _dt
    from app.db.session import get_session_factory
    from app.db.models import Document
    from uuid import UUID as _UUID

    SessionLocal = get_session_factory()
    db = SessionLocal()
    doc = None

    def _set_status(status: str, note: str = ""):
        if doc is not None:
            doc.status = status
            if note:
                doc.error_message = note
            try:
                db.commit()
            except Exception:
                db.rollback()

    try:
        from app.services.document_parser_service import DocumentParserFactory
        from app.services.embedding_service import EmbeddingService
        from app.services.embedding_store_factory import get_embedding_store
        from app.services.ingestion_service import IngestService
        from app.schemas.chunk import EmbeddedChunk

        if document_id:
            doc = db.query(Document).filter(Document.id == _UUID(document_id)).first()

        logger.info(f"[sync] Starting ingestion for: {file_path} (doc={document_id})")
        _set_status("processing")

        content, doc_metadata = DocumentParserFactory.parse(file_path)
        source = source_name or doc_metadata.filename
        logger.info(
            f"[sync] Parsed {doc_metadata.filename}: "
            f"text_length={len(content)} chars, words={doc_metadata.num_words}"
        )
        if not content or len(content.strip()) < 50:
            logger.error(
                f"[sync] Extracted text too short ({len(content)} chars) — "
                "document may be image-based or corrupted"
            )

        chunks = IngestService().chunk_text(content, source=source)
        logger.info(f"[sync] Created {len(chunks)} chunks")

        # Batch embed all chunks in one model call — ~10× faster than per-chunk loop
        embedding_service = EmbeddingService()
        embedded_chunks = embedding_service.generate_embeddings(chunks)

        store = get_embedding_store()
        store.save(embedded_chunks)

        if get_settings().enable_hybrid_search:
            try:
                from app.services.retrieval_service import RetrievalService
                RetrievalService().index()
            except Exception as e:
                logger.warning(f"[sync] Hybrid search reindex failed: {e}")

        # ── Persist chunk count + mark COMPLETED immediately ────────
        # Document is searchable now. Mark completed so UI unblocks;
        # LLM enrichment continues in the background thread.
        if doc is not None:
            doc.num_chunks = len(embedded_chunks)
            doc.ingested_at = _dt.utcnow()
            try:
                db.commit()
            except Exception:
                db.rollback()

        _set_status("completed")
        logger.info(f"[sync] Document {document_id} marked completed — starting LLM enrichment")

        # ── AI Metadata Extraction (post-completion enrichment) ─────
        extraction = {}
        confidence = {"overall": "NONE", "overall_score": 0.0}
        try:
            from app.services.document_metadata_extractor_service import (
                DocumentMetadataExtractor, apply_extraction_to_document,
            )
            extraction = DocumentMetadataExtractor().extract(content)
        except Exception as e:
            logger.warning(f"[sync] Metadata extraction failed (non-fatal): {e}")

        try:
            if extraction:
                from app.services.confidence_scorer import ConfidenceScorer
                confidence = ConfidenceScorer().score_extraction(extraction)
        except Exception as e:
            logger.warning(f"[sync] Confidence scoring failed (non-fatal): {e}")

        if doc is not None and extraction:
            try:
                apply_extraction_to_document(db, doc, extraction)
                doc.confidence_band = confidence.get("overall", "NONE")
                db.commit()
            except Exception as e:
                logger.warning(f"[sync] Failed to persist extraction: {e}")
                db.rollback()

        # Generate rich academic summary
        if doc is not None and content:
            try:
                from app.services.summary_service import SummaryService
                rich_summary = SummaryService().generate_document_summary(content)
                if rich_summary:
                    doc.extracted_summary = rich_summary
                    db.commit()
                    logger.info(
                        f"[sync] Rich summary generated: {len(rich_summary)} chars"
                    )
                else:
                    logger.warning("[sync] SummaryService returned empty summary")
            except Exception as e:
                logger.warning(f"[sync] Rich summary generation failed (non-fatal): {e}")

        try:
            if doc is not None and extraction and confidence.get("overall") == "HIGH":
                from app.services.entity_provisioner_service import EntityProvisioner
                from app.db.models import User
                user = db.query(User).filter(User.id == doc.user_id).first()
                if user:
                    EntityProvisioner().provision(db, doc, extraction, confidence, doc.user_id)
        except Exception as e:
            logger.warning(f"[sync] Entity provisioning failed (non-fatal): {e}")

        logger.info(f"[sync] LLM enrichment complete for: {doc_metadata.filename}")

    except Exception as e:
        logger.error(f"[sync] Ingestion failed: {e}", exc_info=True)
        _set_status("failed", str(e))
    finally:
        db.close()


class TaskManager:
    """Manager for Celery task operations and monitoring."""

    # In-process task registry when running without Celery
    _local_tasks: dict = {}

    @staticmethod
    def submit_ingestion(file_path: str, source_name: str = None, document_id: str = None) -> str:
        """
        Submit a document for async ingestion.

        Tries Celery first; falls back to a background thread when Redis is
        unavailable (local / no-Redis dev mode).

        Returns:
            Task ID for status tracking
        """
        # Try Celery — it will raise immediately if Redis is down
        try:
            task = ingest_document_task.apply_async(
                args=[file_path, source_name, document_id],
                connect_timeout=2,
            )
            logger.info(f"Submitted Celery task: {task.id} for document={document_id}")
            return task.id
        except Exception as celery_err:
            logger.warning(
                f"Celery unavailable ({celery_err.__class__.__name__}: {celery_err}). "
                "Falling back to in-process background thread."
            )

        # Fallback: run ingestion in a daemon thread
        import threading
        task_id = str(uuid.uuid4())
        TaskManager._local_tasks[task_id] = {"state": "PROCESSING", "document_id": document_id}

        def _run():
            try:
                _run_ingestion_sync(file_path, source_name or "", document_id or "")
                TaskManager._local_tasks[task_id]["state"] = "SUCCESS"
            except Exception as e:
                TaskManager._local_tasks[task_id]["state"] = "FAILURE"
                TaskManager._local_tasks[task_id]["error"] = str(e)

        t = threading.Thread(target=_run, daemon=True)
        t.start()
        logger.info(f"Started in-process ingestion thread: {task_id} for document={document_id}")
        return task_id
    
    @staticmethod
    def submit_batch(file_paths: list, source_prefix: str = None) -> list:
        """
        Submit multiple documents for async ingestion.
        
        Args:
            file_paths: List of file paths
            source_prefix: Optional prefix for source names
            
        Returns:
            List of task IDs
        """
        task = ingest_batch_task.delay(file_paths, source_prefix)
        # The batch task itself returns task IDs
        return [task.id]  # Return the batch task ID
    
    @staticmethod
    def get_task_status(task_id: str) -> dict:
        """
        Get status of an ingestion task.
        Checks the local thread registry first, then Celery.
        """
        # Local (no-Redis) task
        local = TaskManager._local_tasks.get(task_id)
        if local is not None:
            return {
                'task_id': task_id,
                'state': local.get('state', 'PROCESSING'),
                'progress': None,
                'result': {'document_id': local.get('document_id')} if local.get('state') == 'SUCCESS' else None,
                'error': local.get('error'),
            }

        # Celery task
        try:
            result = AsyncResult(task_id, app=celery_app)
            return {
                'task_id': task_id,
                'state': result.state,
                'progress': result.info if result.state == 'PROCESSING' else None,
                'result': result.result if result.state == 'SUCCESS' else None,
                'error': str(result.info) if result.state == 'FAILURE' else None,
            }
        except Exception:
            return {
                'task_id': task_id,
                'state': 'UNKNOWN',
                'progress': None,
                'result': None,
                'error': None,
            }
    
    @staticmethod
    def cancel_task(task_id: str) -> bool:
        """
        Cancel a pending or running task.
        
        Args:
            task_id: Task ID to cancel
            
        Returns:
            True if cancelled, False if task not found
        """
        result = AsyncResult(task_id, app=celery_app)
        if result.state not in ('SUCCESS', 'FAILURE'):
            result.revoke(terminate=True)
            logger.info(f"Cancelled task: {task_id}")
            return True
        return False
    
    @staticmethod
    def wait_for_completion(task_id: str, timeout: int = 600) -> dict:
        """
        Wait for task completion (blocking).
        
        Args:
            task_id: Task ID to wait for
            timeout: Timeout in seconds (default 10 minutes)
            
        Returns:
            Task result if completed, raises exception on timeout
        """
        result = AsyncResult(task_id, app=celery_app)
        return result.get(timeout=timeout)
