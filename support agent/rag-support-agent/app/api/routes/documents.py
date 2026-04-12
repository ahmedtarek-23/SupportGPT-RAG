import logging
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional, List
from uuid import UUID
from fastapi import APIRouter, File, UploadFile, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.services.background_task_service import TaskManager
from app.services.document_parser_service import DocumentParserFactory
from app.services.summary_service import SummaryService
from app.core.config import get_settings
from app.db.session import get_db

logger = logging.getLogger(__name__)
router = APIRouter()

DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001")

# Get settings
settings = get_settings()

# Create upload directory if it doesn't exist
UPLOAD_DIR = Path(settings.document_upload_dir)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class UploadResponse(BaseModel):
    """Response for document upload."""
    task_id: str
    document_id: str
    filename: str
    file_size: int
    message: str


class TaskStatusResponse(BaseModel):
    """Response for task status."""
    task_id: str
    state: str
    progress: Optional[dict] = None
    result: Optional[dict] = None
    error: Optional[str] = None


class DocumentMetadata(BaseModel):
    """Metadata for ingested documents."""
    task_id: str
    filename: str
    document_type: str
    num_chunks: int
    num_words: int
    source: str
    status: str
    completed_at: Optional[str] = None


@router.post("/documents/upload", response_model=UploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    source_name: Optional[str] = Query(None, description="Optional custom source name"),
    db=Depends(get_db),
):
    """
    Upload a document for asynchronous ingestion.
    Immediately creates a DB record (status=pending), then submits the
    Celery task. Returns document_id so the frontend can poll by document.

    Supports: PDF, DOCX, TXT
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_ext = Path(file.filename).suffix.lower()
    if not DocumentParserFactory.supports(f"test{file_ext}"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. Supported: .pdf, .docx, .txt",
        )

    try:
        contents = await file.read()
        file_size = len(contents)

        # Validate size (backend limit: 100 MB)
        max_bytes = settings.max_document_size_mb * 1024 * 1024
        if file_size > max_bytes:
            raise HTTPException(
                status_code=413,
                detail=f"File too large ({file_size // (1024*1024)} MB). Max {settings.max_document_size_mb} MB.",
            )

        # Save file to disk
        import uuid as _uuid
        safe_name = f"{_uuid.uuid4().hex}_{file.filename}"
        file_path = UPLOAD_DIR / safe_name
        file_path.write_bytes(contents)
        logger.info(f"Saved uploaded file: {file.filename} ({file_size} bytes) → {safe_name}")

        # Create Document DB record immediately (status=pending)
        from app.db.models import Document
        doc = Document(
            user_id=DEFAULT_USER_ID,
            filename=safe_name,
            original_filename=file.filename,
            document_type=file_ext.lstrip("."),
            file_size_bytes=file_size,
            file_path=str(file_path),
            status="pending",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
        document_id = str(doc.id)
        logger.info(f"Created Document record {document_id} for {file.filename}")

        # Submit Celery task, passing document_id so the worker can update the record
        task_id = TaskManager.submit_ingestion(
            str(file_path),
            source_name=source_name or file.filename,
            document_id=document_id,
        )

        return UploadResponse(
            task_id=task_id,
            document_id=document_id,
            filename=file.filename,
            file_size=file_size,
            message="File saved. Extracting intelligence in the background…",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/documents/upload/{task_id}", response_model=TaskStatusResponse)
async def get_upload_status(task_id: str):
    """
    Get the status of a document ingestion task.
    
    States: PENDING, STARTED, PROCESSING, SUCCESS, FAILURE
    """
    status = TaskManager.get_task_status(task_id)
    
    # Ensure document_id bubbles up to the top-level result for easy frontend access
    result = status.get('result')
    if isinstance(result, dict) and 'document_id' not in result and status.get('state') == 'SUCCESS':
        result = result  # document_id already set inside task result by the worker

    return TaskStatusResponse(
        task_id=status['task_id'],
        state=status['state'],
        progress=status['progress'],
        result=result,
        error=status['error'],
    )


@router.post("/documents/batch-upload")
async def batch_upload_documents(
    files: List[UploadFile] = File(...),
    source_prefix: Optional[str] = Query(None, description="Optional prefix for source names")
):
    """
    Upload multiple documents for asynchronous batch ingestion.
    
    Returns: Batch task ID for tracking
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    
    try:
        file_paths = []
        
        # Save and collect all file paths
        for file in files:
            if not file.filename:
                continue
            
            # Validate file extension
            file_ext = Path(file.filename).suffix.lower()
            if not DocumentParserFactory.supports(f"test{file_ext}"):
                logger.warning(f"Skipping unsupported file: {file.filename}")
                continue
            
            # Save file
            file_path = UPLOAD_DIR / file.filename
            contents = await file.read()
            
            with open(file_path, 'wb') as f:
                f.write(contents)
            
            file_paths.append(str(file_path))
            logger.info(f"Saved batch file: {file.filename}")
        
        if not file_paths:
            raise HTTPException(status_code=400, detail="No valid files to process")
        
        # Submit batch ingestion task
        task_ids = TaskManager.submit_batch(file_paths, source_prefix=source_prefix)
        
        return {
            "task_ids": task_ids,
            "num_files": len(file_paths),
            "message": "Batch files submitted for ingestion."
        }
        
    except Exception as e:
        logger.error(f"Error in batch upload: {e}")
        raise HTTPException(status_code=500, detail=f"Batch upload failed: {str(e)}")


