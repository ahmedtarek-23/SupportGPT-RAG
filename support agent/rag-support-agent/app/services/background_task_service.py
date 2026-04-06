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
    autoretry_for=(Exception,),
    retry_kwargs={'max_retries': 3, 'countdown': 5},
)
def ingest_document_task(self, file_path: str, source_name: str = None):
    """
    Async task for ingesting a document.
    
    Args:
        file_path: Path to document
        source_name: Optional custom source name
        
    Returns:
        Dict with ingestion results
    """
    try:
        from app.services.document_parser_service import DocumentParserFactory
        from app.services.embedding_service import EmbeddingService
        from app.services.embedding_store_factory import get_embedding_store
        from app.services.ingestion_service import IngestService
        
        logger.info(f"Starting ingestion task for: {file_path}")
        self.update_state(state='PROCESSING', meta={'current': 'Parsing document...'})
        
        # Parse document
        content, doc_metadata = DocumentParserFactory.parse(file_path)
        
        # Use provided source or extracted filename
        source = source_name or doc_metadata.filename
        
        # Chunk document
        self.update_state(state='PROCESSING', meta={'current': 'Chunking document...'})
        chunk_service = IngestService()
        chunks = chunk_service.chunk_text(content, source=source)
        
        logger.info(f"Created {len(chunks)} chunks from {doc_metadata.filename}")
        
        # Generate embeddings
        self.update_state(state='PROCESSING', meta={'current': f'Generating {len(chunks)} embeddings...'})
        embedding_service = EmbeddingService()
        embedded_chunks = []
        
        for i, chunk in enumerate(chunks):
            if i % 10 == 0:
                self.update_state(
                    state='PROCESSING',
                    meta={'current': f'Embedding chunk {i+1}/{len(chunks)}...'}
                )
            
            # Generate embedding for chunk
            embedding = embedding_service.generate_embedding(chunk.text)
            
            # Create embedded chunk
            from app.schemas.chunk import EmbeddedChunk
            embedded_chunk = EmbeddedChunk(
                chunk_id=chunk.id,
                text=chunk.text,
                source=chunk.source,
                embedding=embedding,
                metadata={
                    **chunk.metadata,
                    'document_metadata': doc_metadata.to_dict(),
                    'ingestion_task_id': self.request.id,
                }
            )
            embedded_chunks.append(embedded_chunk)
        
        # Store embeddings
        self.update_state(state='PROCESSING', meta={'current': 'Storing embeddings...'})
        store = get_embedding_store()
        store.save(embedded_chunks)
        
        # Reindex hybrid search if enabled
        settings = get_settings()
        if settings.enable_hybrid_search:
            from app.services.retrieval_service import RetrievalService
            try:
                retrieval = RetrievalService()
                retrieval.index()
                logger.info("Reindexed hybrid search after document ingestion")
            except Exception as e:
                logger.warning(f"Failed to reindex hybrid search: {e}")
        
        result = {
            'task_id': self.request.id,
            'filename': doc_metadata.filename,
            'document_type': doc_metadata.document_type.value,
            'num_chunks': len(embedded_chunks),
            'num_words': doc_metadata.num_words,
            'source': source,
            'status': 'completed',
            'completed_at': datetime.utcnow().isoformat(),
        }
        
        logger.info(f"Completed ingestion for: {doc_metadata.filename}")
        return result
        
    except Exception as e:
        logger.error(f"Error during document ingestion: {e}", exc_info=True)
        self.update_state(state='FAILURE', meta={'error': str(e)})
        raise


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


class TaskManager:
    """Manager for Celery task operations and monitoring."""
    
    @staticmethod
    def submit_ingestion(file_path: str, source_name: str = None) -> str:
        """
        Submit a document for async ingestion.
        
        Args:
            file_path: Path to document
            source_name: Optional custom source name
            
        Returns:
            Task ID for status tracking
        """
        task = ingest_document_task.delay(file_path, source_name)
        logger.info(f"Submitted ingestion task: {task.id}")
        return task.id
    
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
        
        Args:
            task_id: Task ID from submission
            
        Returns:
            Dict with task status and metadata
        """
        result = AsyncResult(task_id, app=celery_app)
        
        return {
            'task_id': task_id,
            'state': result.state,
            'progress': result.info if result.state == 'PROCESSING' else None,
            'result': result.result if result.state == 'SUCCESS' else None,
            'error': str(result.info) if result.state == 'FAILURE' else None,
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
