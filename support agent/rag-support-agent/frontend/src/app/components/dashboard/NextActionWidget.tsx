/**
 * NextActionWidget
 *
 * "What should I study now?" — AI-powered next action engine.
 * Calls GET /api/analytics/insights and surfaces the single most urgent item:
 * weak subjects, missed deadlines, or risk alerts.
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { BrainCircuit, ArrowRight, AlertTriangle, Zap, BookOpen, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router";
import { api } from "../../../services/api";
import type { InsightsData } from "../../../types";

export function NextActionWidget() {
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.analytics.insights();
      setInsights(data);
    } catch {
      // silently fail — widget just won't show
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return null;
  if (!insights) return null;

  // Pick the single highest-priority item to surface
  const item = pickPrimaryAction(insights);
  if (!item) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginBottom: 24 }}
    >
      <div
        style={{
          padding: "18px 22px",
          background: `linear-gradient(135deg, ${item.color}12, ${item.color}06)`,
          border: `1px solid ${item.color}30`,
          borderRadius: 18,
          display: "flex", alignItems: "center", gap: 18,
          cursor: "pointer",
          transition: "all 0.2s",
        }}
        onClick={() => navigate(item.route)}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${item.color}1E, ${item.color}0D)`; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${item.color}12, ${item.color}06)`; }}
      >
        {/* Icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `${item.color}18`,
          border: `1px solid ${item.color}30`,
          display: "grid", placeItems: "center",
        }}>
          {item.icon}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: item.color, textTransform: "uppercase", letterSpacing: 1.5 }}>
              What should I study now?
            </span>
          </div>
          <div style={{ color: "#e8f0ff", fontWeight: 700, fontSize: 15, fontFamily: "Syne, sans-serif" }}>
            {item.title}
          </div>
          {item.subtitle && (
            <div style={{ color: "rgba(160,180,230,0.55)", fontSize: 12, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {item.subtitle}
            </div>
          )}
        </div>

        {/* CTA */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: item.color, fontWeight: 700, fontSize: 13, fontFamily: "Space Grotesk, sans-serif", flexShrink: 0 }}>
          {item.cta} <ArrowRight size={15} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Action picker ─────────────────────────────────────────────────────────────

interface ActionItem {
  title: string;
  subtitle?: string;
  cta: string;
  route: string;
  color: string;
  icon: React.ReactNode;
}

function pickPrimaryAction(insights: InsightsData): ActionItem | null {
  // 1. Missed deadlines — highest urgency
  if (insights.missed_deadlines && insights.missed_deadlines.length > 0) {
    const d = insights.missed_deadlines[0];
    return {
      title: `Overdue: ${d.title || d.deadline_title || "Deadline"}`,
      subtitle: d.course_name ? `${d.course_name} · ${d.days_overdue ?? 0} day${d.days_overdue !== 1 ? "s" : ""} overdue` : undefined,
      cta: "View Deadlines",
      route: "/deadlines",
      color: "#FF6C6C",
      icon: <AlertTriangle size={20} color="#FF6C6C" />,
    };
  }

  // 2. Risk alerts
  if (insights.risk_alerts && insights.risk_alerts.length > 0) {
    const r = insights.risk_alerts[0];
    return {
      title: r.message || r.title || "Upcoming risk",
      subtitle: r.course_name,
      cta: "Plan Ahead",
      route: "/planner",
      color: "#FFD700",
      icon: <AlertTriangle size={20} color="#FFD700" />,
    };
  }

  // 3. Weak subjects — prioritise review
  if (insights.weak_subjects && insights.weak_subjects.length > 0) {
    const w = insights.weak_subjects[0];
    return {
      title: `Weak area: ${w.topic || w.subject || w.course_name || "review needed"}`,
      subtitle: w.recommendation || `Mastery ${w.mastery_pct ?? 0}%`,
      cta: "Review Flashcards",
      route: "/flashcards",
      color: "#0066FF",
      icon: <Zap size={20} color="#0066FF" />,
    };
  }

  // 4. Focus recommendations
  if (insights.focus_recommendations && insights.focus_recommendations.length > 0) {
    const f = insights.focus_recommendations[0];
    return {
      title: f.recommendation || f.title || "Continue studying",
      subtitle: f.course_name,
      cta: "Open Planner",
      route: "/planner",
      color: "#7B2FBE",
      icon: <BrainCircuit size={20} color="#7B2FBE" />,
    };
  }

  // 5. Default: encourage flashcard review
  return {
    title: "Keep your knowledge sharp",
    subtitle: "Review your flashcards to maintain mastery",
    cta: "Review Now",
    route: "/flashcards",
    color: "#00D4FF",
    icon: <BookOpen size={20} color="#00D4FF" />,
  };
}
