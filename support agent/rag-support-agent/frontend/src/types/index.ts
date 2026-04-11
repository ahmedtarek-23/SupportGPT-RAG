// ─────────────────────────────────────────────────────────────────────────────
// Shared TypeScript interfaces — mirrors backend Pydantic response shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface OfficeHourSlot {
  day: string;
  start: string;
  end: string;
  location?: string;
}

export interface LectureSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  location: string | null;
  lecture_type: string;
}

export interface Course {
  id: string;
  user_id: string;
  name: string;
  code: string | null;
  color: string;
  instructor: string | null;
  semester: string | null;
  is_active: boolean;
  created_at: string;
  lectures: LectureSlot[];
  instructor_name: string | null;
  instructor_email: string | null;
  instructor_office_hours: OfficeHourSlot[] | null;
  instructor_notes: string | null;
  extracted_from_document: boolean;
}

export interface CourseCreate {
  name: string;
  code?: string;
  color?: string;
  instructor?: string;
  semester?: string;
  instructor_name?: string;
  instructor_email?: string;
  instructor_office_hours?: OfficeHourSlot[];
  instructor_notes?: string;
}

export interface CourseDetails {
  course: {
    id: string;
    name: string;
    code: string | null;
    color: string;
    semester: string | null;
    is_active: boolean;
  };
  instructor: {
    name: string | null;
    email: string | null;
    office_hours: OfficeHourSlot[];
    notes: string | null;
    extracted_from_document: boolean;
  };
  upcoming_deadlines: {
    id: string;
    title: string;
    deadline_type: string;
    due_date: string;
    days_until: number;
    priority: number;
    status: string;
  }[];
  flashcards: {
    total: number;
    mastered: number;
    due_for_review: number;
    mastery_rate: number;
  };
  study_progress: {
    total_hours: number;
    total_sessions: number;
    completed_sessions: number;
    completion_rate: number;
  };
  documents: {
    id: string;
    filename: string;
    document_type: string;
    status: string;
    extracted_title: string | null;
    extracted_summary: string | null;
    created_at: string;
  }[];
}

export interface Deadline {
  id: string;
  title: string;
  deadline_type: string;
  due_date: string;
  priority: number;
  status: string;
  course_id: string | null;
  course_name: string | null;
  course_color: string;
  days_until: number;
  description: string | null;
  estimated_hours: number | null;
}

export interface DeadlineCreate {
  title: string;
  deadline_type: string;
  due_date: string;
  course_id?: string;
  description?: string;
  priority?: number;
  estimated_hours?: number;
}

export interface DeadlineListResponse {
  deadlines: Deadline[];
  total: number;
  upcoming_count: number;
  overdue_count: number;
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  source_doc: string | null;
  difficulty: number;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review: string | null;
  last_reviewed: string | null;
  course_id: string | null;
  course_name?: string | null;
  course_color?: string | null;
  created_at: string;
}

export interface FlashcardStats {
  total_cards: number;
  due_for_review: number;
  mastered: number;
  by_course?: { course_name: string; total: number; mastered: number }[];
}

export interface StudySession {
  id: string;
  title: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  notes: string | null;
  course_id: string | null;
  course_name?: string | null;
  course_color?: string | null;
  deadline_id: string | null;
}

export interface StudyPlan {
  id: string;
  week_start: string;
  week_end: string;
  plan_json: any;
  ai_reasoning: string | null;
  status: string;
  study_sessions: StudySession[];
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  scheduled_at: string;
  sent_at: string | null;
  read_at: string | null;
  is_recurring: boolean;
}

export interface Document {
  id: string;
  filename: string;
  document_type: string;
  status: string;
  course_id: string | null;
  extracted_title: string | null;
  extracted_summary: string | null;
  extracted_instructor_name?: string | null;
  extracted_instructor_email?: string | null;
  extracted_office_hours?: OfficeHourSlot[];
  extracted_dates_count?: number;
  extracted_assignments_count?: number;
  extracted_flashcard_count?: number;
  num_chunks: number | null;
  created_at: string;
  ingested_at: string | null;
}

export interface UploadTaskStatus {
  task_id: string;
  state: string;
  progress: any;
  result: any;
  error: string | null;
}

export interface AnalyticsOverview {
  courses: { total_active: number };
  deadlines: { total: number; completed: number; overdue: number; completion_rate: number };
  study_time: { total_hours_all_time: number };
  sessions_30d: { total: number; completed: number; completion_rate: number };
  flashcards: { total: number; mastered: number; mastery_rate: number };
}

export interface StudyHoursData {
  group_by: string;
  labels: string[];
  values: number[];
  total_hours: number;
  avg_per_day?: number;
  courses?: { course_id: string; course_name: string; course_code: string | null; course_color: string; hours: number }[];
}

