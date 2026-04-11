"""
Scheduler engine service for periodic background tasks.

Uses Celery Beat to schedule recurring jobs like notification dispatch,
daily study plan generation, and deadline reminder checks.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from app.core.config import get_settings
from app.services.background_task_service import celery_app

logger = logging.getLogger(__name__)


# ── Periodic Tasks (Celery Beat) ──────────────────────────────────

@celery_app.task(name='tasks.dispatch_pending_notifications')
def dispatch_pending_notifications():
    """
    Check and dispatch notifications that are due.
    Runs every minute via Celery Beat.
    """
    try:
        from app.db.session import get_session_factory
        from app.services.notification_service import NotificationService

        SessionLocal = get_session_factory()
        db = SessionLocal()

        try:
            pending = NotificationService.get_pending_dispatch(db)
            dispatched = 0

            for notification in pending:
                # Mark as sent (in-app — frontend will poll or use WebSocket)
                NotificationService.mark_sent(db, notification.id)
                dispatched += 1
                logger.debug(f"Dispatched notification: {notification.title}")

            if dispatched > 0:
                logger.info(f"Dispatched {dispatched} pending notifications")

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error dispatching notifications: {e}")


@celery_app.task(name='tasks.check_upcoming_deadlines')
def check_upcoming_deadlines():
    """
    Check for upcoming deadlines and auto-create reminder notifications.
    Runs every hour via Celery Beat.
    """
    try:
        from app.db.session import get_session_factory
        from app.db.models import User, Deadline
        from app.services.notification_service import NotificationService
        from sqlalchemy.orm import joinedload

        SessionLocal = get_session_factory()
        db = SessionLocal()

        try:
            # Get all users with upcoming deadlines
            now = datetime.utcnow()
            upcoming_window = now + timedelta(hours=48)

            deadlines = db.query(Deadline).options(
                joinedload(Deadline.course)
            ).filter(
                Deadline.status != "completed",
                Deadline.due_date >= now,
                Deadline.due_date <= upcoming_window,
            ).all()

            total_reminders = 0
            for deadline in deadlines:
                # Get user preferences for reminder timing
                prefs = NotificationService.get_preferences(db, deadline.user_id)
                reminders = NotificationService.create_deadline_reminders(
                    db,
                    deadline.user_id,
                    deadline,
                    reminder_hours=prefs.deadline_reminder_hours,
                )
                total_reminders += len(reminders)

            if total_reminders > 0:
                logger.info(f"Created {total_reminders} deadline reminders")

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error checking upcoming deadlines: {e}")


@celery_app.task(name='tasks.send_daily_summary')
def send_daily_summary():
    """
    Send morning daily digest notification.
    Runs daily at 7 AM via Celery Beat.
    """
    try:
        from app.db.session import get_session_factory
        from app.db.models import User, Deadline, StudySession
        from app.services.notification_service import NotificationService
        from app.schemas.notification import NotificationCreate

        SessionLocal = get_session_factory()
        db = SessionLocal()

        try:
            now = datetime.utcnow()
            users = db.query(User).all()

            for user in users:
                # Count today's items
                today_start = datetime.combine(now.date(), datetime.min.time())
                today_end = today_start + timedelta(days=1)

                deadlines_due = db.query(Deadline).filter(
                    Deadline.user_id == user.id,
                    Deadline.status != "completed",
                    Deadline.due_date >= today_start,
                    Deadline.due_date < today_end,
                ).count()

                sessions_today = db.query(StudySession).filter(
                    StudySession.user_id == user.id,
                    StudySession.scheduled_start >= today_start,
                    StudySession.scheduled_start < today_end,
                ).count()

                if deadlines_due > 0 or sessions_today > 0:
                    message_parts = []
                    if deadlines_due > 0:
                        message_parts.append(f"{deadlines_due} deadline{'s' if deadlines_due > 1 else ''} due today")
                    if sessions_today > 0:
                        message_parts.append(f"{sessions_today} study session{'s' if sessions_today > 1 else ''} planned")

                    NotificationService.create_notification(
                        db,
                        user.id,
                        NotificationCreate(
                            title="🌅 Daily Study Summary",
                            message=f"Good morning! You have {' and '.join(message_parts)}.",
                            notification_type="system",
                            scheduled_at=now,
                        )
                    )

            logger.info("Daily summaries sent")

        finally:
            db.close()

    except Exception as e:
        logger.error(f"Error sending daily summaries: {e}")


# ── Celery Beat Schedule Configuration ─────────────────────────

celery_app.conf.beat_schedule = {
    'dispatch-notifications-every-minute': {
        'task': 'tasks.dispatch_pending_notifications',
        'schedule': 60.0,  # Every 60 seconds
    },
    'check-deadlines-hourly': {
        'task': 'tasks.check_upcoming_deadlines',
        'schedule': 3600.0,  # Every hour
    },
    'daily-summary-morning': {
        'task': 'tasks.send_daily_summary',
        'schedule': 86400.0,  # Every 24 hours
    },
}

celery_app.conf.timezone = 'UTC'
