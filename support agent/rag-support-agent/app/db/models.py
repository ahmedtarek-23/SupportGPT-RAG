from sqlalchemy import (
    Column, String, Float, Text, DateTime, JSON, Index,
    Integer, Boolean, Date, Time, ForeignKey
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from pgvector.sqlalchemy import Vector
from datetime import datetime
import uuid

Base = declarative_base()


# ═══════════════════════════════════════════════════════════════
# Existing RAG Models (unchanged)
# ═══════════════════════════════════════════════════════════════

class EmbeddingChunk(Base):
    """SQLAlchemy model for storing text chunks with embeddings in PostgreSQL."""

    __tablename__ = "embedding_chunks"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Main fields
    chunk_id = Column(String(255), unique=True, nullable=False, index=True)
    text = Column(Text, nullable=False)
    source = Column(String(255), nullable=False)
    embedding = Column(Vector(384), nullable=False)   # sentence-transformers all-MiniLM-L6-v2

    # Metadata
    metadata_json = Column(JSON, nullable=True, default={})
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Indexes for fast lookup
    __table_args__ = (
        Index("ix_embedding_chunks_source", "source"),
        Index("ix_embedding_chunks_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<EmbeddingChunk(chunk_id={self.chunk_id}, source={self.source})>"


class IngestLog(Base):
    """Track ingestion events."""

    __tablename__ = "ingest_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_file = Column(String(255), nullable=False)
    num_chunks = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False)  # success, failed
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("ix_ingest_logs_created_at", "created_at"),
    )

    def __repr__(self):
        return f"<IngestLog(source={self.source_file}, status={self.status})>"


# ═══════════════════════════════════════════════════════════════
# University Productivity Platform Models (Phase 8+)
# ═══════════════════════════════════════════════════════════════

class User(Base):
    """Lightweight user model for multi-user support."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    preferences = Column(JSON, default={})  # notification prefs, theme, timezone
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    courses = relationship("Course", back_populates="user", cascade="all, delete-orphan")
    deadlines = relationship("Deadline", back_populates="user", cascade="all, delete-orphan")
    study_sessions = relationship("StudySession", back_populates="user", cascade="all, delete-orphan")
    study_plans = relationship("StudyPlan", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    flashcards = relationship("Flashcard", back_populates="user", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(email={self.email}, name={self.display_name})>"


class Course(Base):
    """University course with schedule information."""

    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)           # "Data Structures"
    code = Column(String(50), nullable=True)              # "CS201"
    color = Column(String(7), default="#0066FF")          # hex for UI cards
    instructor = Column(String(255), nullable=True)       # display name (legacy)
    semester = Column(String(50), nullable=True)          # "Spring 2026"
    is_active = Column(Boolean, default=True)

    # Instructor metadata (replaces Teacher Hub)
    instructor_name = Column(String(255), nullable=True)
    instructor_email = Column(String(255), nullable=True)
    instructor_office_hours = Column(JSON, default=[])   # [{"day":"Mon","start":"10:00","end":"12:00","location":"Room 301"}]
    instructor_notes = Column(Text, nullable=True)
    extracted_from_document = Column(Boolean, default=False)  # True if populated by doc intelligence

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="courses")
    deadlines = relationship("Deadline", back_populates="course", cascade="all, delete-orphan")
    lectures = relationship("RecurringLecture", back_populates="course", cascade="all, delete-orphan")
    study_sessions = relationship("StudySession", back_populates="course")
    flashcards = relationship("Flashcard", back_populates="course")
    documents = relationship("Document", back_populates="course")

    __table_args__ = (
        Index("ix_courses_user_active", "user_id", "is_active"),
    )

    def __repr__(self):
        return f"<Course(name={self.name}, code={self.code})>"


class Deadline(Base):
    """Assignment, exam, project, or quiz deadline."""

    __tablename__ = "deadlines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(500), nullable=False)           # "Assignment 3"
    description = Column(Text, nullable=True)
    deadline_type = Column(String(50), nullable=False)    # assignment, exam, project, quiz
    due_date = Column(DateTime, nullable=False)
    priority = Column(Integer, default=2)                 # 1=critical, 2=important, 3=normal
    status = Column(String(50), default="pending")        # pending, in_progress, completed
    estimated_hours = Column(Float, nullable=True)        # student's time estimate
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="deadlines")
    course = relationship("Course", back_populates="deadlines")
    study_sessions = relationship("StudySession", back_populates="deadline")
    notifications = relationship(
        "Notification",
        primaryjoin="and_(Deadline.id == foreign(Notification.reference_id), Notification.reference_type == 'deadline')",
        viewonly=True,
    )

    __table_args__ = (
        Index("ix_deadlines_due_date", "due_date"),
        Index("ix_deadlines_user_status", "user_id", "status"),
    )

    def __repr__(self):
        return f"<Deadline(title={self.title}, type={self.deadline_type}, due={self.due_date})>"


class RecurringLecture(Base):
    """Recurring weekly lecture/lab/tutorial slot for a course."""

    __tablename__ = "recurring_lectures"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(Integer, nullable=False)         # 0=Monday, 6=Sunday
    start_time = Column(Time, nullable=False)             # e.g. 09:00
    end_time = Column(Time, nullable=False)               # e.g. 10:30
    location = Column(String(255), nullable=True)         # "Room 301"
    lecture_type = Column(String(50), default="lecture")   # lecture, lab, tutorial
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    course = relationship("Course", back_populates="lectures")

    def __repr__(self):
        return f"<RecurringLecture(course={self.course_id}, day={self.day_of_week}, time={self.start_time})>"


class StudyPlan(Base):
    """AI-generated weekly study plan."""

    __tablename__ = "study_plans"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    week_start = Column(Date, nullable=False)
    week_end = Column(Date, nullable=False)
    plan_json = Column(JSON, nullable=False)              # full schedule structure
    ai_reasoning = Column(Text, nullable=True)            # GPT's explanation of the plan
    status = Column(String(50), default="active")         # active, archived, draft
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="study_plans")
    study_sessions = relationship("StudySession", back_populates="plan", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_study_plans_user_week", "user_id", "week_start"),
    )

    def __repr__(self):
        return f"<StudyPlan(user={self.user_id}, week={self.week_start})>"


class StudySession(Base):
    """Scheduled or completed study time block."""

    __tablename__ = "study_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    deadline_id = Column(UUID(as_uuid=True), ForeignKey("deadlines.id", ondelete="SET NULL"), nullable=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("study_plans.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(500), nullable=False)
    scheduled_start = Column(DateTime, nullable=False)
    scheduled_end = Column(DateTime, nullable=False)
    actual_start = Column(DateTime, nullable=True)
    actual_end = Column(DateTime, nullable=True)
    status = Column(String(50), default="scheduled")      # scheduled, active, completed, skipped
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="study_sessions")
    course = relationship("Course", back_populates="study_sessions")
    deadline = relationship("Deadline", back_populates="study_sessions")
    plan = relationship("StudyPlan", back_populates="study_sessions")

    __table_args__ = (
        Index("ix_study_sessions_user_schedule", "user_id", "scheduled_start"),
    )

    def __repr__(self):
        return f"<StudySession(title={self.title}, start={self.scheduled_start})>"


class Notification(Base):
    """User notification for deadlines, study reminders, and alarms."""

    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(500), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(50), nullable=False)  # deadline, study, lecture, system
    reference_id = Column(UUID(as_uuid=True), nullable=True)           # links to deadline/session
    reference_type = Column(String(50), nullable=True)      # "deadline", "study_session", "lecture"
    scheduled_at = Column(DateTime, nullable=False)
    sent_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    is_recurring = Column(Boolean, default=False)
    recurrence_rule = Column(String(255), nullable=True)    # "daily@08:00", "weekly@Mon"
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="notifications")

    __table_args__ = (
        Index("ix_notifications_scheduled", "scheduled_at"),
        Index("ix_notifications_user_unread", "user_id", "read_at"),
    )

    def __repr__(self):
        return f"<Notification(title={self.title}, type={self.notification_type})>"


class Flashcard(Base):
    """AI-generated flashcard with spaced repetition (SM-2) tracking."""

    __tablename__ = "flashcards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    source_doc = Column(String(255), nullable=True)        # which document it came from
    difficulty = Column(Integer, default=1)                 # 1-5
    # Spaced repetition fields (SM-2 algorithm)
    ease_factor = Column(Float, default=2.5)
    interval_days = Column(Integer, default=1)
    repetitions = Column(Integer, default=0)
    next_review = Column(DateTime, nullable=True)
    last_reviewed = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="flashcards")
    course = relationship("Course", back_populates="flashcards")

    __table_args__ = (
        Index("ix_flashcards_next_review", "user_id", "next_review"),
    )

    def __repr__(self):
        return f"<Flashcard(question={self.question[:50]}...)>"


class Document(Base):
    """
    Uploaded document record with extracted intelligence metadata.

    Tracks file uploads and stores AI-extracted content like course info,
    instructor details, deadlines, summaries, and flashcard candidates.
    """

    __tablename__ = "documents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)

    # File info
    filename = Column(String(500), nullable=False)         # stored filename
    original_filename = Column(String(500), nullable=False)
    document_type = Column(String(20), nullable=False)     # pdf, docx, txt
    file_size_bytes = Column(Integer, nullable=True)
    file_path = Column(String(1000), nullable=True)

    # Ingestion state
    status = Column(String(50), default="pending")         # pending, processing, completed, failed
    num_chunks = Column(Integer, nullable=True)
    ingested_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

    # AI-extracted intelligence (populated by document_metadata_extractor_service)
    extracted_title = Column(String(500), nullable=True)
    extracted_summary = Column(Text, nullable=True)
    extracted_instructor_name = Column(String(255), nullable=True)
    extracted_instructor_email = Column(String(255), nullable=True)
    extracted_office_hours = Column(JSON, default=[])       # [{"day":"Mon","start":"10:00","end":"12:00"}]
    extracted_dates = Column(JSON, default=[])              # [{"label":"Midterm","date":"2026-03-15","type":"exam"}]
    extracted_assignments = Column(JSON, default=[])        # [{"title":"HW1","due_date":"2026-02-01"}]
    extracted_flashcard_count = Column(Integer, default=0)
    extraction_metadata = Column(JSON, default={})          # any additional extracted fields

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="documents")
    course = relationship("Course", back_populates="documents")

    __table_args__ = (
        Index("ix_documents_user_id", "user_id"),
        Index("ix_documents_course_id", "course_id"),
        Index("ix_documents_status", "status"),
    )

    def __repr__(self):
        return f"<Document(filename={self.original_filename}, status={self.status})>"
