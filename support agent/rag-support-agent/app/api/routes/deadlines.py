"""
API routes for course and deadline management.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.services.deadline_service import DeadlineService
from app.services.notification_service import NotificationService
from app.schemas.deadline import (
    CourseCreate, CourseUpdate, CourseResponse,
    DeadlineCreate, DeadlineUpdate, DeadlineResponse, DeadlineListResponse,
    LectureSlotCreate, LectureSlotResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Default user ID for MVP (no auth — localStorage based)
DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


def get_user_id() -> UUID:
    """Get user ID — placeholder for future auth."""
    return DEFAULT_USER_ID


# ── Course Endpoints ──────────────────────────────────────────────

@router.post("/courses", response_model=CourseResponse, status_code=201)
async def create_course(data: CourseCreate, db=Depends(get_db)):
    """Create a new course with optional lecture slots."""
    try:
        user_id = get_user_id()
        DeadlineService.get_or_create_user(db, user_id)
        course = DeadlineService.create_course(db, user_id, data)
        return course
    except Exception as e:
        logger.error(f"Error creating course: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses", response_model=list[CourseResponse])
async def list_courses(active_only: bool = True, db=Depends(get_db)):
    """List all courses."""
    user_id = get_user_id()
    return DeadlineService.get_courses(db, user_id, active_only)


@router.get("/courses/{course_id}", response_model=CourseResponse)
async def get_course(course_id: UUID, db=Depends(get_db)):
    """Get a single course."""
    user_id = get_user_id()
    course = DeadlineService.get_course(db, course_id, user_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.put("/courses/{course_id}", response_model=CourseResponse)
async def update_course(course_id: UUID, data: CourseUpdate, db=Depends(get_db)):
    """Update a course."""
    user_id = get_user_id()
    course = DeadlineService.update_course(db, course_id, user_id, data)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.delete("/courses/{course_id}")
async def delete_course(course_id: UUID, db=Depends(get_db)):
    """Delete a course."""
    user_id = get_user_id()
    if not DeadlineService.delete_course(db, course_id, user_id):
        raise HTTPException(status_code=404, detail="Course not found")
    return {"message": "Course deleted"}


# ── Lecture Slot Endpoints ────────────────────────────────────────

@router.post("/courses/{course_id}/lectures", response_model=LectureSlotResponse, status_code=201)
async def add_lecture(course_id: UUID, data: LectureSlotCreate, db=Depends(get_db)):
    """Add a recurring lecture slot to a course."""
    user_id = get_user_id()
    lecture = DeadlineService.add_lecture_slot(db, course_id, user_id, data)
    if not lecture:
        raise HTTPException(status_code=404, detail="Course not found")
    return lecture


@router.delete("/lectures/{lecture_id}")
async def delete_lecture(lecture_id: UUID, db=Depends(get_db)):
    """Delete a lecture slot."""
    if not DeadlineService.delete_lecture_slot(db, lecture_id):
        raise HTTPException(status_code=404, detail="Lecture not found")
    return {"message": "Lecture deleted"}


@router.get("/schedule/weekly")
async def get_weekly_schedule(db=Depends(get_db)):
    """Get full weekly lecture timetable."""
    user_id = get_user_id()
    return DeadlineService.get_weekly_schedule(db, user_id)


# ── Deadline Endpoints ────────────────────────────────────────────

@router.post("/deadlines", response_model=DeadlineResponse, status_code=201)
async def create_deadline(data: DeadlineCreate, db=Depends(get_db)):
    """Create a new deadline with auto-generated reminders."""
    try:
        user_id = get_user_id()
        DeadlineService.get_or_create_user(db, user_id)
        deadline = DeadlineService.create_deadline(db, user_id, data)

        # Auto-create reminder notifications
        try:
            NotificationService.create_deadline_reminders(db, user_id, deadline)
        except Exception as e:
            logger.warning(f"Failed to create deadline reminders: {e}")

        return DeadlineService.deadline_to_response(deadline)
    except Exception as e:
        logger.error(f"Error creating deadline: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/deadlines", response_model=DeadlineListResponse)
async def list_deadlines(
    status: Optional[str] = None,
    deadline_type: Optional[str] = None,
    course_id: Optional[UUID] = None,
    days_ahead: Optional[int] = None,
    db=Depends(get_db),
):
    """List deadlines with optional filters."""
    user_id = get_user_id()
    deadlines = DeadlineService.get_deadlines(
        db, user_id, status=status, deadline_type=deadline_type,
        course_id=course_id, days_ahead=days_ahead,
    )

    from datetime import datetime
    now = datetime.utcnow()
    responses = [DeadlineService.deadline_to_response(d) for d in deadlines]
    upcoming = sum(1 for d in deadlines if d.due_date > now and d.status != "completed")
    overdue = sum(1 for d in deadlines if d.due_date < now and d.status != "completed")

    return DeadlineListResponse(
        deadlines=responses,
        total=len(deadlines),
        upcoming_count=upcoming,
        overdue_count=overdue,
    )


@router.get("/deadlines/upcoming")
async def get_upcoming_deadlines(days: int = Query(default=7, ge=1, le=90), db=Depends(get_db)):
    """Get upcoming deadlines within N days."""
    user_id = get_user_id()
    deadlines = DeadlineService.get_upcoming_deadlines(db, user_id, days)
    return [DeadlineService.deadline_to_response(d) for d in deadlines]


@router.get("/deadlines/overdue")
async def get_overdue_deadlines(db=Depends(get_db)):
    """Get overdue deadlines."""
    user_id = get_user_id()
    deadlines = DeadlineService.get_overdue_deadlines(db, user_id)
    return [DeadlineService.deadline_to_response(d) for d in deadlines]


@router.get("/deadlines/{deadline_id}", response_model=DeadlineResponse)
async def get_deadline(deadline_id: UUID, db=Depends(get_db)):
    """Get a single deadline."""
    user_id = get_user_id()
    deadline = DeadlineService.get_deadline(db, deadline_id, user_id)
    if not deadline:
        raise HTTPException(status_code=404, detail="Deadline not found")
    return DeadlineService.deadline_to_response(deadline)


@router.put("/deadlines/{deadline_id}", response_model=DeadlineResponse)
async def update_deadline(deadline_id: UUID, data: DeadlineUpdate, db=Depends(get_db)):
    """Update a deadline."""
    user_id = get_user_id()
    deadline = DeadlineService.update_deadline(db, deadline_id, user_id, data)
    if not deadline:
        raise HTTPException(status_code=404, detail="Deadline not found")
    return DeadlineService.deadline_to_response(deadline)


@router.delete("/deadlines/{deadline_id}")
async def delete_deadline(deadline_id: UUID, db=Depends(get_db)):
    """Delete a deadline."""
    user_id = get_user_id()
    if not DeadlineService.delete_deadline(db, deadline_id, user_id):
        raise HTTPException(status_code=404, detail="Deadline not found")
    return {"message": "Deadline deleted"}
