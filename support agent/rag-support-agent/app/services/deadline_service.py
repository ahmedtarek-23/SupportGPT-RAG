"""
Deadline management service for courses, assignments, exams, and lectures.

Provides full CRUD operations for the university scheduling system.
"""

import logging
from datetime import datetime, timedelta, time
from typing import Optional, List
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.db.models import Course, Deadline, RecurringLecture, User
from app.schemas.deadline import (
    CourseCreate, CourseUpdate, CourseResponse,
    DeadlineCreate, DeadlineUpdate, DeadlineResponse,
    LectureSlotCreate, LectureSlotResponse,
)

logger = logging.getLogger(__name__)


class DeadlineService:
    """Service for managing courses, deadlines, and recurring lectures."""

    # ── User Management (lightweight) ─────────────────────────────

    @staticmethod
    def get_or_create_user(db: Session, user_id: UUID, email: str = "student@university.edu", display_name: str = "Student") -> User:
        """Get existing user or create a new one."""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            user = User(id=user_id, email=email, display_name=display_name)
            db.add(user)
            db.commit()
            db.refresh(user)
            logger.info(f"Created new user: {user_id}")
        return user

    # ── Course CRUD ───────────────────────────────────────────────

    @staticmethod
    def create_course(db: Session, user_id: UUID, data: CourseCreate) -> Course:
        """Create a new course with optional lecture slots."""
        course = Course(
            user_id=user_id,
            name=data.name,
            code=data.code,
            color=data.color,
            instructor=data.instructor_name or data.instructor,  # prefer structured field
            semester=data.semester,
            instructor_name=data.instructor_name,
            instructor_email=data.instructor_email,
            instructor_office_hours=data.instructor_office_hours or [],
            instructor_notes=data.instructor_notes,
        )
        db.add(course)
        db.flush()  # Get course.id before adding lectures

        # Add lecture slots
        if data.lectures:
            for slot in data.lectures:
                lecture = RecurringLecture(
                    course_id=course.id,
                    day_of_week=slot.day_of_week,
                    start_time=time.fromisoformat(slot.start_time),
                    end_time=time.fromisoformat(slot.end_time),
                    location=slot.location,
                    lecture_type=slot.lecture_type,
                )
                db.add(lecture)

        db.commit()
        db.refresh(course)
        logger.info(f"Created course: {course.name} ({course.code}) with {len(data.lectures or [])} lectures")
        return course

    @staticmethod
    def get_courses(db: Session, user_id: UUID, active_only: bool = True) -> List[Course]:
        """Get all courses for a user."""
        query = db.query(Course).options(
            joinedload(Course.lectures)
        ).filter(Course.user_id == user_id)

        if active_only:
            query = query.filter(Course.is_active == True)

        return query.order_by(Course.name).all()

    @staticmethod
    def get_course(db: Session, course_id: UUID, user_id: UUID) -> Optional[Course]:
        """Get a single course."""
        return db.query(Course).options(
            joinedload(Course.lectures)
        ).filter(
            Course.id == course_id,
            Course.user_id == user_id
        ).first()

    @staticmethod
    def update_course(db: Session, course_id: UUID, user_id: UUID, data: CourseUpdate) -> Optional[Course]:
        """Update a course."""
        course = db.query(Course).filter(
            Course.id == course_id, Course.user_id == user_id
        ).first()
        if not course:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(course, key, value)

        db.commit()
        db.refresh(course)
        logger.info(f"Updated course: {course.name}")
        return course

    @staticmethod
    def delete_course(db: Session, course_id: UUID, user_id: UUID) -> bool:
        """Delete a course and all related data."""
        course = db.query(Course).filter(
            Course.id == course_id, Course.user_id == user_id
        ).first()
        if not course:
            return False

        db.delete(course)
        db.commit()
        logger.info(f"Deleted course: {course_id}")
        return True

    # ── Lecture Slots ─────────────────────────────────────────────

    @staticmethod
    def add_lecture_slot(db: Session, course_id: UUID, user_id: UUID, data: LectureSlotCreate) -> Optional[RecurringLecture]:
        """Add a recurring lecture slot to a course."""
        course = db.query(Course).filter(
            Course.id == course_id, Course.user_id == user_id
        ).first()
        if not course:
            return None

        lecture = RecurringLecture(
            course_id=course_id,
            day_of_week=data.day_of_week,
            start_time=time.fromisoformat(data.start_time),
            end_time=time.fromisoformat(data.end_time),
            location=data.location,
            lecture_type=data.lecture_type,
        )
        db.add(lecture)
        db.commit()
        db.refresh(lecture)
        return lecture

    @staticmethod
    def delete_lecture_slot(db: Session, lecture_id: UUID) -> bool:
        """Delete a lecture slot."""
        lecture = db.query(RecurringLecture).filter(RecurringLecture.id == lecture_id).first()
        if not lecture:
            return False
        db.delete(lecture)
        db.commit()
        return True

    @staticmethod
    def get_weekly_schedule(db: Session, user_id: UUID) -> List[dict]:
        """Get full weekly lecture schedule for a user."""
        courses = db.query(Course).options(
            joinedload(Course.lectures)
        ).filter(
            Course.user_id == user_id,
            Course.is_active == True
        ).all()

        schedule = []
        for course in courses:
            for lecture in course.lectures:
                if lecture.is_active:
                    schedule.append({
                        "course_id": str(course.id),
                        "course_name": course.name,
                        "course_code": course.code,
                        "course_color": course.color,
                        "day_of_week": lecture.day_of_week,
                        "start_time": lecture.start_time.isoformat(),
                        "end_time": lecture.end_time.isoformat(),
                        "location": lecture.location,
                        "lecture_type": lecture.lecture_type,
                    })

        # Sort by day, then time
        schedule.sort(key=lambda x: (x["day_of_week"], x["start_time"]))
        return schedule

    # ── Deadline CRUD ─────────────────────────────────────────────

    @staticmethod
    def create_deadline(db: Session, user_id: UUID, data: DeadlineCreate) -> Deadline:
        """Create a new deadline."""
        deadline = Deadline(
            user_id=user_id,
            course_id=data.course_id,
            title=data.title,
            description=data.description,
            deadline_type=data.deadline_type,
            due_date=data.due_date,
            priority=data.priority,
            estimated_hours=data.estimated_hours,
        )
        db.add(deadline)
        db.commit()
        db.refresh(deadline)
        logger.info(f"Created deadline: {deadline.title} due {deadline.due_date}")
        return deadline

    @staticmethod
    def get_deadlines(
        db: Session,
        user_id: UUID,
        status: Optional[str] = None,
        deadline_type: Optional[str] = None,
        course_id: Optional[UUID] = None,
        days_ahead: Optional[int] = None,
    ) -> List[Deadline]:
        """Get deadlines with optional filters."""
        query = db.query(Deadline).options(
            joinedload(Deadline.course)
        ).filter(Deadline.user_id == user_id)

        if status:
            query = query.filter(Deadline.status == status)
        if deadline_type:
            query = query.filter(Deadline.deadline_type == deadline_type)
        if course_id:
            query = query.filter(Deadline.course_id == course_id)
        if days_ahead is not None:
            cutoff = datetime.utcnow() + timedelta(days=days_ahead)
            query = query.filter(Deadline.due_date <= cutoff)

        return query.order_by(Deadline.due_date).all()

    @staticmethod
    def get_deadline(db: Session, deadline_id: UUID, user_id: UUID) -> Optional[Deadline]:
        """Get a single deadline."""
        return db.query(Deadline).options(
            joinedload(Deadline.course)
        ).filter(
            Deadline.id == deadline_id,
            Deadline.user_id == user_id
        ).first()

    @staticmethod
    def update_deadline(db: Session, deadline_id: UUID, user_id: UUID, data: DeadlineUpdate) -> Optional[Deadline]:
        """Update a deadline."""
        deadline = db.query(Deadline).filter(
            Deadline.id == deadline_id, Deadline.user_id == user_id
        ).first()
        if not deadline:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(deadline, key, value)

        db.commit()
        db.refresh(deadline)
        logger.info(f"Updated deadline: {deadline.title}")
        return deadline

    @staticmethod
    def delete_deadline(db: Session, deadline_id: UUID, user_id: UUID) -> bool:
        """Delete a deadline."""
        deadline = db.query(Deadline).filter(
            Deadline.id == deadline_id, Deadline.user_id == user_id
        ).first()
        if not deadline:
            return False

        db.delete(deadline)
        db.commit()
        logger.info(f"Deleted deadline: {deadline_id}")
        return True

    @staticmethod
    def get_upcoming_deadlines(db: Session, user_id: UUID, days_ahead: int = 7) -> List[Deadline]:
        """Get deadlines due within the specified number of days."""
        now = datetime.utcnow()
        cutoff = now + timedelta(days=days_ahead)

        return db.query(Deadline).options(
            joinedload(Deadline.course)
        ).filter(
            Deadline.user_id == user_id,
            Deadline.status != "completed",
            Deadline.due_date >= now,
            Deadline.due_date <= cutoff,
        ).order_by(Deadline.due_date).all()

    @staticmethod
    def get_overdue_deadlines(db: Session, user_id: UUID) -> List[Deadline]:
        """Get past-due deadlines that aren't completed."""
        now = datetime.utcnow()

        return db.query(Deadline).options(
            joinedload(Deadline.course)
        ).filter(
            Deadline.user_id == user_id,
            Deadline.status != "completed",
            Deadline.due_date < now,
        ).order_by(Deadline.due_date).all()

    @staticmethod
    def deadline_to_response(deadline: Deadline) -> dict:
        """Convert Deadline ORM object to response dict."""
        now = datetime.utcnow()
        days_until = (deadline.due_date - now).days if deadline.due_date > now else -(now - deadline.due_date).days

        return {
            "id": deadline.id,
            "user_id": deadline.user_id,
            "course_id": deadline.course_id,
            "title": deadline.title,
            "description": deadline.description,
            "deadline_type": deadline.deadline_type,
            "due_date": deadline.due_date,
            "priority": deadline.priority,
            "status": deadline.status,
            "estimated_hours": deadline.estimated_hours,
            "created_at": deadline.created_at,
            "updated_at": deadline.updated_at,
            "course_name": deadline.course.name if deadline.course else None,
            "course_color": deadline.course.color if deadline.course else None,
            "days_until_due": days_until,
        }
