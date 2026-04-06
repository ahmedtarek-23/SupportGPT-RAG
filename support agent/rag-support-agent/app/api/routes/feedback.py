from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class FeedbackRequest(BaseModel):
    """Feedback on an answer."""

    query: str
    answer: str
    rating: int  # 1-5 scale
    comment: str | None = None


@router.post("/feedback")
async def submit_feedback(feedback: FeedbackRequest):
    """Submit feedback on an answer."""
    return {
        "message": "Feedback received",
        "feedback_id": "temp-id",
    }
