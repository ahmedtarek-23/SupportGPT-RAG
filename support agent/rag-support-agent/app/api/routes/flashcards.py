"""
API routes for flashcard management and AI generation.
"""

import logging
from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from uuid import UUID

from app.db.session import get_db
from app.services.flashcard_service import FlashcardService
from app.schemas.flashcard import (
    FlashcardCreate, FlashcardGenerate, FlashcardResponse,
    FlashcardReview, FlashcardDeckResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Default user ID for MVP
DEFAULT_USER_ID = UUID("00000000-0000-0000-0000-000000000001")
flashcard_service = FlashcardService()


def get_user_id() -> UUID:
    return DEFAULT_USER_ID


@router.post("/flashcards", response_model=FlashcardResponse, status_code=201)
async def create_flashcard(data: FlashcardCreate, db=Depends(get_db)):
    """Create a flashcard manually."""
    user_id = get_user_id()
    flashcard = flashcard_service.create_flashcard(
        db, user_id,
        question=data.question,
        answer=data.answer,
        course_id=data.course_id,
        difficulty=data.difficulty,
    )
    return flashcard


@router.post("/flashcards/generate")
async def generate_flashcards(data: FlashcardGenerate, db=Depends(get_db)):
    """Generate flashcards using AI from documents."""
    try:
        user_id = get_user_id()
        cards = flashcard_service.generate_flashcards(
            db, user_id,
            topic=data.topic,
            source_document=data.source_document,
            course_id=data.course_id,
            count=data.count,
        )
        return {
            "generated": len(cards),
            "flashcards": [
                {
                    "id": str(c.id),
                    "question": c.question,
                    "answer": c.answer,
                    "difficulty": c.difficulty,
                    "source_doc": c.source_doc,
                }
                for c in cards
            ],
        }
    except Exception as e:
        logger.error(f"Error generating flashcards: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/flashcards")
async def list_flashcards(course_id: Optional[UUID] = None, db=Depends(get_db)):
    """List flashcards with optional course filter."""
    user_id = get_user_id()
    cards = flashcard_service.get_flashcards(db, user_id, course_id)
    return [
        {
            "id": str(c.id),
            "question": c.question,
            "answer": c.answer,
            "difficulty": c.difficulty,
            "ease_factor": c.ease_factor,
            "interval_days": c.interval_days,
            "repetitions": c.repetitions,
            "next_review": c.next_review.isoformat() if c.next_review else None,
            "last_reviewed": c.last_reviewed.isoformat() if c.last_reviewed else None,
            "source_doc": c.source_doc,
            "course_name": c.course.name if c.course else None,
            "created_at": c.created_at.isoformat(),
        }
        for c in cards
    ]


@router.get("/flashcards/review")
async def get_review_queue(limit: int = 20, db=Depends(get_db)):
    """Get flashcards due for review."""
    user_id = get_user_id()
    cards = flashcard_service.get_due_for_review(db, user_id, limit)
    return {
        "due_count": len(cards),
        "flashcards": [
            {
                "id": str(c.id),
                "question": c.question,
                "answer": c.answer,
                "difficulty": c.difficulty,
                "repetitions": c.repetitions,
                "course_name": c.course.name if c.course else None,
            }
            for c in cards
        ],
    }


@router.post("/flashcards/{flashcard_id}/review")
async def review_flashcard(flashcard_id: UUID, data: FlashcardReview, db=Depends(get_db)):
    """Submit a review for a flashcard (SM-2 rating)."""
    user_id = get_user_id()
    card = flashcard_service.review_flashcard(db, flashcard_id, user_id, data.quality)
    if not card:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    return {
        "message": "Review recorded",
        "next_review": card.next_review.isoformat() if card.next_review else None,
        "interval_days": card.interval_days,
        "ease_factor": round(card.ease_factor, 2),
        "repetitions": card.repetitions,
    }


@router.delete("/flashcards/{flashcard_id}")
async def delete_flashcard(flashcard_id: UUID, db=Depends(get_db)):
    """Delete a flashcard."""
    user_id = get_user_id()
    if not flashcard_service.delete_flashcard(db, flashcard_id, user_id):
        raise HTTPException(status_code=404, detail="Flashcard not found")
    return {"message": "Flashcard deleted"}


@router.get("/flashcards/stats")
async def get_flashcard_stats(course_id: Optional[UUID] = None, db=Depends(get_db)):
    """Get flashcard deck statistics."""
    user_id = get_user_id()
    return flashcard_service.get_deck_stats(db, user_id, course_id)


@router.get("/flashcards/weak-topics")
async def get_weak_topics(db=Depends(get_db)):
    """
    Return topics where the student is struggling (ease_factor < 2.0).
    Used by the Study Planner to prioritize study sessions.
    """
    from app.db.models import Flashcard, Course
    from sqlalchemy import func

    user_id = get_user_id()

    # Cards with low ease_factor grouped by course
    weak_cards = (
        db.query(Flashcard)
        .filter(
            Flashcard.user_id == user_id,
            Flashcard.ease_factor < 2.0,
            Flashcard.repetitions >= 1,
        )
        .all()
    )

    # Build topic list: use question text as topic proxy (first 60 chars)
    seen: set[str] = set()
    topics = []
    for card in weak_cards:
        topic = (card.question or "").strip()[:60]
        if topic and topic not in seen:
            seen.add(topic)
            topics.append({
                "topic": topic,
                "ease_factor": round(card.ease_factor, 2),
                "course_id": str(card.course_id) if card.course_id else None,
            })

    return topics[:10]

