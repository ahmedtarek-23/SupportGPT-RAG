"""
API routes for notification management.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.services.notification_service import NotificationService
from app.schemas.notification import (
    NotificationCreate, NotificationResponse, NotificationListResponse,
    ReminderPreferences, NotificationMarkRead,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Default user ID for MVP
DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


def get_user_id() -> UUID:
    return DEFAULT_USER_ID


@router.get("/notifications", response_model=NotificationListResponse)
async def list_notifications(
    unread_only: bool = False,
    notification_type: Optional[str] = None,
    limit: int = 50,
    db=Depends(get_db),
):
    """Get notifications for the current user."""
    user_id = get_user_id()
    notifications = NotificationService.get_notifications(
        db, user_id, unread_only=unread_only,
        notification_type=notification_type, limit=limit,
    )
    unread_count = NotificationService.get_unread_count(db, user_id)

    return NotificationListResponse(
        notifications=notifications,
        total=len(notifications),
        unread_count=unread_count,
    )


@router.get("/notifications/unread-count")
async def get_unread_count(db=Depends(get_db)):
    """Get unread notification count."""
    user_id = get_user_id()
    count = NotificationService.get_unread_count(db, user_id)
    return {"unread_count": count}


@router.post("/notifications", response_model=NotificationResponse, status_code=201)
async def create_notification(data: NotificationCreate, db=Depends(get_db)):
    """Create a custom notification."""
    user_id = get_user_id()
    notification = NotificationService.create_notification(db, user_id, data)
    return notification


@router.put("/notifications/{notification_id}/read")
async def mark_read(notification_id: UUID, db=Depends(get_db)):
    """Mark a notification as read."""
    user_id = get_user_id()
    if not NotificationService.mark_read(db, notification_id, user_id):
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Marked as read"}


@router.put("/notifications/read-all")
async def mark_all_read(db=Depends(get_db)):
    """Mark all notifications as read."""
    user_id = get_user_id()
    count = NotificationService.mark_all_read(db, user_id)
    return {"message": f"Marked {count} notifications as read"}


@router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: UUID, db=Depends(get_db)):
    """Delete a notification."""
    user_id = get_user_id()
    if not NotificationService.delete_notification(db, notification_id, user_id):
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}


# ── Preferences ───────────────────────────────────────────────────

@router.get("/notifications/preferences", response_model=ReminderPreferences)
async def get_preferences(db=Depends(get_db)):
    """Get notification preferences."""
    user_id = get_user_id()
    return NotificationService.get_preferences(db, user_id)


@router.put("/notifications/preferences")
async def update_preferences(prefs: ReminderPreferences, db=Depends(get_db)):
    """Update notification preferences."""
    user_id = get_user_id()
    if not NotificationService.update_preferences(db, user_id, prefs):
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Preferences updated"}
