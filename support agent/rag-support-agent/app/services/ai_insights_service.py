"""
AI Insights Engine.

Generates actionable student insights by analyzing real DB data:
- Weak subject detection (low flashcard retention per course)
- Risk alerts (overdue + upcoming high-priority deadlines)
- Focus recommendations (which course needs the most attention)
- Missed deadline warnings
- Study planner optimization tips

All insights are derived from live data — no hardcoded values.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models import (
    Course, Deadline, StudySession, Flashcard, Notification, StudyPlan
)

logger = logging.getLogger(__name__)


class AIInsightsService:
    """Generates data-driven student insights from live database state."""

    @staticmethod
    def get_all_insights(db: Session, user_id: UUID) -> dict:
        """
        Return a full insights payload for the dashboard.

        Structure:
        {
          "weak_subjects": [...],
          "risk_alerts": [...],
          "focus_recommendations": [...],
          "missed_deadlines": [...],
          "planner_tips": [...],
          "generated_at": "ISO datetime"
        }
        """
        now = datetime.utcnow()
        return {
            "weak_subjects": AIInsightsService._weak_subjects(db, user_id),
            "risk_alerts": AIInsightsService._risk_alerts(db, user_id, now),
            "focus_recommendations": AIInsightsService._focus_recommendations(db, user_id, now),
            "missed_deadlines": AIInsightsService._missed_deadlines(db, user_id, now),
            "planner_tips": AIInsightsService._planner_tips(db, user_id, now),
            "generated_at": now.isoformat(),
        }

    # ── Weak Subjects ──────────────────────────────────────────────

    @staticmethod
    def _weak_subjects(db: Session, user_id: UUID) -> list[dict]:
        """
        Detect courses with low flashcard retention.

        A course is "weak" if:
        - it has ≥3 flashcards reviewed AND
        - average ease_factor < 2.0 (SM-2 scale: 1.3–2.5, lower = harder)
        """
        results = (
            db.query(
                Course.id,
                Course.name,
                Course.color,
                Course.code,
                func.count(Flashcard.id).label("card_count"),
                func.avg(Flashcard.ease_factor).label("avg_ease"),
                func.avg(Flashcard.interval_days).label("avg_interval"),
            )
            .join(Flashcard, Flashcard.course_id == Course.id, isouter=True)
            .filter(Course.user_id == user_id, Course.is_active == True)
            .group_by(Course.id, Course.name, Course.color, Course.code)
            .having(func.count(Flashcard.id) >= 3)
            .all()
        )

        weak = []
        for row in results:
            avg_ease = float(row.avg_ease or 2.5)
            if avg_ease < 2.0:
                weak.append({
                    "course_id": str(row.id),
                    "course_name": row.name,
                    "course_code": row.code,
                    "course_color": row.color,
                    "avg_ease_factor": round(avg_ease, 2),
                    "card_count": row.card_count,
                    "avg_interval_days": round(float(row.avg_interval or 1), 1),
                    "insight": f"You're struggling with {row.name}. Consider reviewing more frequently.",
                    "severity": "high" if avg_ease < 1.6 else "medium",
                })

        weak.sort(key=lambda x: x["avg_ease_factor"])
        return weak

    # ── Risk Alerts ────────────────────────────────────────────────

    @staticmethod
    def _risk_alerts(db: Session, user_id: UUID, now: datetime) -> list[dict]:
        """
        Surface high-priority deadlines due within 48 hours with no study sessions planned.
        """
        cutoff = now + timedelta(hours=48)

        urgent = db.query(Deadline).filter(
            Deadline.user_id == user_id,
            Deadline.due_date >= now,
            Deadline.due_date <= cutoff,
            Deadline.status.in_(["pending", "in_progress"]),
            Deadline.priority <= 2,
        ).order_by(Deadline.due_date).all()

        alerts = []
        for dl in urgent:
            hours_left = (dl.due_date - now).total_seconds() / 3600
            # Check if any study sessions are planned for this deadline
            sessions_planned = db.query(StudySession).filter(
                StudySession.deadline_id == dl.id,
                StudySession.scheduled_start >= now,
                StudySession.status == "scheduled",
            ).count()

            severity = "critical" if hours_left < 24 else "warning"
            alerts.append({
                "deadline_id": str(dl.id),
                "title": dl.title,
                "deadline_type": dl.deadline_type,
                "due_date": dl.due_date.isoformat(),
                "hours_until_due": round(hours_left, 1),
                "sessions_planned": sessions_planned,
                "severity": severity,
                "insight": (
                    f"'{dl.title}' is due in {round(hours_left)}h with no study sessions planned!"
                    if sessions_planned == 0
                    else f"'{dl.title}' is due in {round(hours_left)}h — {sessions_planned} session(s) planned."
                ),
            })

        return alerts

    # ── Focus Recommendations ──────────────────────────────────────

    @staticmethod
    def _focus_recommendations(db: Session, user_id: UUID, now: datetime) -> list[dict]:
        """
        Recommend which course to focus on based on:
        - Upcoming deadline pressure (deadlines in next 7 days)
        - Low study time this week relative to deadline count
        """
        week_start = now - timedelta(days=now.weekday())
        next_week = now + timedelta(days=7)

        courses = db.query(Course).filter(
            Course.user_id == user_id,
            Course.is_active == True,
        ).all()

        scored = []
        for course in courses:
            # Upcoming deadline weight
            upcoming = db.query(Deadline).filter(
                Deadline.course_id == course.id,
                Deadline.due_date >= now,
                Deadline.due_date <= next_week,
                Deadline.status != "completed",
            ).count()

            # Study hours this week
            sessions = db.query(StudySession).filter(
                StudySession.course_id == course.id,
                StudySession.user_id == user_id,
                StudySession.scheduled_start >= week_start,
                StudySession.status.in_(["completed", "scheduled"]),
            ).all()
            study_hours = sum(
                (s.scheduled_end - s.scheduled_start).total_seconds() / 3600
                for s in sessions
            )

            # High priority pending deadlines
            critical = db.query(Deadline).filter(
                Deadline.course_id == course.id,
                Deadline.priority == 1,
                Deadline.status != "completed",
                Deadline.due_date >= now,
            ).count()

            # Score: more deadlines + less study time = higher priority
            score = (upcoming * 3) + (critical * 5) - (study_hours * 2)

            if score > 0 or upcoming > 0:
                scored.append({
                    "course_id": str(course.id),
                    "course_name": course.name,
                    "course_code": course.code,
                    "course_color": course.color,
                    "upcoming_deadlines": upcoming,
                    "study_hours_this_week": round(study_hours, 1),
                    "critical_items": critical,
                    "priority_score": round(score, 1),
                    "insight": AIInsightsService._focus_insight(
                        course.name, upcoming, study_hours, critical
                    ),
                })

        scored.sort(key=lambda x: x["priority_score"], reverse=True)
        return scored[:5]  # top 5 recommendations

    @staticmethod
    def _focus_insight(name: str, upcoming: int, hours: float, critical: int) -> str:
        if critical > 0:
            return f"{name} has {critical} critical item(s) — prioritize immediately."
        if upcoming > 2 and hours < 2:
            return f"{name} has {upcoming} deadlines this week but only {hours:.1f}h studied — needs attention."
        if upcoming > 0:
            return f"{name} has {upcoming} upcoming deadline(s) this week."
        return f"Spend more time on {name} to stay on track."

    # ── Missed Deadlines ───────────────────────────────────────────

    @staticmethod
    def _missed_deadlines(db: Session, user_id: UUID, now: datetime) -> list[dict]:
        """
        Return deadlines that are overdue and still not completed.
        """
        overdue = db.query(Deadline).filter(
            Deadline.user_id == user_id,
            Deadline.due_date < now,
            Deadline.status.in_(["pending", "in_progress"]),
        ).order_by(Deadline.due_date.desc()).limit(10).all()

        result = []
        for dl in overdue:
            days_overdue = (now - dl.due_date).days
            result.append({
                "deadline_id": str(dl.id),
                "title": dl.title,
                "deadline_type": dl.deadline_type,
                "due_date": dl.due_date.isoformat(),
                "days_overdue": days_overdue,
                "severity": "critical" if days_overdue > 7 else "warning",
                "insight": f"'{dl.title}' was due {days_overdue} day(s) ago — mark complete or reschedule.",
            })

        return result

    # ── Planner Tips ───────────────────────────────────────────────

    @staticmethod
    def _planner_tips(db: Session, user_id: UUID, now: datetime) -> list[dict]:
        """
        Generate actionable study planner optimization tips based on patterns.
        """
        tips = []
        week_start = now - timedelta(days=now.weekday())

        # Tip 1: Check if user has no study sessions planned this week
        sessions_this_week = db.query(StudySession).filter(
            StudySession.user_id == user_id,
            StudySession.scheduled_start >= week_start,
            StudySession.status == "scheduled",
        ).count()

        if sessions_this_week == 0:
            tips.append({
                "type": "planner",
                "severity": "warning",
                "title": "No study sessions planned",
                "insight": "You have no study sessions scheduled this week. Generate a study plan to stay on track.",
                "action": "generate_plan",
            })

        # Tip 2: Detect study sessions with no deadline link (orphan sessions)
        skipped_count = db.query(StudySession).filter(
            StudySession.user_id == user_id,
            StudySession.scheduled_start >= week_start - timedelta(days=7),
            StudySession.status == "skipped",
        ).count()

        if skipped_count >= 3:
            tips.append({
                "type": "consistency",
                "severity": "medium",
                "title": "Skipped sessions detected",
                "insight": f"You skipped {skipped_count} study sessions last week. Try shorter sessions to build consistency.",
                "action": "adjust_plan",
            })

        # Tip 3: Flashcards due but not reviewed
        overdue_cards = db.query(Flashcard).filter(
            Flashcard.user_id == user_id,
            Flashcard.next_review <= now,
        ).count()

        if overdue_cards >= 10:
            tips.append({
                "type": "flashcards",
                "severity": "medium",
                "title": "Flashcard backlog",
                "insight": f"{overdue_cards} flashcards are due for review. 15 minutes of review now saves hours later.",
                "action": "review_flashcards",
            })

        # Tip 4: No active study plan
        active_plan = db.query(StudyPlan).filter(
            StudyPlan.user_id == user_id,
            StudyPlan.status == "active",
            StudyPlan.week_end >= now.date(),
        ).first()

        if not active_plan:
            tips.append({
                "type": "planner",
                "severity": "info",
                "title": "No active study plan",
                "insight": "Generate a weekly AI study plan to automatically schedule sessions around your deadlines.",
                "action": "generate_plan",
            })

        return tips
