"""
Analytics API routes.

Exposes real DB aggregation endpoints for the student analytics dashboard.
All data is computed live — no hardcoded values.
"""

import logging
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query

from app.db.session import get_db
from app.services.analytics_service import AnalyticsService
from app.services.ai_insights_service import AIInsightsService

logger = logging.getLogger(__name__)
router = APIRouter()

DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001")


def get_user_id() -> UUID:
    return DEFAULT_USER_ID


@router.get("/analytics/overview")
async def analytics_overview(db=Depends(get_db)):
    """
    High-level aggregate stats:
    - active courses, deadline completion rate, total study hours,
      session completion rate (30 days), flashcard mastery rate.
    """
    user_id = get_user_id()
    try:
        return AnalyticsService.get_overview(db, user_id)
    except Exception as e:
        logger.error(f"Analytics overview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/study-hours")
async def analytics_study_hours(
    days: int = Query(default=30, ge=7, le=365),
    group_by: str = Query(default="day", regex="^(day|week|course)$"),
    db=Depends(get_db),
):
    """
    Study hours grouped by day, week, or course.

    Query params:
    - days: lookback window (default 30, max 365)
    - group_by: "day" | "week" | "course"
    """
    user_id = get_user_id()
    try:
        return AnalyticsService.get_study_hours(db, user_id, days=days, group_by=group_by)
    except Exception as e:
        logger.error(f"Analytics study-hours error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/retention")
async def analytics_retention(db=Depends(get_db)):
    """
    Flashcard retention statistics per course and overall.

    Returns SM-2 derived metrics: ease factor, interval days,
    mastery rate, and per-course breakdown.
    """
    user_id = get_user_id()
    try:
        return AnalyticsService.get_retention(db, user_id)
    except Exception as e:
        logger.error(f"Analytics retention error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/streaks")
async def analytics_streaks(db=Depends(get_db)):
    """
    Study streak data: current streak, longest streak (30 days),
    weekly activity, and a 30-day heatmap.
    """
    user_id = get_user_id()
    try:
        return AnalyticsService.get_streaks(db, user_id)
    except Exception as e:
        logger.error(f"Analytics streaks error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/insights")
async def analytics_insights(db=Depends(get_db)):
    """
    AI-generated insights based on live DB state:
    - Weak subjects (low flashcard retention)
    - Risk alerts (urgent deadlines)
    - Focus recommendations (which course needs attention)
    - Missed deadlines
    - Study planner tips
    """
    user_id = get_user_id()
    try:
        return AIInsightsService.get_all_insights(db, user_id)
    except Exception as e:
        logger.error(f"Analytics insights error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ── Course Details ─────────────────────────────────────────────────

@router.get("/courses/{course_id}/details")
async def get_course_details(course_id: UUID, db=Depends(get_db)):
    """
    Full course details:
    - Course metadata + instructor info (including doc-extracted data)
    - Upcoming deadlines
    - Flashcard stats
    - Study progress
    - Linked documents with extracted intelligence
    """
    user_id = get_user_id()
    try:
        result = AnalyticsService.get_course_details(db, course_id, user_id)
        if result is None:
            raise HTTPException(status_code=404, detail="Course not found")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Course details error for {course_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