@router.delete("/documents/upload/{task_id}")
async def cancel_ingestion(task_id: str):
    """
    Cancel an ongoing ingestion task.
    
    Only cancels PENDING or STARTED tasks.
    """
    cancelled = TaskManager.cancel_task(task_id)
    
    return {
        "task_id": task_id,
        "cancelled": cancelled,
        "message": "Task cancelled successfully" if cancelled else "Task not found or already completed"
    }


@router.get("/documents")
async def list_documents(
    skip: int = 0,
    limit: int = 20,
    db=Depends(get_db),
):
    """List all documents tracked in the database."""
    from app.db.models import Document
    docs = db.query(Document).filter(
        Document.user_id == DEFAULT_USER_ID,
    ).order_by(Document.created_at.desc()).offset(skip).limit(limit).all()

    total = db.query(Document).filter(Document.user_id == DEFAULT_USER_ID).count()

    return {
        "documents": [
            {
                "id": str(d.id),
                "filename": d.original_filename,
                "document_type": d.document_type,
                "status": d.status,
                "course_id": str(d.course_id) if d.course_id else None,
                "extracted_title": d.extracted_title,
                "extracted_summary": d.extracted_summary,
                "num_chunks": d.num_chunks,
                "created_at": d.created_at.isoformat(),
                "ingested_at": d.ingested_at.isoformat() if d.ingested_at else None,
            }
            for d in docs
        ],
        "total": total,
        "skip": skip,
        "limit": limit,
    }


@router.get("/documents/by-course/{course_id}")
async def list_documents_by_course(course_id: UUID, db=Depends(get_db)):
    """
    List all documents linked to a specific course.

    Returns document metadata + extracted intelligence summary.
    """
    from app.db.models import Document
    docs = db.query(Document).filter(
        Document.course_id == course_id,
    ).order_by(Document.created_at.desc()).all()

    return {
        "course_id": str(course_id),
        "documents": [
            {
                "id": str(d.id),
                "filename": d.original_filename,
                "document_type": d.document_type,
                "status": d.status,
                "extracted_title": d.extracted_title,
                "extracted_summary": d.extracted_summary,
                "extracted_instructor_name": d.extracted_instructor_name,
                "extracted_instructor_email": d.extracted_instructor_email,
                "extracted_office_hours": d.extracted_office_hours or [],
                "extracted_dates_count": len(d.extracted_dates or []),
                "extracted_assignments_count": len(d.extracted_assignments or []),
                "extracted_flashcard_count": d.extracted_flashcard_count or 0,
                "num_chunks": d.num_chunks,
                "created_at": d.created_at.isoformat(),
                "ingested_at": d.ingested_at.isoformat() if d.ingested_at else None,
            }
            for d in docs
        ],
        "total": len(docs),
    }


@router.get("/documents/summary/{document_id}")
async def get_document_summary(document_id: UUID, db=Depends(get_db)):
    """
    Full document summary with all extracted intelligence.

    Includes: document metadata, instructor info, important dates,
    assignments, flashcard candidates count, and linked course context.
    """
    result = SummaryService.get_document_summary_response(db, document_id)
    if not result:
        raise HTTPException(status_code=404, detail="Document not found")
    return result


