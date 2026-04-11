"""Pydantic schemas for AI-generated flashcards."""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class FlashcardCreate(BaseModel):
    """Manually create a flashcard."""
    course_id: Optional[UUID] = None
    question: str
    answer: str
    difficulty: int = Field(default=1, ge=1, le=5)


class FlashcardGenerate(BaseModel):
    """Request AI to generate flashcards from documents."""
    course_id: Optional[UUID] = None
    source_document: Optional[str] = None
    topic: Optional[str] = None
    count: int = Field(default=10, ge=1, le=50)


class FlashcardResponse(BaseModel):
    """Flashcard response."""
    id: UUID
    user_id: UUID
    course_id: Optional[UUID] = None
    question: str
    answer: str
    source_doc: Optional[str] = None
    difficulty: int
    ease_factor: float
    interval_days: int
    repetitions: int
    next_review: Optional[datetime] = None
    last_reviewed: Optional[datetime] = None
    created_at: datetime
    course_name: Optional[str] = None

    class Config:
        from_attributes = True


class FlashcardReview(BaseModel):
    """Submit a review rating for a flashcard."""
    quality: int = Field(
        ..., ge=0, le=5,
        description="SM-2 quality rating: 0=complete blackout, 5=perfect recall"
    )


class FlashcardDeckResponse(BaseModel):
    """Flashcard deck summary."""
    course_id: Optional[UUID] = None
    course_name: Optional[str] = None
    total_cards: int
    due_for_review: int
    mastered: int  # cards with repetitions >= 5
    flashcards: List[FlashcardResponse] = []


class ReviewSessionResponse(BaseModel):
    """Review session results."""
    cards_reviewed: int
    correct: int
    incorrect: int
    average_ease: float
    next_review_date: Optional[datetime] = None
