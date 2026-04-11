import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BrainCircuit, Sparkles, Clock, ChevronLeft, ChevronRight,
  AlertCircle, Upload, RefreshCw, Zap, CalendarClock,
} from "lucide-react";
import { GlassCard, PageHeader } from "../components/shared/GlassCard";
import { PomodoroTimer } from "../components/PomodoroTimer";
import { toast } from "sonner";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const COURSE_COLORS = ["#0066FF", "#7B2FBE", "#00D4FF", "#00FF88", "#FF3366", "#FFD700", "#FF8C00"];

function getWeekStart(offset = 0): Date {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function formatWeek(start: Date): string {
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function StudyPlannerPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [plan, setPlan] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any>(null);
  const [deadlineCount, setDeadlineCount] = useState(0);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [docCount, setDocCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const weekStart = getWeekStart(weekOffset);
  const weekStartISO = weekStart.toISOString().split("T")[0];

  const loadData = async () => {
    setLoading(true);
    try {
      const [planRes, sessionsRes, workloadRes, deadlinesRes, docsRes, flashRes] = await Promise.allSettled([
        fetch("/api/planner/current").then((r) => r.json()),
        fetch("/api/planner/sessions").then((r) => r.json()),
        fetch("/api/planner/workload").then((r) => r.json()),
        fetch("/api/deadlines").then((r) => r.json()),
        fetch("/api/documents?limit=1").then((r) => r.json()),
        fetch("/api/flashcards/weak-topics").then((r) => r.json()),
      ]);

      if (planRes.status === "fulfilled" && planRes.value?.id) setPlan(planRes.value);
      if (sessionsRes.status === "fulfilled" && Array.isArray(sessionsRes.value)) setSessions(sessionsRes.value);
      if (workloadRes.status === "fulfilled") setWorkload(workloadRes.value);
      if (deadlinesRes.status === "fulfilled") setDeadlineCount(deadlinesRes.value?.upcoming_count ?? 0);
      if (docsRes.status === "fulfilled") setDocCount(docsRes.value?.total ?? 0);
      if (flashRes.status === "fulfilled" && Array.isArray(flashRes.value)) {
        setWeakTopics(flashRes.value.map((t: any) => t.topic || t).slice(0, 5));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const generatePlan = async () => {
    if (docCount === 0) {
      toast.error("Upload your course materials first — AI needs them to build your plan");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch("/api/planner/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          week_start: weekStartISO,
          preferences: { hours_per_day: 6, preferred_times: ["morning", "afternoon"] },
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setPlan(data);
      setSessions(data.blocks || []);
      toast.success("Study plan generated");
    } catch {
      toast.error("Failed to generate plan. Make sure Ollama is running.");
    } finally {
      setGenerating(false);
    }
  };

  // Group sessions by day of week (0 = Mon)
  const sessionsByDay: Record<number, any[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  sessions.forEach((s) => {
    const date = new Date(s.scheduled_start || s.start_time || s.date);
    const day = (date.getDay() + 6) % 7; // convert Sun=0 → Mon=0
    if (sessionsByDay[day]) sessionsByDay[day].push(s);
  });

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ width: 40, height: 40, border: "3px solid rgba(123,47,190,0.3)", borderTopColor: "#7B2FBE", borderRadius: "50%" }}
        />
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <PageHeader
        title="Study Planner"
        subtitle="AI-generated schedule based on your deadlines and uploaded materials"
        icon={<BrainCircuit size={24} color="#7B2FBE" />}
      />

      {/* No documents empty state */}
      {docCount === 0 && (
        <GlassCard style={{ marginBottom: 20, borderColor: "rgba(123,47,190,0.2)", background: "rgba(123,47,190,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "4px 0" }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(123,47,190,0.15)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Upload size={22} color="#7B2FBE" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#e8f0ff", fontWeight: 700, fontSize: 15, marginBottom: 3 }}>Upload materials to enable AI planning</div>
              <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 13 }}>
                Upload a syllabus or lecture PDF — the planner uses your deadlines, course difficulty, and weak topics to schedule study sessions.
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Plan signals banner */}
      {docCount > 0 && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <Signal icon={<CalendarClock size={13} />} label={`${deadlineCount} upcoming deadlines`} color="#0066FF" />
          <Signal icon={<Zap size={13} />} label={`${weakTopics.length} weak topics detected`} color="#FFD700" />
          <Signal icon={<BrainCircuit size={13} />} label={`${docCount} document${docCount !== 1 ? "s" : ""} uploaded`} color="#00D4FF" />
        </div>
      )}

      {/* Week nav + generate button */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setWeekOffset((w) => w - 1)} style={navBtnStyle}>
            <ChevronLeft size={16} />
          </button>
          <span style={{ color: "#e8f0ff", fontWeight: 600, fontSize: 14, minWidth: 200, textAlign: "center" }}>
            {formatWeek(weekStart)}
          </span>
          <button onClick={() => setWeekOffset((w) => w + 1)} style={navBtnStyle}>
            <ChevronRight size={16} />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)} style={{ ...navBtnStyle, fontSize: 11, padding: "6px 12px" }}>
              Today
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={loadData}
            style={{ ...navBtnStyle, padding: "10px" }}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={generatePlan}
            disabled={generating}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 12, border: "none",
              cursor: generating ? "not-allowed" : "pointer",
              background: generating ? "rgba(123,47,190,0.3)" : "linear-gradient(135deg, #7B2FBE, #0066FF)",
              color: "#fff", fontFamily: "Space Grotesk, sans-serif", fontSize: 13, fontWeight: 700,
              boxShadow: generating ? "none" : "0 4px 20px rgba(123,47,190,0.3)",
            }}
          >
            {generating
              ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Sparkles size={14} /></motion.div> Generating...</>
              : <><Sparkles size={14} /> Generate Plan</>
            }
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, flex: 1, minHeight: 0 }}>

        {/* ── Weekly calendar grid ─────────────────────────────── */}
        <GlassCard style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* Day headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 12 }}>
            {DAYS.map((day, i) => {
              const date = new Date(weekStart);
              date.setDate(weekStart.getDate() + i);
              const isToday = date.toDateString() === new Date().toDateString();
              return (
                <div
                  key={day}
                  style={{
                    textAlign: "center", padding: "8px 4px",
                    borderRadius: 10,
                    background: isToday ? "rgba(0,102,255,0.12)" : "transparent",
                    border: isToday ? "1px solid rgba(0,102,255,0.25)" : "1px solid transparent",
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? "#0066FF" : "rgba(160,180,230,0.5)", textTransform: "uppercase", letterSpacing: 1 }}>
                    {day}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: isToday ? "#0066FF" : "#e8f0ff", marginTop: 2 }}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Session blocks */}
          {plan ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, flex: 1, overflowY: "auto" }}>
              {DAYS.map((_, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {(sessionsByDay[i] || []).map((s: any, j: number) => {
                    const color = s.course_color || COURSE_COLORS[j % COURSE_COLORS.length];
                    const start = s.scheduled_start || s.start_time || "";
                    const end = s.scheduled_end || s.end_time || "";
                    return (
                      <motion.div
                        key={s.id || j}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 + j * 0.02 }}
                        style={{
                          padding: "10px 10px",
                          background: `${color}18`,
                          border: `1px solid ${color}33`,
                          borderLeft: `3px solid ${color}`,
                          borderRadius: 10,
                        }}
                      >
                        <div style={{ color: "#e8f0ff", fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>
                          {s.title || s.course_name || "Study session"}
                        </div>
                        {start && (
                          <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 10, marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                            <Clock size={9} />
                            {new Date(start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {end && ` – ${new Date(end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
                          </div>
                        )}
                        {s.status && s.status !== "scheduled" && (
                          <div style={{ marginTop: 4, fontSize: 9, textTransform: "capitalize", color, fontWeight: 700 }}>
                            {s.status}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  {(sessionsByDay[i] || []).length === 0 && (
                    <div style={{ height: 40, borderRadius: 10, background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.06)" }} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ flex: 1, display: "grid", placeItems: "center" }}>
              <div style={{ textAlign: "center", padding: 40 }}>
                <BrainCircuit size={40} color="rgba(123,47,190,0.3)" style={{ marginBottom: 16 }} />
                <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 14, marginBottom: 8 }}>
                  No plan for this week
                </div>
                <div style={{ color: "rgba(160,180,230,0.3)", fontSize: 12 }}>
                  {docCount > 0
                    ? "Click \"Generate Plan\" to create your personalized schedule"
                    : "Upload your course materials first, then generate a plan"}
                </div>
              </div>
            </div>
          )}
        </GlassCard>

        {/* ── Right sidebar ────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto" }}>

          {/* AI Reasoning */}
          {plan?.ai_reasoning && (
            <GlassCard style={{ borderColor: "rgba(123,47,190,0.2)", background: "rgba(123,47,190,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Sparkles size={14} color="#7B2FBE" />
                <span style={{ color: "rgba(160,180,230,0.6)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                  AI Reasoning
                </span>
              </div>
              <p style={{ color: "rgba(200,210,255,0.75)", fontSize: 13, lineHeight: 1.65, margin: 0 }}>
                {plan.ai_reasoning}
              </p>
            </GlassCard>
          )}

          {/* Workload stats */}
          {workload && (
            <GlassCard>
              <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
                This Week
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <StatRow label="Planned hours" value={`${workload.total_hours_this_week ?? 0}h`} color="#0066FF" />
                <StatRow label="Busiest day" value={workload.busiest_day || "—"} color="#FFD700" />
                <StatRow label="Balance score" value={workload.balance_score ? `${workload.balance_score}%` : "—"} color="#00FF88" />
              </div>
              {workload.suggestions?.length > 0 && (
                <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
                  <div style={{ color: "#00D4FF", fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Suggestions</div>
                  {workload.suggestions.slice(0, 2).map((s: string, i: number) => (
                    <div key={i} style={{ color: "rgba(160,180,230,0.6)", fontSize: 12, marginBottom: 4, display: "flex", gap: 6 }}>
                      <span style={{ color: "#00D4FF", flexShrink: 0 }}>·</span> {s}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          )}

          {/* Weak topics */}
          {weakTopics.length > 0 && (
            <GlassCard>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Zap size={13} color="#FFD700" />
                <span style={{ color: "rgba(160,180,230,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
                  Weak Topics
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {weakTopics.map((t, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(255,215,0,0.05)", borderRadius: 8, border: "1px solid rgba(255,215,0,0.12)" }}>
                    <AlertCircle size={11} color="#FFD700" />
                    <span style={{ color: "rgba(200,210,255,0.7)", fontSize: 12 }}>{t}</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Pomodoro */}
          <PomodoroTimer />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function Signal({ icon, label, color }: { icon: React.ReactNode; label: string; color: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      padding: "6px 12px", borderRadius: 8,
      background: `${color}10`, border: `1px solid ${color}25`,
      color, fontSize: 12, fontWeight: 600,
    }}>
      {icon} {label}
    </div>
  );
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: "rgba(160,180,230,0.5)", fontSize: 13 }}>{label}</span>
      <span style={{ color, fontWeight: 700, fontSize: 14 }}>{value}</span>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "8px 12px", borderRadius: 10,
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(160,180,230,0.7)", cursor: "pointer",
};