@router.get("/documents/stats")
async def get_upload_stats():
    """Get statistics about uploaded documents."""
    try:
        if UPLOAD_DIR.exists():
            uploaded_files = list(UPLOAD_DIR.glob("*"))
            file_count = len(uploaded_files)
            total_size = sum(f.stat().st_size for f in uploaded_files)
        else:
            file_count = 0
            total_size = 0

        return {
            "upload_directory": str(UPLOAD_DIR),
            "uploaded_files": file_count,
            "total_size_bytes": total_size,
            "async_processing": "enabled" if settings.enable_async_ingestion else "disabled",
        }
    except Exception as e:
        logger.error(f"Error getting upload stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get upload statistics")


# ── Per-document CRUD + intelligence endpoints ────────────────────
# NOTE: these must come after all /documents/<prefix>/<id> routes
# so FastAPI matches the static prefixes first.


class ConfirmationPayload(BaseModel):
    create_course: bool = True
    confirmed_course_name: Optional[str] = None
    confirmed_course_code: Optional[str] = None
    confirmed_instructor_name: Optional[str] = None
    confirmed_deadlines: List[dict] = []
    confirmed_flashcards: List[dict] = []


@router.get("/documents/{document_id}")
async def get_document_detail(document_id: UUID, db=Depends(get_db)):
    """Full document detail including all extracted intelligence."""
    from app.db.models import Document
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == DEFAULT_USER_ID,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "id": str(doc.id),
        "filename": doc.original_filename,
        "document_type": doc.document_type,
        "file_size_bytes": doc.file_size_bytes,
        "status": doc.status,
        "num_chunks": doc.num_chunks,
        "course_id": str(doc.course_id) if doc.course_id else None,
        "confidence_band": getattr(doc, "confidence_band", None),
        "confirmed_at": getattr(doc, "confirmed_at", None),
        "extracted_title": doc.extracted_title,
        "extracted_summary": doc.extracted_summary,
        "extracted_instructor_name": doc.extracted_instructor_name,
        "extracted_instructor_email": doc.extracted_instructor_email,
        "extracted_office_hours": doc.extracted_office_hours or [],
        "extracted_dates": doc.extracted_dates or [],
        "extracted_assignments": doc.extracted_assignments or [],
        "extracted_flashcard_count": doc.extracted_flashcard_count or 0,
        "extraction_metadata": doc.extraction_metadata or {},
        "error_message": doc.error_message,
        "created_at": doc.created_at.isoformat(),
        "ingested_at": doc.ingested_at.isoformat() if doc.ingested_at else None,
    }


@router.delete("/documents/{document_id}")
async def delete_document(document_id: UUID, db=Depends(get_db)):
    """Delete a document record and its on-disk file."""
    from app.db.models import Document, EmbeddingChunk
    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == DEFAULT_USER_ID,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Remove embedding chunks from pgvector
    db.query(EmbeddingChunk).filter(
        EmbeddingChunk.source == doc.original_filename
    ).delete(synchronize_session=False)

    # Remove physical file
    if doc.file_path:
        try:
            Path(doc.file_path).unlink(missing_ok=True)
        except Exception as e:
            logger.warning(f"Could not delete file {doc.file_path}: {e}")

    db.delete(doc)
    db.commit()
    return {"message": "Document deleted", "id": str(document_id)}


@router.post("/documents/{document_id}/confirm")
async def confirm_document_metadata(
    document_id: UUID,
    payload: ConfirmationPayload,
    db=Depends(get_db),
):
    """
    User confirms (and optionally edits) AI-extracted metadata.
    Creates Course, Deadlines, and Flashcards from confirmed data.
    """
    from app.db.models import Document
    from app.services.entity_provisioner_service import EntityProvisioner

    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == DEFAULT_USER_ID,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    provisioner = EntityProvisioner()
    result = provisioner.provision_from_confirmation(
        db=db,
        document=doc,
        payload=payload.model_dump(),
        user_id=DEFAULT_USER_ID,
    )

    return {
        "document_id": str(document_id),
        "course_id": result.course_id,
        "deadlines_created": result.deadlines_created,
        "flashcards_created": result.flashcards_created,
        "confirmed": True,
    }


