import { useState } from "react";
import { motion } from "motion/react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  AreaChart, Area,
} from "recharts";
import {
  LineChart as LineChartIcon, TrendingUp, Target, Zap,
  Flame, BookOpen, Brain, AlertCircle, RefreshCw,
} from "lucide-react";
import { GlassCard, PageHeader } from "../components/shared/GlassCard";
import {
  useAnalyticsOverview, useStudyHours, useRetention,
  useStreaks, useInsights,
} from "../../hooks/useAnalytics";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#FF6C6C", warning: "#FFD700", medium: "#FF8C00",
  info: "#0066FF", high: "#FF3366",
};

export default function AnalyticsPage() {
  const [hoursDays, setHoursDays] = useState(30);
  const [hoursGroup, setHoursGroup] = useState<"day" | "week" | "course">("day");

  const overview = useAnalyticsOverview();
  const studyHours = useStudyHours(hoursDays, hoursGroup);
  const retention = useRetention();
  const streaks = useStreaks();
  const insights = useInsights();

  const anyLoading = overview.loading || studyHours.loading;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
        <PageHeader
          title="Analytics"
          subtitle="Track your study performance and learning retention"
          icon={<LineChartIcon size={24} color="#FFD700" />}
        />
        <button
          onClick={() => { overview.refetch(); studyHours.refetch(); retention.refetch(); streaks.refetch(); insights.refetch(); }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "10px 16px", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
            color: "rgba(160,180,230,0.7)", cursor: "pointer", fontSize: 13,
            fontFamily: "Space Grotesk, sans-serif",
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Overview stats ─────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard
          title="Study Hours" icon={<TrendingUp size={18} />} color="#FFD700"
          value={overview.loading ? "—" : `${overview.data?.study_time.total_hours_all_time ?? 0}h`}
          sub={overview.data ? `${overview.data.sessions_30d.total} sessions (30d)` : ""}
        />
        <StatCard
          title="Deadline Rate" icon={<Target size={18} />} color="#00FF88"
          value={overview.loading ? "—" : `${overview.data?.deadlines.completion_rate ?? 0}%`}
          sub={overview.data ? `${overview.data.deadlines.completed}/${overview.data.deadlines.total} done` : ""}
        />
        <StatCard
          title="Card Mastery" icon={<Brain size={18} />} color="#00D4FF"
          value={overview.loading ? "—" : `${overview.data?.flashcards.mastery_rate ?? 0}%`}
          sub={overview.data ? `${overview.data.flashcards.mastered}/${overview.data.flashcards.total} mastered` : ""}
        />
        <StatCard
          title="Study Streak" icon={<Flame size={18} />} color="#FF8C00"
          value={streaks.loading ? "—" : `${streaks.data?.current_streak ?? 0}d`}
          sub={streaks.data ? `${streaks.data.days_studied_this_week}/7 days this week` : ""}
        />
      </div>

      {/* ── Study hours chart ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
        <GlassCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={cardTitle}>Study Hours</h3>
            <div style={{ display: "flex", gap: 8 }}>
              {/* Days selector */}
              {[7, 14, 30].map(d => (
                <TabBtn key={d} label={`${d}d`} active={hoursDays === d && hoursGroup !== "course"} onClick={() => { setHoursDays(d); setHoursGroup("day"); }} />
              ))}
              <TabBtn label="By Course" active={hoursGroup === "course"} onClick={() => setHoursGroup("course")} />
            </div>
          </div>

          {studyHours.loading ? (
            <LoadingBar />
          ) : studyHours.error ? (
            <ErrorInline />
          ) : hoursGroup === "course" && studyHours.data?.courses ? (
            // Course breakdown bar chart
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={studyHours.data.courses.map(c => ({ name: c.course_name.split(" ")[0], hours: c.hours, color: c.course_color }))}>
                  <XAxis dataKey="name" tick={{ fill: "rgba(160,180,230,0.6)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(160,180,230,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  <Bar dataKey="hours" radius={[6, 6, 0, 0]}>
                    {studyHours.data.courses.map((c, i) => (
                      <Cell key={i} fill={c.course_color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            // Daily/weekly area chart
            <div style={{ height: 180 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={(studyHours.data?.labels || []).map((l, i) => ({
                    date: l.split("-").slice(1).join("/"),
                    hours: studyHours.data?.values[i] ?? 0,
                  }))}
                >
                  <defs>
                    <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0066FF" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#0066FF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: "rgba(160,180,230,0.5)", fontSize: 10 }} axisLine={false} tickLine={false}
                    interval={Math.ceil((studyHours.data?.labels.length ?? 1) / 7) - 1}
                  />
                  <YAxis tick={{ fill: "rgba(160,180,230,0.4)", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
                  <Area type="monotone" dataKey="hours" stroke="#0066FF" strokeWidth={2} fill="url(#hoursGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: "rgba(160,180,230,0.4)" }}>
            Total: <strong style={{ color: "#fff" }}>{studyHours.data?.total_hours ?? 0}h</strong>
            {studyHours.data?.avg_per_day !== undefined && (
              <> · Avg: <strong style={{ color: "#fff" }}>{studyHours.data.avg_per_day}h/day</strong></>
            )}
          </div>
        </GlassCard>

        {/* Streak heatmap */}
        <GlassCard>
          <h3 style={{ ...cardTitle, marginBottom: 16 }}>
            <Flame size={16} color="#FF8C00" style={{ display: "inline", marginRight: 6 }} />
            Study Streak
          </h3>
          {streaks.loading ? (
            <LoadingBar />
          ) : (
            <>
              <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
                <StreakStat label="Current" value={`${streaks.data?.current_streak ?? 0}d`} color="#FF8C00" />
                <StreakStat label="Best (30d)" value={`${streaks.data?.longest_streak_30d ?? 0}d`} color="#FFD700" />
                <StreakStat label="This Week" value={`${streaks.data?.days_studied_this_week ?? 0}/7`} color="#00FF88" />
              </div>

              {/* Heatmap */}
              {streaks.data?.heatmap && (
                <div>
                  <div style={{ fontSize: 11, color: "rgba(160,180,230,0.4)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Last 30 Days</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
                    {Object.entries(streaks.data.heatmap).slice(-28).map(([date, active], i) => (
                      <div
                        key={i}
                        title={date}
                        style={{
                          aspectRatio: "1", borderRadius: 4,
                          background: active ? "#FF8C00" : "rgba(255,255,255,0.05)",
                          transition: "transform 0.2s",
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </GlassCard>
      </div>

      {/* ── Retention + Insights ─────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Retention by course */}
        <GlassCard>
          <h3 style={{ ...cardTitle, marginBottom: 20 }}>
            <BookOpen size={16} color="#00D4FF" style={{ display: "inline", marginRight: 6 }} />
            Flashcard Retention
          </h3>
          {retention.loading ? <LoadingBar /> : retention.error ? <ErrorInline /> : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "Syne, sans-serif", color: "#00D4FF" }}>
                    {retention.data?.overall_retention_pct ?? 0}%
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(160,180,230,0.5)" }}>overall mastery</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{retention.data?.total_mastered ?? 0}</div>
                  <div style={{ fontSize: 12, color: "rgba(160,180,230,0.4)" }}>mastered / {retention.data?.total_cards ?? 0} total</div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {(retention.data?.per_course || []).map(c => (
                  <div key={c.course_id}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
                      <span style={{ color: "#e8f0ff", fontWeight: 600 }}>{c.course_name}</span>
                      <span style={{ color: "rgba(160,180,230,0.5)" }}>{c.mastered_cards}/{c.total_cards}</span>
                    </div>
                    <div style={{ height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 4, overflow: "hidden" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${c.retention_pct}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        style={{ height: "100%", background: c.course_color, borderRadius: 4 }}
                      />
                    </div>
                  </div>
                ))}
                {(retention.data?.per_course?.length ?? 0) === 0 && (
                  <div style={{ color: "rgba(160,180,230,0.4)", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                    Review flashcards to see retention stats
                  </div>
                )}
              </div>
            </>
          )}
        </GlassCard>

        {/* AI Insights */}
        <GlassCard>
          <h3 style={{ ...cardTitle, marginBottom: 20 }}>
            <Zap size={16} color="#7B2FBE" style={{ display: "inline", marginRight: 6 }} />
            AI Insights
          </h3>
          {insights.loading ? <LoadingBar /> : insights.error ? <ErrorInline /> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ...(insights.data?.risk_alerts || []),
                ...(insights.data?.focus_recommendations?.slice(0, 2) || []),
                ...(insights.data?.planner_tips || []),
                ...(insights.data?.weak_subjects?.slice(0, 2) || []),
              ].slice(0, 6).map((item: any, i: number) => (
                <InsightCard key={i} item={item} />
              ))}
              {(insights.data && [
                ...(insights.data.risk_alerts || []),
                ...(insights.data.focus_recommendations || []),
                ...(insights.data.planner_tips || []),
                ...(insights.data.weak_subjects || []),
              ].length === 0) && (
                <div style={{ textAlign: "center", padding: "30px 0", color: "rgba(160,180,230,0.4)", fontSize: 14 }}>
                  <Target size={24} style={{ marginBottom: 8, opacity: 0.4 }} />
                  <div>All on track — no alerts right now</div>
                </div>
              )}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function StatCard({ title, icon, color, value, sub }: { title: string; icon: React.ReactNode; color: string; value: string; sub: string }) {
  return (
    <GlassCard hover={false} style={{ padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "rgba(160,180,230,0.6)", fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>{title}</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: "Syne, sans-serif", color: "#fff" }}>{value}</div>
          <div style={{ fontSize: 11, color: "rgba(160,180,230,0.4)", marginTop: 4 }}>{sub}</div>
        </div>
        <div style={{ color, background: `${color}1A`, padding: 10, borderRadius: 12 }}>{icon}</div>
      </div>
    </GlassCard>
  );
}

function StreakStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "Syne, sans-serif", color }}>{value}</div>
      <div style={{ fontSize: 11, color: "rgba(160,180,230,0.4)" }}>{label}</div>
    </div>
  );
}

function InsightCard({ item }: { item: any }) {
  const sev = item.severity || "info";
  const color = SEVERITY_COLORS[sev] || "#0066FF";
  return (
    <div style={{
      padding: "12px 14px",
      background: `${color}0A`,
      border: `1px solid ${color}22`,
      borderRadius: 12,
      display: "flex", gap: 10, alignItems: "flex-start",
    }}>
      <AlertCircle size={14} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        {item.title && <div style={{ color: "#fff", fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{item.title}</div>}
        <div style={{ color: "rgba(200,210,255,0.7)", fontSize: 12, lineHeight: 1.5 }}>{item.insight}</div>
      </div>
    </div>
  );
}

function TabBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "rgba(0,102,255,0.2)" : "rgba(255,255,255,0.04)",
        border: active ? "1px solid rgba(0,102,255,0.4)" : "1px solid rgba(255,255,255,0.06)",
        color: active ? "#fff" : "rgba(160,180,230,0.5)",
        padding: "4px 12px", borderRadius: 8, cursor: "pointer",
        fontFamily: "Space Grotesk, sans-serif", fontSize: 12, fontWeight: 600,
        transition: "all 0.2s",
      }}
    >
      {label}
    </button>
  );
}

function LoadingBar() {
  return (
    <div style={{ height: 180, display: "grid", placeItems: "center" }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        style={{ width: 28, height: 28, border: "3px solid rgba(255,215,0,0.2)", borderTopColor: "#FFD700", borderRadius: "50%" }}
      />
    </div>
  );
}

function ErrorInline() {
  return (
    <div style={{ color: "#FF6C6C", textAlign: "center", padding: "40px 0", fontSize: 13 }}>
      <AlertCircle size={18} style={{ marginBottom: 6 }} />
      <div>Failed to load data</div>
    </div>
  );
}

const cardTitle: React.CSSProperties = {
  fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", margin: 0,
};

const tooltipStyle: React.CSSProperties = {
  background: "rgba(8,10,28,0.95)", border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10, color: "#fff", fontSize: 12,
};
