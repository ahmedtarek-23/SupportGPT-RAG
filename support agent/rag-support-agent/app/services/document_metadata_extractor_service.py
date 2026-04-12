"""
Document Metadata Extractor Service.

Uses Ollama LLM to intelligently extract structured information from
uploaded documents: course title, instructor info, office hours,
important dates, assignments, exam dates, and flashcard candidates.
"""

import json
import logging
import re
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.models import Document, Course
from app.services.ollama_service import get_ollama_client, get_active_model

logger = logging.getLogger(__name__)


EXTRACTION_PROMPT = """You are an academic document parser. Given the text from a university document (syllabus, course outline, lecture notes, etc.), extract the following information as valid JSON.

Return ONLY valid JSON with these exact keys. Use null for fields not found in the document.

{{
  "course_title": "Full course name or null",
  "course_code": "e.g. CS201 or null",
  "instructor_name": "Instructor full name or null",
  "instructor_email": "Instructor email or null",
  "instructor_title": "Dr./Prof./Mr./Ms. or null",
  "office_hours": [
    {{"day": "Monday", "start": "10:00", "end": "12:00", "location": "Room 301"}}
  ],
  "semester": "e.g. Spring 2026 or null",
  "summary": "Academic summary: key topics covered, purpose of document, and what the student should know (4-6 sentences)",
  "important_dates": [
    {{"label": "Midterm Exam", "date": "YYYY-MM-DD", "type": "exam"}}
  ],
  "assignments": [
    {{"title": "Assignment 1", "due_date": "YYYY-MM-DD or null", "description": "brief description or null"}}
  ],
  "flashcard_candidates": [
    {{"question": "What is X?", "answer": "X is ..."}}
  ]
}}

Rules:
- dates MUST be in YYYY-MM-DD format or null
- office_hours is an array (can be empty [])
- important_dates type is one of: exam, assignment, project, quiz, lecture, other
- include at most 10 flashcard_candidates focusing on key concepts
- summary must be 4-6 sentences covering what this document teaches, its main topics, and what the student should take away

DOCUMENT TEXT:
{text}

JSON OUTPUT:"""


