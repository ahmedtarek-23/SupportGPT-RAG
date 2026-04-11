"""
Entity Provisioner Service

Takes a scored document extraction result and creates the appropriate
ORM records (Course, Deadline, Flashcard) based on confidence level.

HIGH confidence → create silently
LOW confidence  → return pending payload (no DB writes until user confirms)
NONE confidence → return empty manifest (user fills manually)
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.models import Course, Deadline, Flashcard, Document

logger = logging.getLogger(__name__)

DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


@dataclass
class ProvisionResult:
    """Result returned by EntityProvisioner.provision()"""
    confidence_band: str           # "HIGH" | "LOW" | "NONE"
    auto_created: bool             # True if entities were written to DB
    course_id: Optional[str]       # UUID str if course was created/found
    deadlines_created: int
    flashcards_created: int
    # Pending payload for LOW/NONE — sent to frontend for confirmation modal
    pending_course: Optional[dict] = None
    pending_deadlines: list = field(default_factory=list)
    pending_flashcards: list = field(default_factory=list)
    review_fields: list = field(default_factory=list)


class EntityProvisioner:
    """
    Creates academic entities from AI-extracted document metadata.

    Used after DocumentMetadataExtractor runs on an uploaded file.
    """

    def provision(
        self,
        db: Session,
        document: Document,
        extraction: dict,
        confidence: dict,
        user_id: UUID = DEFAULT_USER_ID,
    ) -> ProvisionResult:
        """
        Provision entities based on extraction + confidence band.

        Args:
            db: SQLAlchemy session
            document: The uploaded Document ORM record
            extraction: Output of DocumentMetadataExtractor.extract()
            confidence: Output of ExtractionConfidenceScorer.score_extraction()
            user_id: Owner user ID

        Returns:
            ProvisionResult describing what was (or would be) created
        """
        band = confidence.get("overall", "NONE")

        # Persist confidence band on document
        document.confidence_band = band
        db.add(document)

        if band == "HIGH":
            return self._provision_auto(db, document, extraction, user_id)
        else:
            # LOW or NONE — return pending payload, no DB writes
            return self._build_pending(document, extraction, confidence, band)

    # ── Private ───────────────────────────────────────────────────

    def _provision_auto(
        self,
        db: Session,
        document: Document,
        extraction: dict,
        user_id: UUID,
    ) -> ProvisionResult:
        """Silently create all entities for HIGH confidence extractions."""
        course = self._get_or_create_course(db, document, extraction, user_id)
        course_id = str(course.id) if course else None

        # Link document to course
        if course and not document.course_id:
            document.course_id = course.id
            db.add(document)

        deadlines_created = self._create_deadlines(db, document, extraction, user_id, course)
        flashcards_created = self._create_flashcards(db, document, extraction, user_id, course)

        db.commit()
        logger.info(
            f"Auto-provisioned: course={course_id}, "
            f"deadlines={deadlines_created}, flashcards={flashcards_created}"
        )

        return ProvisionResult(
            confidence_band="HIGH",
            auto_created=True,
            course_id=course_id,
            deadlines_created=deadlines_created,
            flashcards_created=flashcards_created,
        )

    def _build_pending(
        self,
        document: Document,
        extraction: dict,
        confidence: dict,
        band: str,
    ) -> ProvisionResult:
        """Build confirmation payload for LOW/NONE — no DB writes."""
        pending_course = {
            "name": extraction.get("course_title") or "",
            "code": extraction.get("course_code") or "",
            "instructor_name": extraction.get("instructor_name") or "",
            "instructor_email": extraction.get("instructor_email") or "",
            "semester": extraction.get("semester") or "",
        }

        pending_deadlines = [
            {
                "title": d.get("label", "Unnamed event"),
                "due_date": d.get("date"),
                "deadline_type": d.get("type", "assignment"),
                "description": d.get("description"),
            }
            for d in (extraction.get("important_dates") or [])
            if d.get("date")
        ] + [
            {
                "title": a.get("title", "Assignment"),
                "due_date": a.get("due_date"),
                "deadline_type": "assignment",
                "description": a.get("description"),
            }
            for a in (extraction.get("assignments") or [])
            if a.get("due_date")
        ]

        pending_flashcards = [
            {"question": fc["question"], "answer": fc["answer"]}
            for fc in (extraction.get("flashcard_candidates") or [])
            if fc.get("question") and fc.get("answer")
        ]

        return ProvisionResult(
            confidence_band=band,
            auto_created=False,
            course_id=str(document.course_id) if document.course_id else None,
            deadlines_created=0,
            flashcards_created=0,
            pending_course=pending_course,
            pending_deadlines=pending_deadlines,
            pending_flashcards=pending_flashcards,
            review_fields=confidence.get("review_fields", []),
        )

    def provision_from_confirmation(
        self,
        db: Session,
        document: Document,
        payload: dict,
        user_id: UUID = DEFAULT_USER_ID,
    ) -> ProvisionResult:
        """
        Create entities from a user-confirmed payload.

        Called by the POST /api/documents/{id}/confirm endpoint.
        """
        course = None
        if payload.get("create_course") and payload.get("confirmed_course_name"):
            course = self._find_or_create_course_from_payload(db, payload, user_id)
            if course and not document.course_id:
                document.course_id = course.id
                db.add(document)

        deadlines_created = 0
        for d in payload.get("confirmed_deadlines") or []:
            if not d.get("title") or not d.get("due_date"):
                continue
            try:
                due = datetime.fromisoformat(d["due_date"])
            except (ValueError, TypeError):
                continue
            deadline = Deadline(
                user_id=user_id,
                course_id=course.id if course else None,
                title=d["title"],
                deadline_type=d.get("deadline_type", "assignment"),
                due_date=due,
                description=d.get("description"),
                priority=2,
                status="pending",
            )
            db.add(deadline)
            deadlines_created += 1

        flashcards_created = 0
        for fc in payload.get("confirmed_flashcards") or []:
            if not fc.get("question") or not fc.get("answer"):
                continue
            flashcard = Flashcard(
                user_id=user_id,
                course_id=course.id if course else None,
                question=fc["question"],
                answer=fc["answer"],
                source_doc=document.original_filename,
                difficulty=1,
                next_review=datetime.utcnow(),
            )
            db.add(flashcard)
            flashcards_created += 1

        document.confirmed_at = datetime.utcnow()
        document.confidence_band = "CONFIRMED"
        db.add(document)
        db.commit()

        return ProvisionResult(
            confidence_band="CONFIRMED",
            auto_created=True,
            course_id=str(course.id) if course else None,
            deadlines_created=deadlines_created,
            flashcards_created=flashcards_created,
        )

    # ── Helpers ───────────────────────────────────────────────────

    def _get_or_create_course(
        self,
        db: Session,
        document: Document,
        extraction: dict,
        user_id: UUID,
    ) -> Optional[Course]:
        course_title = extraction.get("course_title")
        if not course_title:
            return None

        # Check if a matching course already exists (case-insensitive)
        existing = db.query(Course).filter(
            Course.user_id == user_id,
            Course.name.ilike(f"%{course_title}%"),
        ).first()

        if existing:
            return existing

        course = Course(
            user_id=user_id,
            name=course_title,
            code=extraction.get("course_code"),
            semester=extraction.get("semester"),
            instructor_name=extraction.get("instructor_name"),
            instructor=extraction.get("instructor_name"),
            instructor_email=extraction.get("instructor_email"),
            instructor_office_hours=extraction.get("office_hours", []),
            extracted_from_document=True,
            is_active=True,
        )
        db.add(course)
        db.flush()  # get course.id without full commit
        return course

    def _find_or_create_course_from_payload(
        self,
        db: Session,
        payload: dict,
        user_id: UUID,
    ) -> Optional[Course]:
        name = payload.get("confirmed_course_name", "").strip()
        if not name:
            return None

        existing = db.query(Course).filter(
            Course.user_id == user_id,
            Course.name.ilike(f"%{name}%"),
        ).first()
        if existing:
            return existing

        course = Course(
            user_id=user_id,
            name=name,
            code=payload.get("confirmed_course_code"),
            instructor_name=payload.get("confirmed_instructor_name"),
            instructor=payload.get("confirmed_instructor_name"),
            extracted_from_document=False,
            is_active=True,
        )
        db.add(course)
        db.flush()
        return course

    def _create_deadlines(
        self,
        db: Session,
        document: Document,
        extraction: dict,
        user_id: UUID,
        course: Optional[Course],
    ) -> int:
        created = 0
        entries = list(extraction.get("important_dates") or []) + list(extraction.get("assignments") or [])

        for entry in entries:
            date_str = entry.get("date") or entry.get("due_date")
            title = entry.get("label") or entry.get("title") or "Unnamed event"
            if not date_str:
                continue
            try:
                due = datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                continue

            # Skip past dates
            if due < datetime.utcnow():
                continue

            deadline = Deadline(
                user_id=user_id,
                course_id=course.id if course else None,
                title=title,
                deadline_type=entry.get("type", "assignment"),
                due_date=due,
                description=entry.get("description"),
                priority=2,
                status="pending",
            )
            db.add(deadline)
            created += 1

        return created

    def _create_flashcards(
        self,
        db: Session,
        document: Document,
        extraction: dict,
        user_id: UUID,
        course: Optional[Course],
    ) -> int:
        candidates = extraction.get("flashcard_candidates") or []
        created = 0

        for fc in candidates:
            if not fc.get("question") or not fc.get("answer"):
                continue
            flashcard = Flashcard(
                user_id=user_id,
                course_id=course.id if course else None,
                question=fc["question"],
                answer=fc["answer"],
                source_doc=document.original_filename,
                difficulty=1,
                next_review=datetime.utcnow(),
            )
            db.add(flashcard)
            created += 1

        return created