export interface RetentionData {
  overall_retention_pct: number;
  total_cards: number;
  total_mastered: number;
  per_course: {
    course_id: string;
    course_name: string;
    course_code: string | null;
    course_color: string;
    total_cards: number;
    mastered_cards: number;
    retention_pct: number;
    avg_ease_factor: number;
    avg_interval_days: number;
  }[];
}

export interface StreakData {
  current_streak: number;
  longest_streak_30d: number;
  days_studied_this_week: number;
  total_active_days_30d: number;
  heatmap: Record<string, number>;
}

export interface InsightsData {
  weak_subjects: any[];
  risk_alerts: any[];
  focus_recommendations: any[];
  missed_deadlines: any[];
  planner_tips: any[];
  generated_at: string;
}

export interface FeedbackCreate {
  query: string;
  answer: string;
  rating: number; // 1–5
  comment?: string;
}

export interface LectureSlotCreate {
  day_of_week: number; // 0=Mon … 6=Sun
  start_time: string;  // "HH:MM"
  end_time: string;
  location?: string;
  lecture_type?: string; // "lecture" | "lab" | "tutorial"
}

export interface WeeklyScheduleEntry {
  day: string;
  day_index: number;
  slots: {
    id: string;
    course_id: string;
    course_name: string;
    course_color: string;
    start_time: string;
    end_time: string;
    location: string | null;
    lecture_type: string;
  }[];
}

export interface WeeklySchedule {
  week_schedule: WeeklyScheduleEntry[];
  total_lecture_hours: number;
}

export interface DocumentSummary {
  document_id: string;
  filename: string;
  document_type: string;
  status: string;
  course_id: string | null;
  extracted_title: string | null;
  extracted_summary: string | null;
  extracted_instructor_name: string | null;
  extracted_instructor_email: string | null;
  extracted_office_hours: OfficeHourSlot[] | null;
  extracted_dates: string[] | null;
  extracted_assignments: string[] | null;
  extracted_flashcard_count: number | null;
  num_chunks: number | null;
  ingested_at: string | null;
  created_at: string;
}

export interface ReminderPreferences {
  deadline_reminder_hours: number[];
  daily_study_reminder_time: string | null; // "HH:MM"
  lecture_reminder_minutes: number;
  enable_deadline_reminders: boolean;
  enable_daily_study_reminders: boolean;
  enable_lecture_reminders: boolean;
}

// ── Document Intelligence ─────────────────────────────────────────────────────

export interface DocumentDetail extends Document {
  file_size_bytes: number | null;
  confidence_band: "HIGH" | "MEDIUM" | "LOW" | "NONE" | null;
  confirmed_at: string | null;
  extracted_dates: string[];
  extracted_assignments: string[];
  extraction_metadata: Record<string, any>;
  error_message: string | null;
}

export interface ConfirmPayload {
  create_course?: boolean;
  confirmed_course_name?: string;
  confirmed_course_code?: string;
  confirmed_instructor_name?: string;
  confirmed_deadlines?: { title: string; due_date: string; deadline_type: string }[];
  confirmed_flashcards?: { question: string; answer: string }[];
}

export interface ConfirmResult {
  document_id: string;
  course_id: string | null;
  deadlines_created: number;
  flashcards_created: number;
  confirmed: boolean;
}

export interface DocumentStats {
  upload_directory: string;
  uploaded_files: number;
  total_size_bytes: number;
  async_processing: string;
}

export interface FlashcardGenerateResult {
  document_id: string;
  flashcards_created: number;
  source: "extraction_cache" | "rag_generation";
}

// ── Planner ───────────────────────────────────────────────────────────────────

export interface WorkloadData {
  total_hours_this_week: number;
  hours_by_course: Record<string, number>;
  busiest_day: string;
  lightest_day: string;
  balance_score: number;
  suggestions: string[];
}

// ── Flashcards ────────────────────────────────────────────────────────────────

export interface WeakTopic {
  topic: string;
  ease_factor: number;
  course_id: string | null;
}

export interface DashboardData {
  upcoming_deadlines: any[];
  today_tasks: any[];
  exam_countdowns: any[];
  study_progress: {
    sessions_completed: number;
    sessions_total: number;
    session_completion_rate: number;
    hours_studied: number;
    deadlines_total: number;
    deadlines_completed: number;
    deadline_completion_rate: number;
  };
  weekly_stats: {
    hours_by_day: Record<string, number>;
    total_planned_hours: number;
    active_courses: number;
  };
  course_summary: {
    id: string;
    name: string;
    code: string | null;
    color: string;
    pending_deadlines: number;
  }[];
  notification_count: number;
  flashcard_stats: {
    total_cards: number;
    due_for_review: number;
    mastered: number;
  };
}
