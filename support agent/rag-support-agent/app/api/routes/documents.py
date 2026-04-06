import logging
import os
import shutil
from pathlib import Path
from typing import Optional, List
from fastapi import APIRouter, File, UploadFile, HTTPException, Query
from pydantic import BaseModel

from app.services.background_task_service import TaskManager
from app.services.document_parser_service import DocumentParserFactory
from app.core.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Get settings
settings = get_settings()

# Create upload directory if it doesn't exist
UPLOAD_DIR = Path(settings.document_upload_dir)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


class UploadResponse(BaseModel):
    """Response for document upload."""
    task_id: str
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
    source_name: Optional[str] = Query(None, description="Optional custom source name")
):
    """
    Upload a document for asynchronous ingestion.
    
    Supports: PDF, DOCX, TXT
    
    Returns: Task ID for tracking ingestion progress
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Validate file extension
    file_ext = Path(file.filename).suffix.lower()
    if not DocumentParserFactory.supports(f"test{file_ext}"):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file_ext}. Supported: .pdf, .docx, .txt"
        )
    
    try:
        # Save uploaded file temporarily
        file_path = UPLOAD_DIR / file.filename
        
        with open(file_path, 'wb') as f:
            contents = await file.read()
            f.write(contents)
        
        file_size = len(contents)
        
        logger.info(f"Saved uploaded file: {file.filename} ({file_size} bytes)")
        
        # Submit async ingestion task
        task_id = TaskManager.submit_ingestion(str(file_path), source_name=source_name)
        
        return UploadResponse(
            task_id=task_id,
            filename=file.filename,
            file_size=file_size,
            message="Document submitted for ingestion. Check status with task_id."
        )
        
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")


@router.get("/documents/upload/{task_id}", response_model=TaskStatusResponse)
async def get_upload_status(task_id: str):
    """
    Get the status of a document ingestion task.
    
    States: PENDING, STARTED, PROCESSING, SUCCESS, FAILURE
    """
    status = TaskManager.get_task_status(task_id)
    
    return TaskStatusResponse(
        task_id=status['task_id'],
        state=status['state'],
        progress=status['progress'],
        result=status['result'],
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
async def list_documents(skip: int = 0, limit: int = 10):
    """
    List ingested documents with metadata.
    
    Note: This is a placeholder pending implementation of document registry.
    """
    # TODO: Implement document registry to track ingested documents
    return {
        "documents": [],
        "total": 0,
        "message": "Document listing coming in Phase 6"
    }


@router.get("/documents/stats")
async def get_upload_stats():
    """
    Get statistics about uploaded documents.
    """
    try:
        # Count uploaded files
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
