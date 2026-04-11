"""
Notification service for creating, scheduling, and managing reminders.

Handles deadline reminders, study nudges, lecture alarms, and notification dispatch.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.models import Notification, Deadline, User
from app.schemas.notification import NotificationCreate, ReminderPreferences

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for managing user notifications and reminders."""

    # ── Notification CRUD ─────────────────────────────────────────

    @staticmethod
    def create_notification(db: Session, user_id: UUID, data: NotificationCreate) -> Notification:
        """Create a new notification."""
        notification = Notification(
            user_id=user_id,
            title=data.title,
            message=data.message,
            notification_type=data.notification_type,
            reference_id=data.reference_id,
            reference_type=data.reference_type,
            scheduled_at=data.scheduled_at,
            is_recurring=data.is_recurring,
            recurrence_rule=data.recurrence_rule,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        logger.info(f"Created notification: {notification.title} scheduled at {notification.scheduled_at}")
        return notification

    @staticmethod
    def get_notifications(
        db: Session,
        user_id: UUID,
        unread_only: bool = False,
        notification_type: Optional[str] = None,
        limit: int = 50,
    ) -> List[Notification]:
        """Get notifications for a user."""
        query = db.query(Notification).filter(Notification.user_id == user_id)

        if unread_only:
            query = query.filter(Notification.read_at.is_(None))
        if notification_type:
            query = query.filter(Notification.notification_type == notification_type)

        return query.order_by(Notification.scheduled_at.desc()).limit(limit).all()

    @staticmethod
    def get_unread_count(db: Session, user_id: UUID) -> int:
        """Get count of unread notifications."""
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.read_at.is_(None),
            Notification.sent_at.isnot(None),
        ).count()

    @staticmethod
    def mark_read(db: Session, notification_id: UUID, user_id: UUID) -> bool:
        """Mark a notification as read."""
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        ).first()
        if not notification:
            return False

        notification.read_at = datetime.utcnow()
        db.commit()
        return True

    @staticmethod
    def mark_all_read(db: Session, user_id: UUID) -> int:
        """Mark all notifications as read. Returns count updated."""
        count = db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.read_at.is_(None),
        ).update({"read_at": datetime.utcnow()})
        db.commit()
        return count

    @staticmethod
    def delete_notification(db: Session, notification_id: UUID, user_id: UUID) -> bool:
        """Delete a notification."""
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        ).first()
        if not notification:
            return False

        db.delete(notification)
        db.commit()
        return True

    # ── Auto-Reminder Generation ──────────────────────────────────

    @staticmethod
    def create_deadline_reminders(
        db: Session,
        user_id: UUID,
        deadline: Deadline,
        reminder_hours: List[int] = None,
    ) -> List[Notification]:
        """Auto-create reminder notifications for a deadline."""
        if reminder_hours is None:
            reminder_hours = [48, 24, 2]  # 2 days, 1 day, 2 hours before

        notifications = []
        now = datetime.utcnow()

        for hours in reminder_hours:
            remind_at = deadline.due_date - timedelta(hours=hours)

            # Don't create reminders in the past
            if remind_at <= now:
                continue

            # Check if reminder already exists
            existing = db.query(Notification).filter(
                Notification.user_id == user_id,
                Notification.reference_id == deadline.id,
                Notification.reference_type == "deadline",
                Notification.scheduled_at == remind_at,
            ).first()

            if existing:
                continue

            # Format message
            if hours >= 24:
                time_str = f"{hours // 24} day{'s' if hours >= 48 else ''}"
            else:
                time_str = f"{hours} hour{'s' if hours > 1 else ''}"

            course_str = f" ({deadline.course.name})" if deadline.course else ""

            notification = Notification(
                user_id=user_id,
                title=f"⏰ {deadline.title} due in {time_str}",
                message=f"Your {deadline.deadline_type}{course_str} \"{deadline.title}\" is due in {time_str}.",
                notification_type="deadline",
                reference_id=deadline.id,
                reference_type="deadline",
                scheduled_at=remind_at,
            )
            db.add(notification)
            notifications.append(notification)

        if notifications:
            db.commit()
            logger.info(f"Created {len(notifications)} reminders for deadline: {deadline.title}")

        return notifications

    @staticmethod
    def create_lecture_reminder(
        db: Session,
        user_id: UUID,
        course_name: str,
        lecture_start: datetime,
        location: Optional[str] = None,
        minutes_before: int = 15,
    ) -> Notification:
        """Create a reminder before a lecture."""
        remind_at = lecture_start - timedelta(minutes=minutes_before)
        location_str = f" in {location}" if location else ""

        notification = Notification(
            user_id=user_id,
            title=f"📚 {course_name} starts in {minutes_before} min",
            message=f"Your {course_name} class starts at {lecture_start.strftime('%H:%M')}{location_str}.",
            notification_type="lecture",
            reference_type="lecture",
            scheduled_at=remind_at,
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    # ── Dispatch ──────────────────────────────────────────────────

    @staticmethod
    def get_pending_dispatch(db: Session) -> List[Notification]:
        """Get notifications that are due to be sent."""
        now = datetime.utcnow()
        return db.query(Notification).filter(
            Notification.scheduled_at <= now,
            Notification.sent_at.is_(None),
        ).order_by(Notification.scheduled_at).limit(100).all()

    @staticmethod
    def mark_sent(db: Session, notification_id: UUID) -> bool:
        """Mark notification as sent."""
        notification = db.query(Notification).filter(
            Notification.id == notification_id
        ).first()
        if not notification:
            return False

        notification.sent_at = datetime.utcnow()
        db.commit()
        return True

    # ── Preferences ───────────────────────────────────────────────

    @staticmethod
    def get_preferences(db: Session, user_id: UUID) -> ReminderPreferences:
        """Get user's notification preferences."""
        user = db.query(User).filter(User.id == user_id).first()
        if user and user.preferences and "notifications" in user.preferences:
            return ReminderPreferences(**user.preferences["notifications"])
        return ReminderPreferences()

    @staticmethod
    def update_preferences(db: Session, user_id: UUID, prefs: ReminderPreferences) -> bool:
        """Update user's notification preferences."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return False

        if not user.preferences:
            user.preferences = {}

        user.preferences["notifications"] = prefs.model_dump()
        db.commit()
        return True
