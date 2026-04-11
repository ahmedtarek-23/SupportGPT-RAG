"""
Deadline Extractor Service.

Auto-saves dates extracted from document intelligence as Deadline records.
Handles deduplication and links deadlines to the correct course.
"""

import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.models import Deadline, Document, User
from app.services.deadline_service import DeadlineService
from app.schemas.deadline import DeadlineCreate

logger = logging.getLogger(__name__)

# Mapping from extraction type labels to Deadline.deadline_type values
TYPE_MAP = {
    "exam": "exam",
    "assignment": "assignment",
    "project": "project",
    "quiz": "quiz",
    "lecture": "other",
    "other": "other",
}

PRIORITY_MAP = {
    "exam": 1,       # critical
    "project": 1,
    "assignment": 2,  # important
    "quiz": 2,
    "other": 3,
}


class DeadlineExtractorService:
    """Converts extracted document dates into persisted Deadline records."""

    @staticmethod
    def create_deadlines_from_extraction(
        db: Session,
        document: Document,
        extracted_dates: list[dict],
        extracted_assignments: list[dict],
        user_id: UUID,
    ) -> list[Deadline]:
        """
        Create Deadline records from document extraction results.

        Combines important_dates and assignments arrays, deduplicates by
        (title, due_date, course_id), and persists to DB.

        Returns list of newly created Deadline records.
        """
        # Ensure user exists
        DeadlineService.get_or_create_user(db, user_id)

        events = []

        # From important_dates
        for item in (extracted_dates or []):
            label = item.get("label") or "Unnamed Event"
            date_str = item.get("date")
            event_type = TYPE_MAP.get((item.get("type") or "other").lower(), "other")
            if date_str:
                events.append({
                    "title": label,
                    "due_date": date_str,
                    "deadline_type": event_type,
                    "description": None,
                })

        # From assignments
        for item in (extracted_assignments or []):
            title = item.get("title") or "Unnamed Assignment"
            date_str = item.get("due_date")
            desc = item.get("description")
            if date_str:
                events.append({
                    "title": title,
                    "due_date": date_str,
                    "deadline_type": "assignment",
                    "description": desc,
                })

        created = []
        for event in events:
            try:
                due_dt = DeadlineExtractorService._parse_date(event["due_date"])
                if due_dt is None:
                    continue

                # Skip dates in the past (>30 days ago)
                if (datetime.utcnow() - due_dt).days > 30:
                    logger.debug(f"Skipping past date: {event['title']} ({due_dt})")
                    continue

                # Deduplication check
                existing = db.query(Deadline).filter(
                    Deadline.user_id == user_id,
                    Deadline.title == event["title"],
                    Deadline.course_id == document.course_id,
                ).first()
                if existing:
                    logger.debug(f"Skipping duplicate deadline: {event['title']}")
                    continue

                dl_type = event["deadline_type"]
                data = DeadlineCreate(
                    course_id=document.course_id,
                    title=event["title"],
                    description=event.get("description") or f"Auto-extracted from {document.original_filename}",
                    deadline_type=dl_type,
                    due_date=due_dt,
                    priority=PRIORITY_MAP.get(dl_type, 3),
                )
                deadline = DeadlineService.create_deadline(db, user_id, data)
                created.append(deadline)
                logger.info(f"Created deadline from doc: {event['title']} ({due_dt.date()})")

            except Exception as e:
                logger.warning(f"Failed to create deadline for '{event.get('title')}': {e}")
                continue

        return created

    @staticmethod
    def _parse_date(date_str: str) -> Optional[datetime]:
        """Parse YYYY-MM-DD date string to datetime. Returns None on failure."""
        if not date_str:
            return None
        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%d-%m-%Y"):
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        logger.debug(f"Could not parse date: {date_str}")
        return None
