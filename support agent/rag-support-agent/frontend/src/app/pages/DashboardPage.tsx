import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import {
  LayoutDashboard, CalendarClock, Clock,
  TrendingUp, Layers3, Upload,
  BrainCircuit, ArrowRight, Flame, Target, BookMarked, AlertCircle, BookOpen,
} from "lucide-react";
import { GlassCard, PageHeader } from "../components/shared/GlassCard";
import { PomodoroTimer } from "../components/PomodoroTimer";
import { WeeklyScheduleWidget } from "../components/dashboard/WeeklyScheduleWidget";
import { NextActionWidget } from "../components/dashboard/NextActionWidget";
import { UploadCenterPanel } from "../components/upload/UploadCenterPanel";
import { MetadataConfirmationModal, type ConfirmationResult } from "../components/upload/MetadataConfirmationModal";
import { PostUploadActionsPanel } from "../components/upload/PostUploadActionsPanel";

interface DashboardData {
  upcoming_deadlines: any[];
  today_tasks: any[];
  exam_countdowns: any[];
  study_progress: any;
  weekly_stats: any;
  course_summary: any[];
  notification_count: number;
  flashcard_stats: any;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [confirmDoc, setConfirmDoc] = useState<any | null>(null);
  const [postUpload, setPostUpload] = useState<{ docId: string; docName: string; result: ConfirmationResult } | null>(null);
  const navigate = useNavigate();