class DocumentMetadataExtractor:
    """Extracts structured metadata from document text using Ollama LLM."""

    def __init__(self):
        self.client = get_ollama_client()
        self.model = get_active_model()

    def extract(self, text: str, max_chars: int = 8000) -> dict:
        """
        Extract structured metadata from document text.

        Args:
            text: Raw document text
            max_chars: Truncation limit to fit LLM context window

        Returns:
            Parsed metadata dict with all extraction fields
        """
        # Truncate to fit context — use first + last portions for syllabus-style docs
        if len(text) > max_chars:
            half = max_chars // 2
            text = text[:half] + "\n...[truncated]...\n" + text[-half:]

        prompt = EXTRACTION_PROMPT.format(text=text)

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=1000,
            )
            raw = response.choices[0].message.content.strip()
            logger.info(f"Metadata extractor LLM response: {len(raw)} chars")

            # Strip markdown code fences if present
            raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
            raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)

            # Find JSON object boundaries in case LLM adds preamble text
            start = raw.find("{")
            end = raw.rfind("}")
            if start != -1 and end != -1:
                raw = raw[start:end + 1]

            data = json.loads(raw)
            result = self._validate_and_clean(data)
            logger.info(
                f"Metadata extraction succeeded: "
                f"course={result.get('course_title')!r}, "
                f"summary_len={len(result.get('summary') or '')}, "
                f"dates={len(result.get('important_dates', []))}, "
                f"flashcard_candidates={len(result.get('flashcard_candidates', []))}"
            )
            return result

        except json.JSONDecodeError as e:
            logger.warning(
                f"LLM returned invalid JSON during extraction: {e}\n"
                f"Raw response (first 500 chars): {raw[:500]!r}"
            )
            return self._empty_result()
        except Exception as e:
            logger.error(f"Document metadata extraction failed: {e}")
            return self._empty_result()

    def _validate_and_clean(self, data: dict) -> dict:
        """Ensure all expected keys exist and have correct types."""
        result = self._empty_result()

        result["course_title"] = data.get("course_title") or None
        result["course_code"] = data.get("course_code") or None
        result["instructor_name"] = data.get("instructor_name") or None
        result["instructor_email"] = data.get("instructor_email") or None
        result["instructor_title"] = data.get("instructor_title") or None
        result["semester"] = data.get("semester") or None
        result["summary"] = data.get("summary") or None

        # Validate office_hours array
        raw_oh = data.get("office_hours", [])
        if isinstance(raw_oh, list):
            result["office_hours"] = [
                oh for oh in raw_oh
                if isinstance(oh, dict) and "day" in oh
            ]

        # Validate important_dates array
        raw_dates = data.get("important_dates", [])
        if isinstance(raw_dates, list):
            result["important_dates"] = [
                d for d in raw_dates
                if isinstance(d, dict) and "label" in d
            ]

        # Validate assignments array
        raw_assignments = data.get("assignments", [])
        if isinstance(raw_assignments, list):
            result["assignments"] = [
                a for a in raw_assignments
                if isinstance(a, dict) and "title" in a
            ][:20]  # cap at 20

        # Validate flashcard candidates
        raw_fc = data.get("flashcard_candidates", [])
        if isinstance(raw_fc, list):
            result["flashcard_candidates"] = [
                fc for fc in raw_fc
                if isinstance(fc, dict) and "question" in fc and "answer" in fc
            ][:10]

        return result

    def _empty_result(self) -> dict:
        return {
            "course_title": None,
            "course_code": None,
            "instructor_name": None,
            "instructor_email": None,
            "instructor_title": None,
            "semester": None,
            "summary": None,
            "office_hours": [],
            "important_dates": [],
            "assignments": [],
            "flashcard_candidates": [],
        }


def apply_extraction_to_document(
    db: Session,
    document: Document,
    extraction: dict,
    auto_update_course: bool = True,
) -> Document:
    """
    Persist extracted metadata onto a Document record.

    If auto_update_course=True and the document is linked to a course,
    also back-fills instructor metadata on the Course (only if not already set).
    """
    document.extracted_title = extraction.get("course_title")
    document.extracted_summary = extraction.get("summary")
    document.extracted_instructor_name = extraction.get("instructor_name")
    document.extracted_instructor_email = extraction.get("instructor_email")
    document.extracted_office_hours = extraction.get("office_hours", [])
    document.extracted_dates = extraction.get("important_dates", [])
    document.extracted_assignments = extraction.get("assignments", [])
    document.extracted_flashcard_count = len(extraction.get("flashcard_candidates", []))
    document.extraction_metadata = {
        "course_code": extraction.get("course_code"),
        "instructor_title": extraction.get("instructor_title"),
        "semester": extraction.get("semester"),
        "flashcard_candidates": extraction.get("flashcard_candidates", []),
    }

    db.add(document)

    # Back-fill course instructor metadata if linked and not yet set
    if auto_update_course and document.course_id:
        course = db.query(Course).filter(Course.id == document.course_id).first()
        if course:
            if not course.instructor_name and extraction.get("instructor_name"):
                course.instructor_name = extraction["instructor_name"]
                course.instructor = extraction["instructor_name"]  # keep legacy field in sync
            if not course.instructor_email and extraction.get("instructor_email"):
                course.instructor_email = extraction["instructor_email"]
            if not course.instructor_office_hours and extraction.get("office_hours"):
                course.instructor_office_hours = extraction["office_hours"]
            if extraction.get("course_code") and not course.code:
                course.code = extraction["course_code"]
            if extraction.get("semester") and not course.semester:
                course.semester = extraction["semester"]
            course.extracted_from_document = True
            db.add(course)

    db.commit()
    db.refresh(document)
    return document
