"""
AI-powered flashcard generation and spaced repetition service.

Generates flashcards from uploaded documents using the RAG pipeline,
and implements the SM-2 spaced repetition algorithm for review scheduling.
"""

import logging
import json
import math
from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID

from sqlalchemy.orm import Session, joinedload
from app.services.ollama_service import get_ollama_client, get_active_model

from app.core.config import get_settings
from app.db.models import Flashcard, Course

logger = logging.getLogger(__name__)


class FlashcardService:
    """Flashcard management with AI generation and SM-2 spaced repetition — powered by Ollama."""

    def __init__(self):
        self.client = get_ollama_client()
        self.chat_model = get_active_model()
        logger.info(f"Initialized FlashcardService with model: {self.chat_model}")

    # ── CRUD ──────────────────────────────────────────────────────

    def create_flashcard(
        self,
        db: Session,
        user_id: UUID,
        question: str,
        answer: str,
        course_id: Optional[UUID] = None,
        difficulty: int = 1,
        source_doc: Optional[str] = None,
    ) -> Flashcard:
        """Create a single flashcard."""
        flashcard = Flashcard(
            user_id=user_id,
            course_id=course_id,
            question=question,
            answer=answer,
            difficulty=difficulty,
            source_doc=source_doc,
            next_review=datetime.utcnow() + timedelta(days=1),
        )
        db.add(flashcard)
        db.commit()
        db.refresh(flashcard)
        return flashcard

    def get_flashcards(
        self,
        db: Session,
        user_id: UUID,
        course_id: Optional[UUID] = None,
    ) -> List[Flashcard]:
        """Get flashcards with optional course filter."""
        query = db.query(Flashcard).options(
            joinedload(Flashcard.course)
        ).filter(Flashcard.user_id == user_id)

        if course_id:
            query = query.filter(Flashcard.course_id == course_id)

        return query.order_by(Flashcard.created_at.desc()).all()

    def get_due_for_review(self, db: Session, user_id: UUID, limit: int = 20) -> List[Flashcard]:
        """Get flashcards due for review (SM-2 scheduling)."""
        now = datetime.utcnow()
        return db.query(Flashcard).options(
            joinedload(Flashcard.course)
        ).filter(
            Flashcard.user_id == user_id,
            (Flashcard.next_review <= now) | (Flashcard.next_review.is_(None)),
        ).order_by(Flashcard.next_review).limit(limit).all()

    def delete_flashcard(self, db: Session, flashcard_id: UUID, user_id: UUID) -> bool:
        """Delete a flashcard."""
        flashcard = db.query(Flashcard).filter(
            Flashcard.id == flashcard_id,
            Flashcard.user_id == user_id,
        ).first()
        if not flashcard:
            return False
        db.delete(flashcard)
        db.commit()
        return True

    # ── SM-2 Spaced Repetition ────────────────────────────────────

    def review_flashcard(self, db: Session, flashcard_id: UUID, user_id: UUID, quality: int) -> Optional[Flashcard]:
        """
        Review a flashcard with SM-2 algorithm.

        Quality ratings:
            0 - Complete blackout (total failure)
            1 - Incorrect, but upon seeing the answer, remembered
            2 - Incorrect, but upon seeing the answer, "oh yeah"
            3 - Correct with serious difficulty
            4 - Correct with some hesitation
            5 - Perfect recall
        """
        flashcard = db.query(Flashcard).filter(
            Flashcard.id == flashcard_id,
            Flashcard.user_id == user_id,
        ).first()

        if not flashcard:
            return None

        # SM-2 Algorithm
        quality = max(0, min(5, quality))

        if quality >= 3:
            # Correct response
            if flashcard.repetitions == 0:
                flashcard.interval_days = 1
            elif flashcard.repetitions == 1:
                flashcard.interval_days = 6
            else:
                flashcard.interval_days = math.ceil(flashcard.interval_days * flashcard.ease_factor)

            flashcard.repetitions += 1
        else:
            # Incorrect — reset
            flashcard.repetitions = 0
            flashcard.interval_days = 1

        # Update ease factor
        flashcard.ease_factor = max(
            1.3,
            flashcard.ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        )

        # Schedule next review
        flashcard.next_review = datetime.utcnow() + timedelta(days=flashcard.interval_days)
        flashcard.last_reviewed = datetime.utcnow()

        db.commit()
        db.refresh(flashcard)
        logger.debug(f"Reviewed flashcard {flashcard_id}: quality={quality}, next_review={flashcard.next_review}")
        return flashcard

    # ── AI Flashcard Generation ───────────────────────────────────

    def generate_flashcards(
        self,
        db: Session,
        user_id: UUID,
        topic: Optional[str] = None,
        source_document: Optional[str] = None,
        course_id: Optional[UUID] = None,
        count: int = 10,
    ) -> List[Flashcard]:
        """Generate flashcards using AI from document context."""

        # Get relevant chunks from the RAG pipeline
        context_text = ""
        if source_document or topic:
            try:
                from app.services.retrieval_service import RetrievalService
                retrieval = RetrievalService()
                query = topic or f"key concepts from {source_document}"
                chunks = retrieval.retrieve(query, top_k=10)
                if chunks:
                    context_text = "\n\n".join([
                        f"[Source: {c.source}]\n{c.text}" for c in chunks
                    ])
            except Exception as e:
                logger.warning(f"Failed to retrieve context for flashcards: {e}")

        if not context_text:
            context_text = f"Topic: {topic or 'General academic content'}"

        # Generate flashcards with AI
        system_prompt = """You are an expert academic educator. Generate flashcards suitable for spaced repetition study.

Rules:
1. Each flashcard should test ONE concept.
2. Questions should be clear and unambiguous.
3. Answers should be concise but complete.
4. Include a mix of factual recall, conceptual understanding, and application questions.
5. Rate difficulty 1-5 (1=easy recall, 5=complex synthesis).

Return a JSON array:
[
    {"question": "What is...", "answer": "It is...", "difficulty": 2},
    ...
]"""

        user_prompt = f"""Generate {count} flashcards from this academic content:

{context_text}

Return ONLY a valid JSON array, no markdown."""

        try:
            response = self.client.chat.completions.create(
                model=self.chat_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.7,
                max_tokens=800,
            )

            content = response.choices[0].message.content.strip()

            # Strip markdown fences
            if content.startswith("```"):
                content = content.split("\n", 1)[1]
                if content.endswith("```"):
                    content = content[:-3]

            cards_data = json.loads(content)

            created_cards = []
            for card in cards_data[:count]:
                flashcard = self.create_flashcard(
                    db=db,
                    user_id=user_id,
                    question=card.get("question", ""),
                    answer=card.get("answer", ""),
                    course_id=course_id,
                    difficulty=card.get("difficulty", 1),
                    source_doc=source_document,
                )
                created_cards.append(flashcard)

            logger.info(f"Generated {len(created_cards)} flashcards for user {user_id}")
            return created_cards

        except json.JSONDecodeError as e:
            logger.error(f"AI returned invalid JSON for flashcards: {e}")
            return []
        except Exception as e:
            logger.error(f"Error generating flashcards: {e}")
            return []

    # ── Deck Stats ────────────────────────────────────────────────

    def get_deck_stats(self, db: Session, user_id: UUID, course_id: Optional[UUID] = None) -> dict:
        """Get flashcard deck statistics."""
        query = db.query(Flashcard).filter(Flashcard.user_id == user_id)
        if course_id:
            query = query.filter(Flashcard.course_id == course_id)

        cards = query.all()
        now = datetime.utcnow()

        total = len(cards)
        due = sum(1 for c in cards if c.next_review and c.next_review <= now)
        mastered = sum(1 for c in cards if c.repetitions >= 5)
        avg_ease = sum(c.ease_factor for c in cards) / total if total > 0 else 2.5

        course = None
        if course_id:
            course = db.query(Course).filter(Course.id == course_id).first()

        return {
            "course_id": str(course_id) if course_id else None,
            "course_name": course.name if course else None,
            "total_cards": total,
            "due_for_review": due,
            "mastered": mastered,
            "average_ease": round(avg_ease, 2),
        }
