"""Pydantic schemas for the AI study planner."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID


class StudyBlock(BaseModel):
    """A single study time block within a plan."""
    title: str
    course_id: Optional[UUID] = None
    course_name: Optional[str] = None
    deadline_id: Optional[UUID] = None
    start_time: datetime
    end_time: datetime
    priority: int = 2
    study_type: str = "review"  # review, assignment, exam_prep, project


class StudyPlanGenerate(BaseModel):
    """Request to generate a new AI study plan."""
    week_start: Optional[date] = None  # defaults to current week
    preferences: Optional[dict] = Field(
        default={},
        description="Optional overrides like preferred study hours, break duration"
    )


class StudyPlanResponse(BaseModel):
    """Generated study plan response."""
    id: UUID
    user_id: UUID
    week_start: date
    week_end: date
    status: str
    ai_reasoning: Optional[str] = None
    blocks: List[StudyBlock] = []
    total_study_hours: float = 0
    created_at: datetime

    class Config:
        from_attributes = True


class StudySessionUpdate(BaseModel):
    """Update a study session status."""
    status: Optional[str] = None  # scheduled, active, completed, skipped
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    notes: Optional[str] = None


class StudySessionResponse(BaseModel):
    """Study session response."""
    id: UUID
    user_id: UUID
    course_id: Optional[UUID] = None
    deadline_id: Optional[UUID] = None
    title: str
    scheduled_start: datetime
    scheduled_end: datetime
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    status: str
    notes: Optional[str] = None
    course_name: Optional[str] = None
    course_color: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WorkloadSummary(BaseModel):
    """Workload analysis."""
    total_hours_this_week: float
    hours_by_course: dict  # course_name -> hours
    busiest_day: str
    lightest_day: str
    balance_score: float = Field(description="0-100, higher = more balanced")
    suggestions: List[str] = []
