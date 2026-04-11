"""
AI-powered study planner service.

Uses OpenAI to generate optimized weekly study schedules based on deadlines,
course load, and lecture timetable. Implements intelligent time-blocking.
"""

import logging
import json
from datetime import datetime, timedelta, date, time
from typing import Optional, List
from uuid import UUID

from sqlalchemy.orm import Session, joinedload
from app.services.ollama_service import get_ollama_client, get_active_model

from app.core.config import get_settings
from app.db.models import StudyPlan, StudySession, Deadline, Course, RecurringLecture, Flashcard, Document

logger = logging.getLogger(__name__)


class StudyPlannerService:
    """AI-powered study schedule generator — powered by local Ollama LLM."""

    def __init__(self):
        self.client = get_ollama_client()
        self.chat_model = get_active_model()
        logger.info(f"Initialized StudyPlannerService with model: {self.chat_model}")

    def generate_weekly_plan(
        self,
        db: Session,
        user_id: UUID,
        week_start: Optional[date] = None,
        preferences: Optional[dict] = None,
    ) -> StudyPlan:
        """Generate an AI-powered weekly study plan."""
        if not week_start:
            today = date.today()
            # Find next Monday
            week_start = today - timedelta(days=today.weekday())

        week_end = week_start + timedelta(days=6)

        # Archive any existing active plan for this week
        existing = db.query(StudyPlan).filter(
            StudyPlan.user_id == user_id,
            StudyPlan.week_start == week_start,
            StudyPlan.status == "active",
        ).first()

        if existing:
            existing.status = "archived"
            db.flush()

        # Gather context for AI
        context = self._gather_planning_context(db, user_id, week_start, week_end)

        # Generate plan with AI
        plan_data, reasoning = self._ai_generate_plan(context, preferences or {})

        # Create plan record
        plan = StudyPlan(
            user_id=user_id,
            week_start=week_start,
            week_end=week_end,
            plan_json=plan_data,
            ai_reasoning=reasoning,
            status="active",
        )
        db.add(plan)
        db.flush()

        # Create study sessions from plan blocks
        for block in plan_data.get("blocks", []):
            try:
                session = StudySession(
                    user_id=user_id,
                    plan_id=plan.id,
                    course_id=block.get("course_id"),
                    deadline_id=block.get("deadline_id"),
                    title=block.get("title", "Study Session"),
                    scheduled_start=datetime.fromisoformat(block["start_time"]),
                    scheduled_end=datetime.fromisoformat(block["end_time"]),
                    status="scheduled",
                )
                db.add(session)
            except (KeyError, ValueError) as e:
                logger.warning(f"Skipping invalid study block: {e}")

        db.commit()
        db.refresh(plan)
        logger.info(f"Generated study plan for week {week_start} with {len(plan_data.get('blocks', []))} blocks")
        return plan

    def get_current_plan(self, db: Session, user_id: UUID) -> Optional[StudyPlan]:
        """Get the active study plan for the current week."""
        today = date.today()
        week_start = today - timedelta(days=today.weekday())

        return db.query(StudyPlan).filter(
            StudyPlan.user_id == user_id,
            StudyPlan.week_start == week_start,
            StudyPlan.status == "active",
        ).first()

    def get_study_sessions(
        self,
        db: Session,
        user_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[StudySession]:
        """Get study sessions with optional date range filter."""
        query = db.query(StudySession).options(
            joinedload(StudySession.course),
            joinedload(StudySession.deadline),
        ).filter(StudySession.user_id == user_id)

        if start_date:
            query = query.filter(StudySession.scheduled_start >= start_date)
        if end_date:
            query = query.filter(StudySession.scheduled_end <= end_date)

        return query.order_by(StudySession.scheduled_start).all()

    def update_session_status(
        self,
        db: Session,
        session_id: UUID,
        user_id: UUID,
        status: str,
        actual_start: Optional[datetime] = None,
        actual_end: Optional[datetime] = None,
        notes: Optional[str] = None,
    ) -> Optional[StudySession]:
        """Update a study session's status."""
        session = db.query(StudySession).filter(
            StudySession.id == session_id,
            StudySession.user_id == user_id,
        ).first()

        if not session:
            return None

        session.status = status
        if actual_start:
            session.actual_start = actual_start
        if actual_end:
            session.actual_end = actual_end
        if notes:
            session.notes = notes

        # Auto-set start/end based on status
        now = datetime.utcnow()
        if status == "active" and not session.actual_start:
            session.actual_start = now
        elif status == "completed" and not session.actual_end:
            session.actual_end = now

        db.commit()
        db.refresh(session)
        return session

    def get_workload_summary(self, db: Session, user_id: UUID) -> dict:
        """Analyze workload balance for the current week."""
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end_dt = datetime.combine(week_start + timedelta(days=6), time(23, 59, 59))
        week_start_dt = datetime.combine(week_start, time(0, 0, 0))

        sessions = self.get_study_sessions(db, user_id, week_start_dt, week_end_dt)
        deadlines = db.query(Deadline).filter(
            Deadline.user_id == user_id,
            Deadline.status != "completed",
            Deadline.due_date >= week_start_dt,
            Deadline.due_date <= week_end_dt + timedelta(days=7),  # Include next week
        ).all()

        # Calculate hours by day and course
        hours_by_day = {i: 0.0 for i in range(7)}
        hours_by_course = {}

        for session in sessions:
            duration = (session.scheduled_end - session.scheduled_start).total_seconds() / 3600
            day_index = session.scheduled_start.weekday()
            hours_by_day[day_index] += duration

            course_name = session.course.name if session.course else "General"
            hours_by_course[course_name] = hours_by_course.get(course_name, 0) + duration

        total_hours = sum(hours_by_day.values())
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        busiest_day_idx = max(hours_by_day, key=hours_by_day.get)
        lightest_day_idx = min(hours_by_day, key=hours_by_day.get)

        # Balance score: 100 = perfectly even, 0 = all study on one day
        if total_hours > 0:
            ideal_per_day = total_hours / 7
            deviation = sum(abs(h - ideal_per_day) for h in hours_by_day.values())
            balance_score = max(0, 100 - (deviation / total_hours * 100))
        else:
            balance_score = 100.0

        suggestions = []
        if total_hours < 10:
            suggestions.append("Consider adding more study time — you have fewer than 10 hours planned.")
        if total_hours > 50:
            suggestions.append("Your schedule looks heavy. Consider deferring less urgent tasks.")
        if hours_by_day.get(5, 0) + hours_by_day.get(6, 0) > total_hours * 0.5 and total_hours > 0:
            suggestions.append("Most study is on weekends. Try distributing across weekdays.")
        if len(deadlines) > 3:
            suggestions.append(f"You have {len(deadlines)} deadlines in the next 2 weeks. Prioritize critical ones.")

        return {
            "total_hours_this_week": round(total_hours, 1),
            "hours_by_course": {k: round(v, 1) for k, v in hours_by_course.items()},
            "busiest_day": day_names[busiest_day_idx],
            "lightest_day": day_names[lightest_day_idx],
            "balance_score": round(balance_score, 1),
            "suggestions": suggestions,
        }

    # ── Private Helpers ───────────────────────────────────────────

    def _gather_planning_context(
        self,
        db: Session,
        user_id: UUID,
        week_start: date,
        week_end: date,
    ) -> dict:
        """Gather all relevant data for AI plan generation."""
        week_start_dt = datetime.combine(week_start, time(0, 0, 0))
        week_end_dt = datetime.combine(week_end, time(23, 59, 59))

        # Get active courses with lectures
        courses = db.query(Course).options(
            joinedload(Course.lectures)
        ).filter(
            Course.user_id == user_id,
            Course.is_active == True,
        ).all()

        # Get upcoming deadlines (within 2 weeks)
        deadlines = db.query(Deadline).options(
            joinedload(Deadline.course)
        ).filter(
            Deadline.user_id == user_id,
            Deadline.status != "completed",
            Deadline.due_date >= week_start_dt,
            Deadline.due_date <= week_end_dt + timedelta(days=14),
        ).order_by(Deadline.due_date).all()

        context = {
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "courses": [],
            "deadlines": [],
            "blocked_times": [],  # Lecture slots
        }

        for course in courses:
            context["courses"].append({
                "id": str(course.id),
                "name": course.name,
                "code": course.code,
            })
            for lecture in course.lectures:
                if lecture.is_active:
                    context["blocked_times"].append({
                        "course": course.name,
                        "day_of_week": lecture.day_of_week,
                        "start_time": lecture.start_time.isoformat(),
                        "end_time": lecture.end_time.isoformat(),
                        "type": lecture.lecture_type,
                    })

        for deadline in deadlines:
            context["deadlines"].append({
                "id": str(deadline.id),
                "title": deadline.title,
                "course": deadline.course.name if deadline.course else None,
                "course_id": str(deadline.course_id) if deadline.course_id else None,
                "type": deadline.deadline_type,
                "due_date": deadline.due_date.isoformat(),
                "priority": deadline.priority,
                "estimated_hours": deadline.estimated_hours,
            })

        # Weak flashcard topics — drive revision sessions
        weak_cards = db.query(Flashcard).filter(
            Flashcard.user_id == user_id,
            Flashcard.ease_factor < 2.0,
            Flashcard.repetitions >= 1,
        ).limit(10).all()
        context["weak_topics"] = [
            {"topic": (c.question or "").strip()[:60], "ease_factor": round(c.ease_factor, 2)}
            for c in weak_cards
        ]

        # Recent completed documents — provide content context
        recent_docs = db.query(Document).filter(
            Document.user_id == user_id,
            Document.status == "completed",
        ).order_by(Document.created_at.desc()).limit(5).all()
        context["recent_documents"] = [
            {"title": d.extracted_title or d.filename, "summary": (d.extracted_summary or "")[:120]}
            for d in recent_docs
        ]

        return context

    def _ai_generate_plan(self, context: dict, preferences: dict) -> tuple:
        """Use OpenAI to generate an optimized study plan."""
        system_prompt = """You are an expert academic study planner. Generate an optimized weekly study schedule.

Rules:
1. Never schedule study during lecture/class times (blocked_times).
2. Prioritize deadlines by urgency (priority 1 = critical, due soon = urgent).
3. Distribute study evenly across available days.
4. Include breaks — no study block longer than 2 hours without a break.
5. Prefer morning/afternoon slots (8am-8pm) unless user specifies otherwise.
6. Allocate more time to harder/higher-priority tasks.
7. Include exam prep for upcoming exams.
8. If weak_topics are provided, schedule dedicated revision sessions for those topics.
9. If recent_documents are provided, reference their content when naming study sessions.

Return a JSON object with this structure:
{
    "blocks": [
        {
            "title": "Study: Data Structures - Assignment 3",
            "course_id": "uuid or null",
            "deadline_id": "uuid or null",
            "start_time": "2026-04-08T09:00:00",
            "end_time": "2026-04-08T11:00:00",
            "priority": 1,
            "study_type": "assignment"
        }
    ],
    "daily_summary": {
        "Monday": "Focus on CS201 assignment (due Wed)",
        "Tuesday": "Math review + CS lab prep"
    },
    "total_study_hours": 20
}"""

        user_prompt = f"""Generate a study plan for this week.

Context:
{json.dumps(context, indent=2)}

User preferences:
{json.dumps(preferences, indent=2)}

Return ONLY valid JSON, no markdown code fences."""

        try:
            response = self.client.chat.completions.create(
                model=self.chat_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=1200,
                timeout=60,
            )

            content = response.choices[0].message.content.strip()

            # Strip markdown fences if present
            if content.startswith("```"):
                content = content.split("\n", 1)[1]
                if content.endswith("```"):
                    content = content[:-3]

            plan_data = json.loads(content)
            reasoning = plan_data.pop("daily_summary", {})
            reasoning_text = "\n".join(f"**{day}**: {desc}" for day, desc in reasoning.items())

            return plan_data, reasoning_text

        except json.JSONDecodeError as e:
            logger.error(f"AI returned invalid JSON: {e}")
            # Return empty plan
            return {"blocks": [], "total_study_hours": 0}, "Failed to generate plan — AI returned invalid format."

        except Exception as e:
            logger.error(f"Error generating study plan: {e}")
            return {"blocks": [], "total_study_hours": 0}, f"Error: {str(e)}"
