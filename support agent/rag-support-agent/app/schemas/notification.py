"""Pydantic schemas for notifications and reminder preferences."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class NotificationCreate(BaseModel):
    """Create a notification/reminder."""
    title: str = Field(..., max_length=500)
    message: str
    notification_type: str = Field(..., description="deadline, study, lecture, system")
    reference_id: Optional[UUID] = None
    reference_type: Optional[str] = None
    scheduled_at: datetime
    is_recurring: bool = False
    recurrence_rule: Optional[str] = None


class NotificationResponse(BaseModel):
    """Notification response."""
    id: UUID
    user_id: UUID
    title: str
    message: str
    notification_type: str
    reference_id: Optional[UUID] = None
    reference_type: Optional[str] = None
    scheduled_at: datetime
    sent_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    is_recurring: bool
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """List of notifications."""
    notifications: List[NotificationResponse]
    total: int
    unread_count: int


class ReminderPreferences(BaseModel):
    """User's reminder configuration."""
    deadline_reminder_hours: List[int] = Field(
        default=[24, 2],
        description="Hours before deadline to send reminders"
    )
    daily_study_reminder_time: Optional[str] = Field(
        default="08:00",
        description="Daily study reminder time HH:MM"
    )
    lecture_reminder_minutes: int = Field(
        default=15,
        description="Minutes before lecture to send reminder"
    )
    enable_deadline_reminders: bool = True
    enable_study_reminders: bool = True
    enable_lecture_reminders: bool = True


class NotificationMarkRead(BaseModel):
    """Mark notifications as read."""
    notification_ids: List[UUID]
