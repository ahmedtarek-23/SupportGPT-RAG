"""
API routes for the AI study planner.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from uuid import UUID
from datetime import datetime

from app.db.session import get_db
from app.services.study_planner_service import StudyPlannerService
from app.schemas.planner import (
    StudyPlanGenerate, StudyPlanResponse, StudySessionUpdate,
    StudySessionResponse, WorkloadSummary,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Default user ID for MVP
DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
planner = StudyPlannerService()


def get_user_id() -> UUID:
    return DEFAULT_USER_ID


@router.post("/planner/generate")
async def generate_plan(data: StudyPlanGenerate, db=Depends(get_db)):
    """Generate a new AI study plan for the week."""
    try:
        user_id = get_user_id()
        plan = planner.generate_weekly_plan(
            db, user_id,
            week_start=data.week_start,
            preferences=data.preferences,
        )
        return {
            "id": str(plan.id),
            "week_start": plan.week_start.isoformat(),
            "week_end": plan.week_end.isoformat(),
            "status": plan.status,
            "ai_reasoning": plan.ai_reasoning,
            "blocks": plan.plan_json.get("blocks", []),
            "total_study_hours": plan.plan_json.get("total_study_hours", 0),
            "created_at": plan.created_at.isoformat(),
        }
    except Exception as e:
        logger.error(f"Error generating study plan: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/planner/current")
async def get_current_plan(db=Depends(get_db)):
    """Get the active study plan for the current week."""
    user_id = get_user_id()
    plan = planner.get_current_plan(db, user_id)
    if not plan:
        return {"message": "No active plan for this week", "plan": None}

    return {
        "id": str(plan.id),
        "week_start": plan.week_start.isoformat(),
        "week_end": plan.week_end.isoformat(),
        "status": plan.status,
        "ai_reasoning": plan.ai_reasoning,
        "blocks": plan.plan_json.get("blocks", []),
        "total_study_hours": plan.plan_json.get("total_study_hours", 0),
        "created_at": plan.created_at.isoformat(),
    }


@router.get("/planner/sessions")
async def get_study_sessions(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db=Depends(get_db),
):
    """Get study sessions with optional date filter."""
    user_id = get_user_id()
    start = datetime.fromisoformat(start_date) if start_date else None
    end = datetime.fromisoformat(end_date) if end_date else None

    sessions = planner.get_study_sessions(db, user_id, start, end)
    return [
        {
            "id": str(s.id),
            "title": s.title,
            "scheduled_start": s.scheduled_start.isoformat(),
            "scheduled_end": s.scheduled_end.isoformat(),
            "actual_start": s.actual_start.isoformat() if s.actual_start else None,
            "actual_end": s.actual_end.isoformat() if s.actual_end else None,
            "status": s.status,
            "notes": s.notes,
            "course_name": s.course.name if s.course else None,
            "course_color": s.course.color if s.course else None,
        }
        for s in sessions
    ]


@router.put("/planner/sessions/{session_id}")
async def update_session(session_id: UUID, data: StudySessionUpdate, db=Depends(get_db)):
    """Update a study session status."""
    user_id = get_user_id()
    session = planner.update_session_status(
        db, session_id, user_id,
        status=data.status or "completed",
        actual_start=data.actual_start,
        actual_end=data.actual_end,
        notes=data.notes,
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"message": "Session updated", "status": session.status}


@router.get("/planner/workload", response_model=WorkloadSummary)
async def get_workload(db=Depends(get_db)):
    """Get workload analysis for the current week."""
    user_id = get_user_id()
    return planner.get_workload_summary(db, user_id)