  const loadDashboard = () => {
    setLoading(true);
    setError(null);
    fetch("/api/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error(`Server responded with ${r.status}`);
        return r.json();
      })
      .then((d) => { setData(d); setError(null); })
      .catch((e: Error) => setError(e.message || "Could not load dashboard data"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboard();
    fetch("/api/documents?limit=1")
      .then((r) => r.json())
      .then((d) => setDocCount(d.total ?? 0))
      .catch(() => setDocCount(0));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ width: 40, height: 40, border: "3px solid rgba(0,102,255,0.3)", borderTopColor: "#0066FF", borderRadius: "50%" }}
        />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          subtitle="Your academic command center"
          icon={<LayoutDashboard size={24} color="#0066FF" />}
        />
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          padding: "20px 24px", borderRadius: 16,
          background: "rgba(255, 80, 80, 0.08)",
          border: "1px solid rgba(255, 80, 80, 0.25)",
          color: "#FF6C6C",
        }}>
          <AlertCircle size={22} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>Failed to load dashboard</div>
            <div style={{ fontSize: 13, opacity: 0.75, marginTop: 2 }}>{error ?? "No data returned from the server."}</div>
          </div>
          <button
            onClick={loadDashboard}
            style={{ marginLeft: "auto", padding: "8px 18px", borderRadius: 10, border: "1px solid rgba(255,80,80,0.3)", background: "rgba(255,80,80,0.1)", color: "#FF6C6C", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const d = data;
  const progress = d.study_progress;
  const stats = d.weekly_stats;
  const flash = d.flashcard_stats;

  const handleUploadComplete = (doc: any) => {
    setShowUpload(false);
    // Show confirmation modal for LOW/NONE confidence; for HIGH the backend auto-created
    if (doc.confidence_band === "HIGH") {
      setDocCount((n) => (n ?? 0) + 1);
      loadDashboard();
    } else {
      setConfirmDoc(doc);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <PageHeader
          title="Dashboard"
          subtitle="Your academic command center"
          icon={<LayoutDashboard size={24} color="#0066FF" />}
        />
        <button
          onClick={() => setShowUpload(true)}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "10px 18px",
            background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
            border: "none", borderRadius: 14, color: "#fff",
            fontFamily: "Space Grotesk, sans-serif", fontSize: 13, fontWeight: 600,
            cursor: "pointer", boxShadow: "0 4px 20px rgba(0,102,255,0.25)",
            whiteSpace: "nowrap", flexShrink: 0,
          }}
        >
          <Upload size={15} /> Upload File
        </button>
      </div>

      {/* Empty state hero — shown when no documents uploaded yet */}
      {docCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 24 }}
        >
          <GlassCard style={{ borderColor: "rgba(0,102,255,0.2)", background: "rgba(0,102,255,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, padding: "8px 4px" }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(0,102,255,0.2), rgba(123,47,190,0.15))",
                display: "grid", placeItems: "center",
              }}>
                <Upload size={26} color="#0066FF" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Syne, sans-serif", fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
                  Start by uploading a syllabus or lecture file
                </div>
                <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 13 }}>
                  AI will automatically create your course, extract deadlines, and generate flashcards.
                </div>
              </div>
              <button
                onClick={() => setShowUpload(true)}
                style={{
                  padding: "11px 22px", flexShrink: 0,
                  background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
                  border: "none", borderRadius: 14, color: "#fff",
                  fontFamily: "Space Grotesk, sans-serif", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", boxShadow: "0 4px 20px rgba(0,102,255,0.3)",
                }}
              >
                Get Started
              </button>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Post-upload actions portal */}
      <AnimatePresence>
        {postUpload && (
          <PostUploadActionsPanel
            docId={postUpload.docId}
            docName={postUpload.docName}
            result={postUpload.result}
            onClose={() => setPostUpload(null)}
          />
        )}
      </AnimatePresence>

      {/* Upload + Confirmation portals */}
      <AnimatePresence>
        {showUpload && (
          <UploadCenterPanel
            onComplete={handleUploadComplete}
            onClose={() => setShowUpload(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {confirmDoc && (
          <MetadataConfirmationModal
            doc={confirmDoc}
            onConfirmed={(result) => {
              const docName = confirmDoc.filename || confirmDoc.original_filename || "Document";
              const docId = confirmDoc.id;
              setConfirmDoc(null);
              setDocCount((n) => (n ?? 0) + 1);
              loadDashboard();
              setPostUpload({ docId, docName, result });
            }}
            onSkip={() => setConfirmDoc(null)}
          />
        )}
      </AnimatePresence>

      {/* Next Action Engine */}
      {docCount !== null && docCount > 0 && <NextActionWidget />}

      {/* Top row — Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <QuickStat icon={<CalendarClock size={20} />} label="Upcoming" value={d.upcoming_deadlines.length} color="#0066FF" />
        <QuickStat icon={<Clock size={20} />} label="Today's Tasks" value={d.today_tasks.length} color="#00D4FF" />
        <QuickStat icon={<TrendingUp size={20} />} label="Hours Studied" value={`${progress.hours_studied}h`} color="#00FF88" />
        <QuickStat icon={<Layers3 size={20} />} label="Flashcards Due" value={flash.due_for_review} color="#FFD700" />
      </div>

      {/* Main grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Upcoming Deadlines */}
        <GlassCard style={{ gridColumn: "1 / 2" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>
              📅 Upcoming Deadlines
            </h3>
            <button
              onClick={() => navigate("/deadlines")}
              style={{ background: "none", border: "none", color: "#0066FF", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          {d.upcoming_deadlines.length === 0 ? (
            <EmptyState text="No upcoming deadlines — you're all caught up!" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {d.upcoming_deadlines.map((dl: any) => (
                <DeadlineRow key={dl.id} deadline={dl} />
              ))}
            </div>
          )}
        </GlassCard>

        {/* Today's Schedule */}
        <GlassCard style={{ gridColumn: "2 / 3" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>
              🗓️ Today's Schedule
            </h3>
            <button
              onClick={() => navigate("/planner")}
              style={{ background: "none", border: "none", color: "#0066FF", cursor: "pointer", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}
            >
              Planner <ArrowRight size={14} />
            </button>
          </div>
          {d.today_tasks.length === 0 ? (
            <EmptyState text="No tasks scheduled for today" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {d.today_tasks.map((task: any) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          )}
        </GlassCard>

        {/* Exam Countdowns */}
        <GlassCard>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 20px" }}>
            ⏰ Exam Countdown
          </h3>
          {d.exam_countdowns.length === 0 ? (
            <EmptyState text="No upcoming exams" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {d.exam_countdowns.map((exam: any) => (
                <div
                  key={exam.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "14px 16px",
                    background: "rgba(255,108,108,0.06)",
                    border: "1px solid rgba(255,108,108,0.15)",
                    borderRadius: 14,
                  }}
                >
                  <div>
                    <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{exam.title}</div>
                    <div style={{ color: "rgba(160,180,230,0.6)", fontSize: 12, marginTop: 2 }}>{exam.course_name}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontSize: 28,
                        fontWeight: 800,
                        fontFamily: "Syne, sans-serif",
                        background: exam.days_until <= 3
                          ? "linear-gradient(135deg, #FF6C6C, #FF3366)"
                          : "linear-gradient(135deg, #FFD700, #FF8C00)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {exam.days_until}d
                    </div>
                    <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 11 }}>days left</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Study Progress */}
        <GlassCard>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 20px" }}>
            📊 This Week's Progress
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <ProgressCircle
              label="Sessions"
              value={progress.session_completion_rate}
              detail={`${progress.sessions_completed}/${progress.sessions_total}`}
              color="#0066FF"
            />
            <ProgressCircle
              label="Deadlines"
              value={progress.deadline_completion_rate}
              detail={`${progress.deadlines_completed}/${progress.deadlines_total}`}
              color="#00FF88"
            />
          </div>
          <div style={{ marginTop: 20, padding: "12px 16px", background: "rgba(0,102,255,0.06)", borderRadius: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <Flame size={18} color="#FFD700" />
            <span style={{ color: "rgba(200,210,255,0.8)", fontSize: 13 }}>
              <strong style={{ color: "#fff" }}>{progress.hours_studied}h</strong> studied this week
            </span>
          </div>
        </GlassCard>

        {/* Weekly Hours Chart */}
        <GlassCard>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 20px" }}>
            📈 Weekly Study Hours
          </h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
            {Object.entries(stats.hours_by_day || {}).map(([day, hours]: [string, any]) => {
              const maxH = Math.max(...Object.values(stats.hours_by_day || {}).map(Number), 1);
              const height = (Number(hours) / maxH) * 100;
              return (
                <div key={day} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                  <span style={{ color: "rgba(160,180,230,0.6)", fontSize: 11 }}>{hours}h</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(height, 4)}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    style={{
                      width: "100%",
                      background: Number(hours) > 0
                        ? "linear-gradient(180deg, #0066FF, rgba(0,102,255,0.3))"
                        : "rgba(255,255,255,0.06)",
                      borderRadius: "8px 8px 4px 4px",
                      minHeight: 4,
                    }}
                  />
                  <span style={{ color: "rgba(160,180,230,0.5)", fontSize: 11, fontWeight: 600 }}>{day}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 16, textAlign: "center", color: "rgba(160,180,230,0.5)", fontSize: 13 }}>
            Total: <strong style={{ color: "#fff" }}>{stats.total_planned_hours}h</strong> planned · <strong style={{ color: "#fff" }}>{stats.active_courses}</strong> active courses
          </div>
        </GlassCard>

        {/* Quick Actions */}
        <GlassCard>
          <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 20px" }}>
            ⚡ Quick Actions
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <ActionButton icon={<CalendarClock size={18} />} label="Add Deadline" onClick={() => navigate("/deadlines")} color="#0066FF" />
            <ActionButton icon={<BrainCircuit size={18} />} label="Generate Plan" onClick={() => navigate("/planner")} color="#7B2FBE" />
            <ActionButton icon={<Layers3 size={18} />} label="Review Flashcards" onClick={() => navigate("/flashcards")} color="#00D4FF" />
            <ActionButton icon={<BookOpen size={18} />} label="Ask AI" onClick={() => navigate("/chat")} color="#00FF88" />
            <ActionButton icon={<BookMarked size={18} />} label="Courses" onClick={() => navigate("/courses")} color="#FF8C00" />
            <ActionButton icon={<TrendingUp size={18} />} label="Analytics" onClick={() => navigate("/analytics")} color="#FFD700" />
          </div>
        </GlassCard>

        {/* Pomodoro Timer */}
        <GlassCard>
          <PomodoroTimer />
        </GlassCard>
      </div>

      {/* Weekly Schedule — full width */}
      <div style={{ marginTop: 24 }}>
        <WeeklyScheduleWidget />
      </div>

      {/* Semester Intelligence — shows only when docs exist */}
      {docCount !== null && docCount > 0 && (
        <div style={{ marginTop: 24 }}>
          <SemesterIntelligenceWidget />
        </div>
      )}
    </div>
  );
}


// ── Sub-components ───────────────────────────────────────────────

function QuickStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <GlassCard hover={false} style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ color, opacity: 0.8 }}>{icon}</div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: "Syne, sans-serif", color: "#fff" }}>{value}</div>
          <div style={{ fontSize: 12, color: "rgba(160,180,230,0.6)", fontWeight: 500 }}>{label}</div>
        </div>
      </div>
    </GlassCard>
  );
}

function DeadlineRow({ deadline }: { deadline: any }) {
  const urgency = deadline.days_until <= 1 ? "#FF6C6C" : deadline.days_until <= 3 ? "#FFD700" : "#0066FF";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 4, height: 32, borderRadius: 4, background: deadline.course_color || "#0066FF" }} />
        <div>
          <div style={{ color: "#e8f0ff", fontWeight: 600, fontSize: 14 }}>{deadline.title}</div>
          <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 12, marginTop: 2 }}>
            {deadline.course_name || "General"} · {deadline.deadline_type}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: urgency }}>{deadline.days_until}d</div>
    </div>
  );
}

function TaskRow({ task }: { task: any }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
      <div style={{ width: 4, height: 32, borderRadius: 4, background: task.course_color || "#0066FF" }} />
      <div style={{ flex: 1 }}>
        <div style={{ color: "#e8f0ff", fontWeight: 600, fontSize: 14 }}>{task.title}</div>
        <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 12, marginTop: 2 }}>
          {new Date(task.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {task.course_name && ` · ${task.course_name}`}
        </div>
      </div>
      <StatusBadge status={task.status} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    completed: { bg: "rgba(0,255,136,0.1)", text: "#00FF88" },
    active: { bg: "rgba(0,102,255,0.1)", text: "#0066FF" },
    scheduled: { bg: "rgba(255,255,255,0.05)", text: "rgba(160,180,230,0.7)" },
    pending: { bg: "rgba(255,215,0,0.1)", text: "#FFD700" },
  };
  const c = colors[status] || colors.scheduled;
  return (
    <span style={{ padding: "4px 10px", borderRadius: 20, background: c.bg, color: c.text, fontSize: 11, fontWeight: 600, textTransform: "capitalize" }}>
      {status}
    </span>
  );
}

function ProgressCircle({ label, value, detail, color }: { label: string; value: number; detail: string; color: string }) {
  const size = 80;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circumference} initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }} transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div style={{ textAlign: "center", marginTop: -68 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{Math.round(value)}%</div>
        <div style={{ fontSize: 11, color: "rgba(160,180,230,0.5)", marginTop: 18 }}>{detail}</div>
      </div>
      <div style={{ fontSize: 12, color: "rgba(160,180,230,0.6)", fontWeight: 600, marginTop: 12 }}>{label}</div>
    </div>
  );
}

