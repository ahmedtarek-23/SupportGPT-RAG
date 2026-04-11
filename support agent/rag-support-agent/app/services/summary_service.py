"""
Summary Service.

Generates document-level and course-level summaries using Ollama.
Supports on-demand regeneration and structured summaries for the
document dashboard.
"""

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.models import Document, Course, Deadline, Flashcard
from app.services.ollama_service import get_ollama_client, get_active_model

logger = logging.getLogger(__name__)


SUMMARY_PROMPT = """You are a helpful academic assistant. Summarize the following document for a student.

Write a clear, concise summary in 3-5 sentences covering:
1. What the document is about
2. Key topics or concepts covered
3. Any important dates or requirements mentioned

Be direct and informative. No preamble.

DOCUMENT TEXT:
{text}

SUMMARY:"""


class SummaryService:
    """Generates summaries for documents and courses using Ollama."""

    def __init__(self):
        self.client = get_ollama_client()
        self.model = get_active_model()

    def generate_document_summary(self, text: str, max_chars: int = 6000) -> str:
        """
        Generate a concise summary of document text.

        Args:
            text: Raw document text
            max_chars: Truncation limit

        Returns:
            Summary string, or empty string on failure
        """
        if not text or not text.strip():
            return ""

        if len(text) > max_chars:
            text = text[:max_chars] + "\n...[truncated]..."

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": SUMMARY_PROMPT.format(text=text)}],
                temperature=0.3,
                max_tokens=400,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            return ""

    @staticmethod
    def get_document_summary_response(db: Session, document_id: UUID) -> dict:
        """
        Build the full document summary payload for the dashboard.

        Returns document metadata + extracted intelligence in one response.
        """
        doc = db.query(Document).filter(Document.id == document_id).first()
        if not doc:
            return {}

        course_info = None
        if doc.course_id:
            course = db.query(Course).filter(Course.id == doc.course_id).first()
            if course:
                course_info = {
                    "id": str(course.id),
                    "name": course.name,
                    "code": course.code,
                    "color": course.color,
                }

        # Count deadlines auto-created from this doc
        extracted_deadlines = db.query(Deadline).filter(
            Deadline.course_id == doc.course_id,
            Deadline.description.like(f"%{doc.original_filename}%"),
        ).count() if doc.course_id else 0

        # Count flashcards from this doc
        flashcard_count = db.query(Flashcard).filter(
            Flashcard.source_doc == doc.original_filename,
        ).count()

        return {
            "id": str(doc.id),
            "filename": doc.original_filename,
            "document_type": doc.document_type,
            "file_size_bytes": doc.file_size_bytes,
            "status": doc.status,
            "created_at": doc.created_at.isoformat(),
            "ingested_at": doc.ingested_at.isoformat() if doc.ingested_at else None,
            "course": course_info,
            "extracted": {
                "title": doc.extracted_title,
                "summary": doc.extracted_summary,
                "instructor_name": doc.extracted_instructor_name,
                "instructor_email": doc.extracted_instructor_email,
                "office_hours": doc.extracted_office_hours or [],
                "important_dates": doc.extracted_dates or [],
                "assignments": doc.extracted_assignments or [],
                "flashcard_candidates_count": doc.extracted_flashcard_count or 0,
            },
            "stats": {
                "num_chunks": doc.num_chunks or 0,
                "deadlines_created": extracted_deadlines,
                "flashcards_created": flashcard_count,
            },
        }
