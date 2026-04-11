import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CalendarClock, Plus, Trash2, X, Check, Clock, AlertCircle } from "lucide-react";
import { GlassCard, PageHeader } from "../components/shared/GlassCard";

const TYPES = ["assignment", "exam", "project", "quiz"];

const PRIORITY_CONFIG: Record<number, { label: string; color: string; dot: string }> = {
  1: { label: "Critical", color: "#FF6C6C", dot: "🔴" },
  2: { label: "Important", color: "#FFD700", dot: "🟡" },
  3: { label: "Normal", color: "#00FF88", dot: "🟢" },
};

export default function DeadlinesPage() {
  const [courses, setCourses] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);
  const [filterType, setFilterType] = useState<string>("");
  const [filterCourse, setFilterCourse] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Deadline form state
  const [dTitle, setDTitle] = useState("");
  const [dType, setDType] = useState("assignment");
  const [dCourse, setDCourse] = useState("");
  const [dDate, setDDate] = useState("");
  const [dPriority, setDPriority] = useState(2);
  const [dHours, setDHours] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchCourses(), fetchDeadlines()]);
      setLoading(false);
    };
    load();
  }, []);

  const fetchCourses = () =>
    fetch("/api/courses")
      .then((r) => r.json())
      .then(setCourses)
      .catch(() => setCourses([]));

  const fetchDeadlines = () =>
    fetch("/api/deadlines")
      .then((r) => r.json())
      .then((d) => setDeadlines(d.deadlines || []))
      .catch(() => setDeadlines([]));

  const createDeadline = async () => {
    if (!dTitle || !dDate) return;
    await fetch("/api/deadlines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: dTitle,
        deadline_type: dType,
        course_id: dCourse || null,
        due_date: new Date(dDate).toISOString(),
        priority: dPriority,
        estimated_hours: dHours ? parseFloat(dHours) : null,
      }),
    });
    setDTitle("");
    setDDate("");
    setDHours("");
    setDCourse("");
    setDPriority(2);
    setDType("assignment");
    setShowDeadlineForm(false);
    fetchDeadlines();
  };

  const deleteDeadline = async (id: string) => {
    await fetch(`/api/deadlines/${id}`, { method: "DELETE" });
    fetchDeadlines();
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/deadlines/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchDeadlines();
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 14,
    fontFamily: "Space Grotesk, sans-serif",
    outline: "none",
    boxSizing: "border-box",
  };

  const filtered = deadlines.filter((d) => {
    if (filterType && d.deadline_type !== filterType) return false;
    if (filterCourse && d.course_id !== filterCourse) return false;
    return true;
  });

  const upcoming = filtered.filter(
    (d) => d.status !== "completed" && new Date(d.due_date) >= new Date()
  );
  const overdue = filtered.filter(
    (d) => d.status !== "completed" && new Date(d.due_date) < new Date()
  );
  const completed = filtered.filter((d) => d.status === "completed");

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{
            width: 40,
            height: 40,
            border: "3px solid rgba(0,102,255,0.3)",
            borderTopColor: "#0066FF",
            borderRadius: "50%",
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Deadlines"
        subtitle="Track assignments, exams and projects"
        icon={<CalendarClock size={24} color="#0066FF" />}
      />

      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              ...inputStyle,
              width: "auto",
              padding: "8px 12px",
              cursor: "pointer",
              color: filterType ? "#e8f0ff" : "rgba(160,180,230,0.5)",
            }}
          >
            <option value="" style={{ background: "#0a0b1a" }}>
              All types
            </option>
            {TYPES.map((t) => (
              <option key={t} value={t} style={{ background: "#0a0b1a" }}>
                {t}
              </option>
            ))}
          </select>

          {/* Course filter */}
          {courses.length > 0 && (
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              style={{
                ...inputStyle,
                width: "auto",
                padding: "8px 12px",
                cursor: "pointer",
                color: filterCourse ? "#e8f0ff" : "rgba(160,180,230,0.5)",
              }}
            >
              <option value="" style={{ background: "#0a0b1a" }}>
                All courses
              </option>
              {courses.map((c: any) => (
                <option key={c.id} value={c.id} style={{ background: "#0a0b1a" }}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 13, alignSelf: "center" }}>
            {filtered.length} deadline{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        <button
          onClick={() => setShowDeadlineForm(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            cursor: "pointer",
            background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            boxShadow: "0 0 20px rgba(0,102,255,0.3)",
            whiteSpace: "nowrap",
          }}
        >
          <Plus size={16} /> Add Deadline
        </button>
      </div>

      {/* Add Deadline Form */}
      <AnimatePresence>
        {showDeadlineForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <GlassCard style={{ marginBottom: 20, borderColor: "rgba(0,102,255,0.2)" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <span
                  style={{
                    color: "#e8f0ff",
                    fontWeight: 600,
                    fontSize: 15,
                    fontFamily: "Syne, sans-serif",
                  }}
                >
                  New Deadline
                </span>
                <button
                  onClick={() => setShowDeadlineForm(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(160,180,230,0.5)",
                    padding: 4,
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <input
                  style={inputStyle}
                  placeholder="Deadline title *"
                  value={dTitle}
                  onChange={(e) => setDTitle(e.target.value)}
                />
                <input
                  style={inputStyle}
                  type="datetime-local"
                  value={dDate}
                  onChange={(e) => setDDate(e.target.value)}
                />
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={dType}
                  onChange={(e) => setDType(e.target.value)}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t} style={{ background: "#0a0b1a" }}>
                      {t}
                    </option>
                  ))}
                </select>
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={dCourse}
                  onChange={(e) => setDCourse(e.target.value)}
                >
                  <option value="" style={{ background: "#0a0b1a" }}>
                    No course
                  </option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id} style={{ background: "#0a0b1a" }}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  style={{ ...inputStyle, cursor: "pointer" }}
                  value={dPriority}
                  onChange={(e) => setDPriority(Number(e.target.value))}
                >
                  <option value={1} style={{ background: "#0a0b1a" }}>
                    🔴 Critical
                  </option>
                  <option value={2} style={{ background: "#0a0b1a" }}>
                    🟡 Important
                  </option>
                  <option value={3} style={{ background: "#0a0b1a" }}>
                    🟢 Normal
                  </option>
                </select>
                <input
                  style={inputStyle}
                  type="number"
                  placeholder="Estimated hours"
                  value={dHours}
                  onChange={(e) => setDHours(e.target.value)}
                />
              </div>

              {/* Sticky action row */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  marginTop: 16,
                  position: "sticky",
                  bottom: 0,
                  paddingTop: 4,
                }}
              >
                <button
                  onClick={createDeadline}
                  disabled={!dTitle || !dDate}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: 12,
                    border: "none",
                    cursor: !dTitle || !dDate ? "not-allowed" : "pointer",
                    background:
                      !dTitle || !dDate
                        ? "rgba(255,255,255,0.06)"
                        : "linear-gradient(135deg, #0066FF, #7B2FBE)",
                    color: !dTitle || !dDate ? "rgba(160,180,230,0.4)" : "#fff",
                    fontWeight: 700,
                    fontSize: 14,
                    transition: "all 0.2s",
                  }}
                >
                  Create Deadline
                </button>
                <button
                  onClick={() => setShowDeadlineForm(false)}
                  style={{
                    padding: "12px 20px",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    background: "transparent",
                    color: "rgba(160,180,230,0.7)",
                    fontSize: 14,
                  }}
                >
                  Cancel
                </button>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scrollable deadline list */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingRight: 4,
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Overdue section */}
        {overdue.length > 0 && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <AlertCircle size={14} color="#FF6C6C" />
              <span
                style={{
                  color: "#FF6C6C",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Overdue
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {overdue.map((d: any) => (
                <DeadlineCard
                  key={d.id}
                  d={d}
                  onComplete={updateStatus}
                  onDelete={deleteDeadline}
                  accent="#FF6C6C"
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming section */}
        {upcoming.length > 0 && (
          <div>
            <div style={{ marginBottom: 10 }}>
              <span
                style={{
                  color: "rgba(160,180,230,0.5)",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Upcoming
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {upcoming.map((d: any) => (
                <DeadlineCard
                  key={d.id}
                  d={d}
                  onComplete={updateStatus}
                  onDelete={deleteDeadline}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed section */}
        {completed.length > 0 && (
          <div>
            <div style={{ marginBottom: 10 }}>
              <span
                style={{
                  color: "rgba(160,180,230,0.3)",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Completed
              </span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {completed.map((d: any) => (
                <DeadlineCard
                  key={d.id}
                  d={d}
                  onComplete={updateStatus}
                  onDelete={deleteDeadline}
                  dimmed
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div
            style={{
              display: "grid",
              placeItems: "center",
              minHeight: 200,
              color: "rgba(160,180,230,0.4)",
              fontSize: 14,
              textAlign: "center",
              gap: 8,
            }}
          >
            <CalendarClock size={32} color="rgba(160,180,230,0.2)" />
            <div>No deadlines yet</div>
            <div style={{ fontSize: 12 }}>
              Add a deadline above or upload a syllabus to auto-detect them
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Deadline Card ──────────────────────────────────────────────────

interface DeadlineCardProps {
  d: any;
  onComplete: (id: string, status: string) => void;
  onDelete: (id: string) => void;
  accent?: string;
  dimmed?: boolean;
}

function DeadlineCard({ d, onComplete, onDelete, accent, dimmed }: DeadlineCardProps) {
  const barColor = accent || d.course_color || "#0066FF";
  const daysAbs =
    d.days_until_due !== undefined ? Math.abs(d.days_until_due) : null;
  const isOverdue = d.days_until_due !== undefined && d.days_until_due < 0;

  return (
    <GlassCard
      hover={false}
      style={{
        padding: "14px 20px",
        opacity: dimmed ? 0.5 : 1,
        transition: "opacity 0.2s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <div
            style={{
              width: 4,
              height: 40,
              borderRadius: 4,
              background: barColor,
              flexShrink: 0,
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                color: dimmed ? "rgba(232,240,255,0.5)" : "#e8f0ff",
                fontWeight: 600,
                fontSize: 15,
                textDecoration: dimmed ? "line-through" : "none",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {d.title}
            </div>
            <div
              style={{
                color: "rgba(160,180,230,0.5)",
                fontSize: 12,
                marginTop: 3,
                display: "flex",
                gap: 6,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <span>{d.course_name || "General"}</span>
              <span>·</span>
              <span style={{ textTransform: "capitalize" }}>{d.deadline_type}</span>
              <span>·</span>
              <Clock size={11} />
              <span>{new Date(d.due_date).toLocaleDateString()}</span>
              {d.estimated_hours && (
                <>
                  <span>·</span>
                  <span>{d.estimated_hours}h</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexShrink: 0,
            marginLeft: 12,
          }}
        >
          {daysAbs !== null && !dimmed && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: isOverdue ? "#FF6C6C" : daysAbs <= 3 ? "#FFD700" : "#0066FF",
                minWidth: 36,
                textAlign: "right",
              }}
            >
              {isOverdue ? `${daysAbs}d ago` : `${daysAbs}d`}
            </span>
          )}

          {d.status !== "completed" && (
            <button
              onClick={() => onComplete(d.id, "completed")}
              title="Mark complete"
              style={{
                background: "rgba(0,255,136,0.08)",
                border: "1px solid rgba(0,255,136,0.2)",
                borderRadius: 8,
                cursor: "pointer",
                padding: 6,
                display: "grid",
                placeItems: "center",
              }}
            >
              <Check size={14} color="#00FF88" />
            </button>
          )}

          <button
            onClick={() => onDelete(d.id)}
            title="Delete"
            style={{
              background: "rgba(255,108,108,0.06)",
              border: "1px solid rgba(255,108,108,0.15)",
              borderRadius: 8,
              cursor: "pointer",
              padding: 6,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Trash2 size={14} color="#FF6C6C" />
          </button>
        </div>
      </div>
    </GlassCard>
  );
}