function ActionButton({ icon, label, onClick, color }: { icon: React.ReactNode; label: string; onClick: () => void; color: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 16px",
        background: `${color}11`,
        border: `1px solid ${color}33`,
        borderRadius: 14,
        color: "#e8f0ff",
        cursor: "pointer",
        fontFamily: "Space Grotesk, sans-serif",
        fontSize: 13,
        fontWeight: 600,
        transition: "all 0.2s",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget).style.background = `${color}22`;
        (e.currentTarget).style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget).style.background = `${color}11`;
        (e.currentTarget).style.transform = "translateY(0)";
      }}
    >
      <span style={{ color }}>{icon}</span>
      {label}
    </button>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: "24px 0", textAlign: "center", color: "rgba(160,180,230,0.4)", fontSize: 14 }}>
      <Target size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
      <div>{text}</div>
    </div>
  );
}

// ── Semester Intelligence Widget ─────────────────────────────────

function SemesterIntelligenceWidget() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    Promise.allSettled([
      fetch("/api/documents?limit=100").then((r) => r.json()),
      fetch("/api/deadlines").then((r) => r.json()),
      fetch("/api/flashcards/stats").then((r) => r.json()),
      fetch("/api/courses").then((r) => r.json()),
    ]).then(([docsRes, deadlinesRes, flashRes, coursesRes]) => {
      const docs = docsRes.status === "fulfilled" ? docsRes.value : { total: 0 };
      const deadlines = deadlinesRes.status === "fulfilled" ? deadlinesRes.value : { total: 0, overdue_count: 0 };
      const flash = flashRes.status === "fulfilled" ? flashRes.value : { total_cards: 0, mastered: 0, due_for_review: 0 };
      const courses = coursesRes.status === "fulfilled" && Array.isArray(coursesRes.value) ? coursesRes.value : [];

      const masteryPct = flash.total_cards > 0
        ? Math.round((flash.mastered / flash.total_cards) * 100)
        : 0;

      setData({
        docCount: docs.total ?? 0,
        courseCount: courses.length,
        totalDeadlines: deadlines.total ?? 0,
        overdueCount: deadlines.overdue_count ?? 0,
        masteryPct,
        dueCards: flash.due_for_review ?? 0,
        totalCards: flash.total_cards ?? 0,
      });
    });
  }, []);

  if (!data) return null;

  return (
    <GlassCard>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <BrainCircuit size={18} color="#00D4FF" />
        <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>
          Semester Intelligence
        </h3>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <IntelCard label="Documents" value={data.docCount} sublabel="uploaded" color="#0066FF" />
        <IntelCard label="Courses" value={data.courseCount} sublabel="active" color="#7B2FBE" />
        <IntelCard label="Deadlines" value={data.totalDeadlines} sublabel={data.overdueCount > 0 ? `${data.overdueCount} overdue` : "tracked"} color={data.overdueCount > 0 ? "#FF6C6C" : "#00D4FF"} />
        <IntelCard label="Mastery" value={`${data.masteryPct}%`} sublabel={`${data.dueCards} cards due`} color="#00FF88" />
      </div>
    </GlassCard>
  );
}

function IntelCard({ label, value, sublabel, color }: { label: string; value: string | number; sublabel: string; color: string }) {
  return (
    <div style={{ padding: "14px 16px", background: `${color}0A`, border: `1px solid ${color}20`, borderRadius: 14, textAlign: "center" }}>
      <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "Syne, sans-serif", color }}>{value}</div>
      <div style={{ fontSize: 12, color: "#e8f0ff", fontWeight: 600, marginTop: 2 }}>{label}</div>
      <div style={{ fontSize: 11, color: "rgba(160,180,230,0.4)", marginTop: 2 }}>{sublabel}</div>
    </div>
  );
}
