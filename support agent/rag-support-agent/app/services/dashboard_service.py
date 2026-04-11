"""
Dashboard aggregation service.

Collects and aggregates data from deadlines, study sessions, notifications,
and flashcards to populate the dashboard summary cards.
"""

import logging
from datetime import datetime, timedelta, date, time
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

from app.db.models import Deadline, StudySession, Course, Notification, Flashcard, StudyPlan

logger = logging.getLogger(__name__)


class DashboardService:
    """Aggregated dashboard data service."""

    @staticmethod
    def get_dashboard_summary(db: Session, user_id: UUID) -> dict:
        """Get full dashboard summary data."""
        now = datetime.utcnow()
        today_start = datetime.combine(now.date(), time(0, 0, 0))
        today_end = datetime.combine(now.date(), time(23, 59, 59))
        week_start = now - timedelta(days=now.weekday())
        week_end = week_start + timedelta(days=6)

        return {
            "upcoming_deadlines": DashboardService._get_upcoming_deadlines(db, user_id, now),
            "today_tasks": DashboardService._get_today_tasks(db, user_id, today_start, today_end),
            "exam_countdowns": DashboardService._get_exam_countdowns(db, user_id, now),
            "study_progress": DashboardService._get_study_progress(db, user_id, today_start, week_start),
            "weekly_stats": DashboardService._get_weekly_stats(db, user_id, week_start, week_end),
            "course_summary": DashboardService._get_course_summary(db, user_id),
            "notification_count": DashboardService._get_notification_count(db, user_id),
            "flashcard_stats": DashboardService._get_flashcard_stats(db, user_id, now),
        }

    @staticmethod
    def _get_upcoming_deadlines(db: Session, user_id: UUID, now: datetime) -> list:
        """Get next 5 upcoming deadlines."""
        deadlines = db.query(Deadline).options(
            joinedload(Deadline.course)
        ).filter(
            Deadline.user_id == user_id,
            Deadline.status != "completed",
            Deadline.due_date >= now,
        ).order_by(Deadline.due_date).limit(5).all()

        return [
            {
                "id": str(d.id),
                "title": d.title,
                "deadline_type": d.deadline_type,
                "due_date": d.due_date.isoformat(),
                "priority": d.priority,
                "status": d.status,
                "days_until": (d.due_date - now).days,
                "course_name": d.course.name if d.course else None,
                "course_color": d.course.color if d.course else "#0066FF",
            }
            for d in deadlines
        ]

    @staticmethod
    def _get_today_tasks(db: Session, user_id: UUID, today_start: datetime, today_end: datetime) -> list:
        """Get today's study sessions and deadlines."""
        sessions = db.query(StudySession).options(
            joinedload(StudySession.course),
        ).filter(
            StudySession.user_id == user_id,
            StudySession.scheduled_start >= today_start,
            StudySession.scheduled_start <= today_end,
        ).order_by(StudySession.scheduled_start).all()

        tasks = []
        for s in sessions:
            tasks.append({
                "id": str(s.id),
                "type": "study_session",
                "title": s.title,
                "start_time": s.scheduled_start.isoformat(),
                "end_time": s.scheduled_end.isoformat(),
                "status": s.status,
                "course_name": s.course.name if s.course else None,
                "course_color": s.course.color if s.course else "#0066FF",
            })

        # Also add deadlines due today
        deadlines = db.query(Deadline).options(
            joinedload(Deadline.course)
        ).filter(
            Deadline.user_id == user_id,
            Deadline.due_date >= today_start,
            Deadline.due_date <= today_end,
            Deadline.status != "completed",
        ).all()

        for d in deadlines:
            tasks.append({
                "id": str(d.id),
                "type": "deadline",
                "title": f"📅 Due: {d.title}",
                "start_time": d.due_date.isoformat(),
                "end_time": d.due_date.isoformat(),
                "status": d.status,
                "course_name": d.course.name if d.course else None,
                "course_color": d.course.color if d.course else "#FF6C6C",
            })

        tasks.sort(key=lambda x: x["start_time"])
        return tasks

    @staticmethod
    def _get_exam_countdowns(db: Session, user_id: UUID, now: datetime) -> list:
        """Get upcoming exams with countdown."""
        exams = db.query(Deadline).options(
            joinedload(Deadline.course)
        ).filter(
            Deadline.user_id == user_id,
            Deadline.deadline_type == "exam",
            Deadline.status != "completed",
            Deadline.due_date >= now,
        ).order_by(Deadline.due_date).limit(3).all()

        return [
            {
                "id": str(e.id),
                "title": e.title,
                "due_date": e.due_date.isoformat(),
                "days_until": (e.due_date - now).days,
                "hours_until": int((e.due_date - now).total_seconds() / 3600),
                "course_name": e.course.name if e.course else None,
                "course_color": e.course.color if e.course else "#FF6C6C",
            }
            for e in exams
        ]

    @staticmethod
    def _get_study_progress(db: Session, user_id: UUID, today_start: datetime, week_start: datetime) -> dict:
        """Get study completion progress."""
        week_start_dt = datetime.combine(week_start.date() if isinstance(week_start, datetime) else week_start, time(0, 0, 0))

        # This week's sessions
        total_sessions = db.query(StudySession).filter(
            StudySession.user_id == user_id,
            StudySession.scheduled_start >= week_start_dt,
        ).count()

        completed_sessions = db.query(StudySession).filter(
            StudySession.user_id == user_id,
            StudySession.scheduled_start >= week_start_dt,
            StudySession.status == "completed",
        ).count()

        # Completed hours
        completed_time = db.query(
            func.sum(
                func.extract('epoch', StudySession.actual_end - StudySession.actual_start) / 3600
            )
        ).filter(
            StudySession.user_id == user_id,
            StudySession.scheduled_start >= week_start_dt,
            StudySession.status == "completed",
            StudySession.actual_start.isnot(None),
            StudySession.actual_end.isnot(None),
        ).scalar() or 0

        # Deadlines completed this week
        deadlines_total = db.query(Deadline).filter(
            Deadline.user_id == user_id,
            Deadline.due_date >= week_start_dt,
        ).count()

        deadlines_completed = db.query(Deadline).filter(
            Deadline.user_id == user_id,
            Deadline.due_date >= week_start_dt,
            Deadline.status == "completed",
        ).count()

        return {
            "sessions_total": total_sessions,
            "sessions_completed": completed_sessions,
            "session_completion_rate": round(completed_sessions / total_sessions * 100, 1) if total_sessions > 0 else 0,
            "hours_studied": round(float(completed_time), 1),
            "deadlines_total": deadlines_total,
            "deadlines_completed": deadlines_completed,
            "deadline_completion_rate": round(deadlines_completed / deadlines_total * 100, 1) if deadlines_total > 0 else 0,
        }

    @staticmethod
    def _get_weekly_stats(db: Session, user_id: UUID, week_start: datetime, week_end: datetime) -> dict:
        """Get weekly study statistics."""
        week_start_dt = datetime.combine(
            week_start.date() if isinstance(week_start, datetime) else week_start,
            time(0, 0, 0)
        )
        week_end_dt = datetime.combine(
            week_end.date() if isinstance(week_end, datetime) else week_end,
            time(23, 59, 59)
        )

        sessions = db.query(StudySession).filter(
            StudySession.user_id == user_id,
            StudySession.scheduled_start >= week_start_dt,
            StudySession.scheduled_start <= week_end_dt,
        ).all()

        hours_by_day = {}
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        for day in day_names:
            hours_by_day[day] = 0

        for s in sessions:
            day_idx = s.scheduled_start.weekday()
            duration = (s.scheduled_end - s.scheduled_start).total_seconds() / 3600
            hours_by_day[day_names[day_idx]] += duration

        return {
            "hours_by_day": {k: round(v, 1) for k, v in hours_by_day.items()},
            "total_planned_hours": round(sum(hours_by_day.values()), 1),
            "active_courses": db.query(Course).filter(
                Course.user_id == user_id, Course.is_active == True
            ).count(),
        }

    @staticmethod
    def _get_course_summary(db: Session, user_id: UUID) -> list:
        """Get per-course summary."""
        courses = db.query(Course).filter(
            Course.user_id == user_id,
            Course.is_active == True,
        ).all()

        now = datetime.utcnow()
        summaries = []
        for course in courses:
            pending = db.query(Deadline).filter(
                Deadline.course_id == course.id,
                Deadline.status != "completed",
                Deadline.due_date >= now,
            ).count()

            summaries.append({
                "id": str(course.id),
                "name": course.name,
                "code": course.code,
                "color": course.color,
                "pending_deadlines": pending,
            })

        return summaries

    @staticmethod
    def _get_notification_count(db: Session, user_id: UUID) -> int:
        """Get unread notification count."""
        return db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.read_at.is_(None),
            Notification.sent_at.isnot(None),
        ).count()

    @staticmethod
    def _get_flashcard_stats(db: Session, user_id: UUID, now: datetime) -> dict:
        """Get flashcard review stats."""
        total = db.query(Flashcard).filter(Flashcard.user_id == user_id).count()
        due = db.query(Flashcard).filter(
            Flashcard.user_id == user_id,
            Flashcard.next_review <= now,
        ).count()
        mastered = db.query(Flashcard).filter(
            Flashcard.user_id == user_id,
            Flashcard.repetitions >= 5,
        ).count()

        return {
            "total_cards": total,
            "due_for_review": due,
            "mastered": mastered,
        }
