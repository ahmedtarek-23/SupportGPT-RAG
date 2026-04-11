"""Pydantic schemas for courses, deadlines, and recurring lectures."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, time
from uuid import UUID


# ── Course Schemas ──────────────────────────────────────────────

class LectureSlotCreate(BaseModel):
    """Create a recurring lecture slot."""
    day_of_week: int = Field(..., ge=0, le=6, description="0=Monday, 6=Sunday")
    start_time: str = Field(..., description="HH:MM format")
    end_time: str = Field(..., description="HH:MM format")
    location: Optional[str] = None
    lecture_type: str = Field(default="lecture", description="lecture, lab, tutorial")


class LectureSlotResponse(BaseModel):
    """Lecture slot response."""
    id: UUID
    day_of_week: int
    start_time: str
    end_time: str
    location: Optional[str] = None
    lecture_type: str

    class Config:
        from_attributes = True


class CourseCreate(BaseModel):
    """Create a new course."""
    name: str = Field(..., max_length=255)
    code: Optional[str] = Field(None, max_length=50)
    color: str = Field(default="#0066FF", max_length=7)
    instructor: Optional[str] = Field(None, max_length=255)
    semester: Optional[str] = Field(None, max_length=50)
    lectures: Optional[List[LectureSlotCreate]] = []
    # Instructor metadata
    instructor_name: Optional[str] = Field(None, max_length=255)
    instructor_email: Optional[str] = Field(None, max_length=255)
    instructor_office_hours: Optional[List[dict]] = None
    instructor_notes: Optional[str] = None


class CourseUpdate(BaseModel):
    """Update an existing course."""
    name: Optional[str] = None
    code: Optional[str] = None
    color: Optional[str] = None
    instructor: Optional[str] = None
    semester: Optional[str] = None
    is_active: Optional[bool] = None
    # Instructor metadata
    instructor_name: Optional[str] = None
    instructor_email: Optional[str] = None
    instructor_office_hours: Optional[List[dict]] = None
    instructor_notes: Optional[str] = None


class CourseResponse(BaseModel):
    """Course response with lecture slots and instructor metadata."""
    id: UUID
    user_id: UUID
    name: str
    code: Optional[str] = None
    color: str
    instructor: Optional[str] = None
    semester: Optional[str] = None
    is_active: bool
    created_at: datetime
    lectures: List[LectureSlotResponse] = []
    # Instructor metadata
    instructor_name: Optional[str] = None
    instructor_email: Optional[str] = None
    instructor_office_hours: Optional[List[dict]] = None
    instructor_notes: Optional[str] = None
    extracted_from_document: bool = False

    class Config:
        from_attributes = True


# ── Deadline Schemas ────────────────────────────────────────────

class DeadlineCreate(BaseModel):
    """Create a new deadline."""
    course_id: Optional[UUID] = None
    title: str = Field(..., max_length=500)
    description: Optional[str] = None
    deadline_type: str = Field(..., description="assignment, exam, project, quiz")
    due_date: datetime
    priority: int = Field(default=2, ge=1, le=3, description="1=critical, 2=important, 3=normal")
    estimated_hours: Optional[float] = Field(None, ge=0)


class DeadlineUpdate(BaseModel):
    """Update an existing deadline."""
    title: Optional[str] = None
    description: Optional[str] = None
    deadline_type: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[int] = None
    status: Optional[str] = None
    estimated_hours: Optional[float] = None
    course_id: Optional[UUID] = None


class DeadlineResponse(BaseModel):
    """Deadline response."""
    id: UUID
    user_id: UUID
    course_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    deadline_type: str
    due_date: datetime
    priority: int
    status: str
    estimated_hours: Optional[float] = None
    created_at: datetime
    updated_at: datetime
    course_name: Optional[str] = None
    course_color: Optional[str] = None
    days_until_due: Optional[int] = None

    class Config:
        from_attributes = True


class DeadlineListResponse(BaseModel):
    """List of deadlines with metadata."""
    deadlines: List[DeadlineResponse]
    total: int
    upcoming_count: int
    overdue_count: int
