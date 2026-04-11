"""
Analytics Service.

Real DB aggregation for student analytics — no hardcoded values.
Covers: overview stats, study hours per day/week/course,
flashcard retention rates, and study streak calculation.
"""

import logging
from datetime import datetime, timedelta, date
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from app.db.models import (
    Course, Deadline, StudySession, Flashcard, Notification
)

logger = logging.getLogger(__name__)


class AnalyticsService:

    # ── Overview ───────────────────────────────────────────────────

    @staticmethod
    def get_overview(db: Session, user_id: UUID) -> dict:
        """
        High-level aggregate stats for the analytics overview card.
        """
        now = datetime.utcnow()
        thirty_days_ago = now - timedelta(days=30)

        total_courses = db.query(Course).filter(
            Course.user_id == user_id, Course.is_active == True
        ).count()

        total_deadlines = db.query(Deadline).filter(
            Deadline.user_id == user_id
        ).count()

        completed_deadlines = db.query(Deadline).filter(
            Deadline.user_id == user_id,
            Deadline.status == "completed",
        ).count()

        overdue_deadlines = db.query(Deadline).filter(
            Deadline.user_id == user_id,
            Deadline.due_date < now,
            Deadline.status.in_(["pending", "in_progress"]),
        ).count()

        # Total study hours (completed sessions only)
        total_hours_result = db.query(
            func.sum(
                func.extract("epoch", StudySession.actual_end - StudySession.actual_start) / 3600
            )
        ).filter(
            StudySession.user_id == user_id,
            StudySession.status == "completed",
            StudySession.actual_start.isnot(None),
            StudySession.actual_end.isnot(None),
        ).scalar()
        total_hours = round(float(total_hours_result or 0), 1)

        # Sessions last 30 days
        sessions_30d = db.query(StudySession).filter(
            StudySession.user_id == user_id,
            StudySession.scheduled_start >= thirty_days_ago,
        ).count()

        completed_sessions_30d = db.query(StudySession).filter(
            StudySession.user_id == user_id,
            StudySession.scheduled_start >= thirty_days_ago,
            StudySession.status == "completed",
        ).count()

        # Flashcard stats
        total_flashcards = db.query(Flashcard).filter(
            Flashcard.user_id == user_id
        ).count()

        mastered_flashcards = db.query(Flashcard).filter(
            Flashcard.user_id == user_id,
            Flashcard.repetitions >= 5,
        ).count()

        return {
            "courses": {
                "total_active": total_courses,
            },
            "deadlines": {
                "total": total_deadlines,
                "completed": completed_deadlines,
                "overdue": overdue_deadlines,
                "completion_rate": round(
                    completed_deadlines / total_deadlines * 100, 1
                ) if total_deadlines > 0 else 0,
            },
            "study_time": {
                "total_hours_all_time": total_hours,
            },
            "sessions_30d": {
                "total": sessions_30d,
                "completed": completed_sessions_30d,
                "completion_rate": round(
                    completed_sessions_30d / sessions_30d * 100, 1
                ) if sessions_30d > 0 else 0,
            },
            "flashcards": {
                "total": total_flashcards,
                "mastered": mastered_flashcards,
                "mastery_rate": round(
                    mastered_flashcards / total_flashcards * 100, 1
                ) if total_flashcards > 0 else 0,
            },
        }

    # ── Study Hours ────────────────────────────────────────────────

    @staticmethod
    def get_study_hours(
        db: Session,
        user_id: UUID,
        days: int = 30,
        group_by: str = "day",
    ) -> dict:
        """
        Return study hours aggregated by day, week, or course.

        Args:
            days: lookback window
            group_by: "day" | "week" | "course"
        """
        cutoff = datetime.utcnow() - timedelta(days=days)

        sessions = db.query(StudySession).filter(
            StudySession.user_id == user_id,
            StudySession.scheduled_start >= cutoff,
        ).all()

        if group_by == "day":
            return AnalyticsService._hours_by_day(sessions, days)
        elif group_by == "week":
            return AnalyticsService._hours_by_week(sessions)
        elif group_by == "course":
            return AnalyticsService._hours_by_course(db, sessions, user_id)
        else:
            return AnalyticsService._hours_by_day(sessions, days)

    @staticmethod
    def _hours_by_day(sessions: list, days: int) -> dict:
        today = date.today()
        data = {}
        for i in range(days - 1, -1, -1):
            d = today - timedelta(days=i)
            data[d.isoformat()] = 0.0

        for s in sessions:
            day_key = s.scheduled_start.date().isoformat()
            if day_key in data:
                duration = (s.scheduled_end - s.scheduled_start).total_seconds() / 3600
                data[day_key] += duration

        labels = list(data.keys())
        values = [round(v, 2) for v in data.values()]
        total = round(sum(values), 1)

        return {
            "group_by": "day",
            "labels": labels,
            "values": values,
            "total_hours": total,
            "avg_per_day": round(total / max(days, 1), 2),
        }

    @staticmethod
    def _hours_by_week(sessions: list) -> dict:
        data: dict[str, float] = {}

        for s in sessions:
            # ISO week: "2026-W14"
            week_key = s.scheduled_start.strftime("%Y-W%V")
            duration = (s.scheduled_end - s.scheduled_start).total_seconds() / 3600
            data[week_key] = data.get(week_key, 0.0) + duration

        sorted_weeks = sorted(data.items())
        labels = [k for k, _ in sorted_weeks]
        values = [round(v, 2) for _, v in sorted_weeks]

        return {
            "group_by": "week",
            "labels": labels,
            "values": values,
            "total_hours": round(sum(values), 1),
        }

    @staticmethod
    def _hours_by_course(db: Session, sessions: list, user_id: UUID) -> dict:
        course_hours: dict[str, float] = {}
        course_meta: dict[str, dict] = {}

        for s in sessions:
            if s.course_id:
                cid = str(s.course_id)
                duration = (s.scheduled_end - s.scheduled_start).total_seconds() / 3600
                course_hours[cid] = course_hours.get(cid, 0.0) + duration

        # Fetch course names/colors
        if course_hours:
            courses = db.query(Course).filter(
                Course.id.in_(list(course_hours.keys()))
            ).all()
            for c in courses:
                course_meta[str(c.id)] = {"name": c.name, "color": c.color, "code": c.code}

        result = []
        for cid, hours in course_hours.items():
            meta = course_meta.get(cid, {"name": "Unknown", "color": "#0066FF", "code": None})
            result.append({
                "course_id": cid,
                "course_name": meta["name"],
                "course_code": meta["code"],
                "course_color": meta["color"],
                "hours": round(hours, 2),
            })

        result.sort(key=lambda x: x["hours"], reverse=True)
        return {
            "group_by": "course",
            "courses": result,
            "total_hours": round(sum(course_hours.values()), 1),
        }

    # ── Retention ──────────────────────────────────────────────────

    @staticmethod
    def get_retention(db: Session, user_id: UUID) -> dict:
        """
        Flashcard retention statistics per course and overall.

        SM-2 ease_factor: 2.5 = mastered, 1.3 = struggling
        interval_days: longer = better retained
        """
        courses = db.query(Course).filter(
            Course.user_id == user_id, Course.is_active == True
        ).all()

        total_cards = 0
        total_mastered = 0
        per_course = []

        for course in courses:
            cards = db.query(Flashcard).filter(
                Flashcard.user_id == user_id,
                Flashcard.course_id == course.id,
            ).all()

            if not cards:
                continue

            reviewed = [c for c in cards if c.repetitions > 0]
            mastered = [c for c in cards if c.repetitions >= 5]
            avg_ease = sum(c.ease_factor for c in reviewed) / len(reviewed) if reviewed else 2.5
            avg_interval = sum(c.interval_days for c in reviewed) / len(reviewed) if reviewed else 1

            retention_pct = round(len(mastered) / len(cards) * 100, 1) if cards else 0

            per_course.append({
                "course_id": str(course.id),
                "course_name": course.name,
                "course_code": course.code,
                "course_color": course.color,
                "total_cards": len(cards),
                "reviewed_cards": len(reviewed),
                "mastered_cards": len(mastered),
                "retention_pct": retention_pct,
                "avg_ease_factor": round(avg_ease, 2),
                "avg_interval_days": round(avg_interval, 1),
            })

            total_cards += len(cards)
            total_mastered += len(mastered)

        per_course.sort(key=lambda x: x["retention_pct"])

        overall_retention = round(total_mastered / total_cards * 100, 1) if total_cards > 0 else 0

        return {
            "overall_retention_pct": overall_retention,
            "total_cards": total_cards,
            "total_mastered": total_mastered,
            "per_course": per_course,
        }

    # ── Streaks ────────────────────────────────────────────────────

    @staticmethod
    def get_streaks(db: Session, user_id: UUID) -> dict:
        """
        Calculate study streaks.

        A streak day = any day with at least one completed or scheduled study session.
        Returns current streak, longest streak, and a 30-day heatmap.
        """
        today = date.today()
        thirty_days_ago = today - timedelta(days=29)

        sessions = db.query(StudySession).filter(
            StudySession.user_id == user_id,
            StudySession.scheduled_start >= datetime.combine(thirty_days_ago, datetime.min.time()),
        ).all()

        # Build active days set
        active_days: set[date] = set()
        for s in sessions:
            active_days.add(s.scheduled_start.date())

        # 30-day heatmap
        heatmap = {}
        for i in range(30):
            d = today - timedelta(days=i)
            heatmap[d.isoformat()] = 1 if d in active_days else 0

        # Current streak (backwards from today)
        current_streak = 0
        check_day = today
        while check_day in active_days:
            current_streak += 1
            check_day -= timedelta(days=1)

        # Longest streak in the 30-day window
        longest_streak = 0
        run = 0
        for i in range(29, -1, -1):
            d = today - timedelta(days=i)
            if d in active_days:
                run += 1
                longest_streak = max(longest_streak, run)
            else:
                run = 0

        # Days studied this week
        week_start = today - timedelta(days=today.weekday())
        days_this_week = sum(
            1 for i in range(7)
            if (week_start + timedelta(days=i)) in active_days
        )

        return {
            "current_streak": current_streak,
            "longest_streak_30d": longest_streak,
            "days_studied_this_week": days_this_week,
            "total_active_days_30d": len(active_days),
            "heatmap": dict(sorted(heatmap.items())),
        }

    # ── Course Details ─────────────────────────────────────────────

    @staticmethod
    def get_course_details(db: Session, course_id: UUID, user_id: UUID) -> Optional[dict]:
        """
        Merged course details: course info, instructor metadata,
        documents, deadlines, flashcards, and progress stats.
        """
        course = db.query(Course).filter(
            Course.id == course_id,
            Course.user_id == user_id,
        ).first()

        if not course:
            return None

        now = datetime.utcnow()

        # Deadlines
        deadlines = db.query(Deadline).filter(
            Deadline.course_id == course_id,
            Deadline.status != "completed",
            Deadline.due_date >= now,
        ).order_by(Deadline.due_date).limit(10).all()

        # Flashcards
        total_cards = db.query(Flashcard).filter(
            Flashcard.course_id == course_id,
        ).count()
        mastered_cards = db.query(Flashcard).filter(
            Flashcard.course_id == course_id,
            Flashcard.repetitions >= 5,
        ).count()
        due_cards = db.query(Flashcard).filter(
            Flashcard.course_id == course_id,
            Flashcard.next_review <= now,
        ).count()

        # Study hours
        sessions = db.query(StudySession).filter(
            StudySession.course_id == course_id,
            StudySession.user_id == user_id,
        ).all()
        total_study_hours = sum(
            (s.scheduled_end - s.scheduled_start).total_seconds() / 3600
            for s in sessions
        )
        completed_sessions = sum(1 for s in sessions if s.status == "completed")

        # Documents — imported inside to avoid circular dependency if needed
        try:
            from app.db.models import Document
            documents = db.query(Document).filter(
                Document.course_id == course_id,
            ).order_by(Document.created_at.desc()).all()
            docs_data = [
                {
                    "id": str(d.id),
                    "filename": d.original_filename,
                    "document_type": d.document_type,
                    "status": d.status,
                    "extracted_title": d.extracted_title,
                    "extracted_summary": d.extracted_summary,
                    "created_at": d.created_at.isoformat(),
                }
                for d in documents
            ]
        except Exception:
            docs_data = []

        return {
            "course": {
                "id": str(course.id),
                "name": course.name,
                "code": course.code,
                "color": course.color,
                "semester": course.semester,
                "is_active": course.is_active,
            },
            "instructor": {
                "name": course.instructor_name or course.instructor,
                "email": course.instructor_email,
                "office_hours": course.instructor_office_hours or [],
                "notes": course.instructor_notes,
                "extracted_from_document": course.extracted_from_document,
            },
            "upcoming_deadlines": [
                {
                    "id": str(d.id),
                    "title": d.title,
                    "deadline_type": d.deadline_type,
                    "due_date": d.due_date.isoformat(),
                    "days_until": (d.due_date - now).days,
                    "priority": d.priority,
                    "status": d.status,
                }
                for d in deadlines
            ],
            "flashcards": {
                "total": total_cards,
                "mastered": mastered_cards,
                "due_for_review": due_cards,
                "mastery_rate": round(mastered_cards / total_cards * 100, 1) if total_cards > 0 else 0,
            },
            "study_progress": {
                "total_hours": round(total_study_hours, 1),
                "total_sessions": len(sessions),
                "completed_sessions": completed_sessions,
                "completion_rate": round(
                    completed_sessions / len(sessions) * 100, 1
                ) if sessions else 0,
            },
            "documents": docs_data,
        }