@router.post("/documents/{document_id}/generate-flashcards")
async def generate_flashcards_from_document(
    document_id: UUID,
    count: int = Query(default=10, ge=1, le=30),
    db=Depends(get_db),
):
    """
    Generate or refresh flashcards from a document's extracted candidates.
    Uses candidates already stored in extraction_metadata; falls back to RAG.
    """
    from app.db.models import Document
    from app.services.flashcard_service import FlashcardService

    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == DEFAULT_USER_ID,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "completed":
        raise HTTPException(status_code=400, detail="Document has not finished processing")

    # Use cached candidates first
    candidates = (doc.extraction_metadata or {}).get("flashcard_candidates", [])
    created = []

    if candidates:
        from app.db.models import Flashcard
        for fc in candidates[:count]:
            if not fc.get("question") or not fc.get("answer"):
                continue
            flashcard = Flashcard(
                user_id=DEFAULT_USER_ID,
                course_id=doc.course_id,
                question=fc["question"],
                answer=fc["answer"],
                source_doc=doc.original_filename,
                difficulty=1,
                next_review=datetime.utcnow(),
            )
            db.add(flashcard)
            created.append(fc["question"][:60])
        db.commit()
    else:
        # Fallback: AI generation via RAG
        svc = FlashcardService()
        flashcards = svc.generate_flashcards(
            db=db,
            user_id=DEFAULT_USER_ID,
            source_document=doc.original_filename,
            course_id=doc.course_id,
            count=count,
        )
        created = [f.question[:60] for f in flashcards]

    return {
        "document_id": str(document_id),
        "flashcards_created": len(created),
        "source": "extraction_cache" if candidates else "rag_generation",
    }


@router.post("/documents/{document_id}/generate-summary")
async def generate_document_summary(document_id: UUID, db=Depends(get_db)):
    """Generate or refresh the AI summary for a document using the full academic prompt."""
    from app.db.models import Document
    from app.services.summary_service import SummaryService
    from app.services.embedding_store_factory import get_embedding_store

    doc = db.query(Document).filter(
        Document.id == document_id,
        Document.user_id == DEFAULT_USER_ID,
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.status != "completed":
        raise HTTPException(status_code=400, detail="Document has not finished processing")

    # Load text from the active embedding store (JSON or pgvector).
    # Filtering by source name matches what the ingestion pipeline stored.
    try:
        store = get_embedding_store()
        all_chunks = store.load_all_chunks()
        doc_chunks = [c for c in all_chunks if c.source == doc.original_filename]
        logger.info(
            f"generate-summary: found {len(doc_chunks)} chunks for "
            f"source={doc.original_filename!r} (total store size={len(all_chunks)})"
        )
    except Exception as e:
        logger.error(f"generate-summary: failed to load chunks: {e}")
        doc_chunks = []

    if not doc_chunks:
        raise HTTPException(
            status_code=400,
            detail=(
                "No content chunks found for this document. "
                "The document may not have been ingested yet or used a different source name."
            ),
        )

    combined_text = "\n\n".join(c.text for c in doc_chunks)
    logger.info(
        f"generate-summary: combined text length={len(combined_text)} chars "
        f"for document {document_id}"
    )

    try:
        svc = SummaryService()
        summary = svc.generate_document_summary(combined_text)
        if not summary:
            raise HTTPException(status_code=500, detail="Summary generation failed — AI returned empty response")
        doc.extracted_summary = summary
        db.commit()
        logger.info(f"generate-summary: stored {len(summary)}-char summary for document {document_id}")
        return {"document_id": str(document_id), "summary": summary}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"generate-summary: failed: {e}")
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {e}")


@router.get("/documents/{document_id}/status")
async def stream_document_status(document_id: UUID, db=Depends(get_db)):
    """
    SSE stream of processing events for a document.
    Frontend polls this to drive the progress bar.
    """
    import asyncio
    import json as _json
    from app.db.models import Document

    async def event_generator():
        for _ in range(30):  # max 30 polls (~30s)
            doc = db.query(Document).filter(Document.id == document_id).first()
            if not doc:
                yield f"data: {_json.dumps({'status': 'not_found'})}\n\n"
                return

            payload = {
                "status": doc.status,
                "num_chunks": doc.num_chunks,
                "confidence_band": getattr(doc, "confidence_band", None),
                "extracted_title": doc.extracted_title,
                "error": doc.error_message,
            }
            yield f"data: {_json.dumps(payload)}\n\n"

            if doc.status in ("completed", "failed"):
                return

            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
