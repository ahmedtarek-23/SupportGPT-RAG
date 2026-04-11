import type {
  Course, CourseCreate, CourseDetails,
  Deadline, DeadlineCreate, DeadlineListResponse,
  Flashcard, FlashcardStats, StudySession, StudyPlan,
  Notification, Document, DocumentDetail, UploadTaskStatus,
  ConfirmPayload, ConfirmResult, DocumentStats, FlashcardGenerateResult,
  WorkloadData, WeakTopic,
  AnalyticsOverview, StudyHoursData, RetentionData,
  StreakData, InsightsData, DashboardData,
  FeedbackCreate, LectureSlotCreate, WeeklySchedule,
  DocumentSummary, ReminderPreferences,
} from "../types";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the ISO date string (YYYY-MM-DD) of the Monday for the current week. */
function getMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch wrapper
// ─────────────────────────────────────────────────────────────────────────────

function buildQuery(params?: Record<string, any>): string {
  if (!params) return "";
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return qs ? `?${qs}` : "";
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isFormData = options?.body instanceof FormData;
  const res = await fetch(path, {
    headers: isFormData ? {} : { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => res.statusText);
    throw new Error(msg || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// API object — typed methods for every backend endpoint
// ─────────────────────────────────────────────────────────────────────────────

export const api = {
  // ── Dashboard ────────────────────────────────────────────────────────────
  dashboard: {
    get: () => request<DashboardData>("/api/dashboard"),
  },

  // ── Courses ──────────────────────────────────────────────────────────────
  courses: {
    list: (activeOnly = true) =>
      request<Course[]>(`/api/courses${buildQuery({ active_only: activeOnly })}`),
    get: (id: string) => request<Course>(`/api/courses/${id}`),
    details: (id: string) => request<CourseDetails>(`/api/courses/${id}/details`),
    create: (data: CourseCreate) =>
      request<Course>("/api/courses", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CourseCreate>) =>
      request<Course>(`/api/courses/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/courses/${id}`, { method: "DELETE" }),
    addLectureSlot: (courseId: string, slot: LectureSlotCreate) =>
      request<{ id: string; message: string }>(`/api/courses/${courseId}/lectures`, {
        method: "POST",
        body: JSON.stringify(slot),
      }),
    deleteLectureSlot: (lectureId: string) =>
      request<{ message: string }>(`/api/lectures/${lectureId}`, { method: "DELETE" }),
    weeklySchedule: () => request<WeeklySchedule>("/api/schedule/weekly"),
  },

  // ── Deadlines ────────────────────────────────────────────────────────────
  deadlines: {
    list: (params?: { status?: string; deadline_type?: string; course_id?: string; days_ahead?: number }) =>
      request<DeadlineListResponse>(`/api/deadlines${buildQuery(params)}`),
    upcoming: (days = 7) =>
      request<Deadline[]>(`/api/deadlines/upcoming?days=${days}`),
    overdue: () => request<Deadline[]>("/api/deadlines/overdue"),
    create: (data: DeadlineCreate) =>
      request<Deadline>("/api/deadlines", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<DeadlineCreate & { status?: string }>) =>
      request<Deadline>(`/api/deadlines/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/deadlines/${id}`, { method: "DELETE" }),
  },

  // ── Planner ──────────────────────────────────────────────────────────────
  planner: {
    current: () => request<StudyPlan | null>("/api/planner/current"),
    sessions: (params?: { status?: string; days_ahead?: number }) =>
      request<StudySession[]>(`/api/planner/sessions${buildQuery(params)}`),
    generate: (weekStart?: string) =>
      request<StudyPlan>("/api/planner/generate", {
        method: "POST",
        body: JSON.stringify({ week_start: weekStart ?? getMonday(), preferences: {} }),
      }),
    updateSession: (id: string, data: { status: string; notes?: string }) =>
      request<StudySession>(`/api/planner/sessions/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    workload: () => request<WorkloadData>("/api/planner/workload"),
  },

  // ── Documents ────────────────────────────────────────────────────────────
  documents: {
    list: (skip = 0, limit = 20) =>
      request<{ documents: Document[]; total: number }>(
        `/api/documents?skip=${skip}&limit=${limit}`
      ),
    get: (documentId: string) =>
      request<DocumentDetail>(`/api/documents/${documentId}`),
    byCourse: (courseId: string) =>
      request<{ documents: Document[]; total: number; course_id: string }>(
        `/api/documents/by-course/${courseId}`
      ),
    stats: () => request<DocumentStats>("/api/documents/stats"),
    summary: (documentId: string) => request<DocumentSummary>(`/api/documents/summary/${documentId}`),
    upload: (file: File, sourceName?: string) => {
      const form = new FormData();
      form.append("file", file);
      const query = sourceName ? `?source_name=${encodeURIComponent(sourceName)}` : "";
      return request<{ task_id: string; document_id: string; filename: string; file_size: number; message: string }>(
        `/api/documents/upload${query}`,
        { method: "POST", body: form }
      );
    },
    batchUpload: (files: File[]) => {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      return request<{ tasks: { task_id: string; filename: string }[]; message: string }>(
        "/api/documents/batch-upload",
        { method: "POST", body: form }
      );
    },
    uploadStatus: (taskId: string) =>
      request<UploadTaskStatus>(`/api/documents/upload/${taskId}`),
    confirm: (documentId: string, payload: ConfirmPayload) =>
      request<ConfirmResult>(`/api/documents/${documentId}/confirm`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    generateFlashcards: (documentId: string, count = 10) =>
      request<FlashcardGenerateResult>(
        `/api/documents/${documentId}/generate-flashcards?count=${count}`,
        { method: "POST" }
      ),
    generateSummary: (documentId: string) =>
      request<{ document_id: string; summary: string }>(
        `/api/documents/${documentId}/generate-summary`,
        { method: "POST" }
      ),
    delete: (documentId: string) =>
      request<{ message: string; id: string }>(`/api/documents/${documentId}`, { method: "DELETE" }),
  },

  // ── Flashcards ───────────────────────────────────────────────────────────
  flashcards: {
    list: (params?: { course_id?: string }) =>
      request<Flashcard[]>(`/api/flashcards${buildQuery(params)}`),
    stats: () => request<FlashcardStats>("/api/flashcards/stats"),
    review: () => request<Flashcard[]>("/api/flashcards/review"),
    submitReview: (id: string, quality: number) =>
      request<Flashcard>(`/api/flashcards/${id}/review`, {
        method: "POST",
        body: JSON.stringify({ quality }),
      }),
    generate: (params: { topic: string; course_id?: string; count?: number }) =>
      request<Flashcard[]>("/api/flashcards/generate", {
        method: "POST",
        body: JSON.stringify(params),
      }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/flashcards/${id}`, { method: "DELETE" }),
    weakTopics: () => request<WeakTopic[]>("/api/flashcards/weak-topics"),
  },

  // ── Notifications ────────────────────────────────────────────────────────
  notifications: {
    list: (params?: { unread_only?: boolean; notification_type?: string }) =>
      request<Notification[]>(`/api/notifications${buildQuery(params)}`),
    markRead: (id: string) =>
      request<Notification>(`/api/notifications/${id}/read`, { method: "PUT" }),
    markAllRead: () =>
      request<{ message: string }>("/api/notifications/read-all", { method: "PUT" }),
    delete: (id: string) =>
      request<{ message: string }>(`/api/notifications/${id}`, { method: "DELETE" }),
    getPreferences: () => request<ReminderPreferences>("/api/notifications/preferences"),
    updatePreferences: (prefs: Partial<ReminderPreferences>) =>
      request<ReminderPreferences>("/api/notifications/preferences", {
        method: "PUT",
        body: JSON.stringify(prefs),
      }),
  },

  // ── Feedback ─────────────────────────────────────────────────────────────
  feedback: {
    submit: (data: FeedbackCreate) =>
      request<{ message: string }>("/api/feedback", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // ── Analytics ────────────────────────────────────────────────────────────
  analytics: {
    overview: () => request<AnalyticsOverview>("/api/analytics/overview"),
    studyHours: (params?: { days?: number; group_by?: string }) =>
      request<StudyHoursData>(`/api/analytics/study-hours${buildQuery(params)}`),
    retention: () => request<RetentionData>("/api/analytics/retention"),
    streaks: () => request<StreakData>("/api/analytics/streaks"),
    insights: () => request<InsightsData>("/api/analytics/insights"),
  },

  // ── Chat ─────────────────────────────────────────────────────────────────
  chat: {
    send: (params: { query: string; session_id?: string }) =>
      request<any>("/api/chat", { method: "POST", body: JSON.stringify(params) }),
    clarify: (params: { session_id: string; original_query: string; clarification_response: string }) =>
      request<any>("/api/chat/clarify", { method: "POST", body: JSON.stringify(params) }),
  },
};
