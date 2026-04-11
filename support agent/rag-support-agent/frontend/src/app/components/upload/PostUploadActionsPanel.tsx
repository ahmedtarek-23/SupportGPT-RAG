/**
 * PostUploadActionsPanel
 *
 * Shown after the MetadataConfirmationModal is confirmed.
 * Summarises what was created (course, deadlines, flashcards) and offers
 * quick navigation actions without leaving the dashboard.
 */

import { motion, AnimatePresence } from "motion/react";
import { CheckCircle, X, BookMarked, CalendarClock, Layers3, MessageSquare, BrainCircuit, Zap } from "lucide-react";
import { useNavigate } from "react-router";
import { api } from "../../../services/api";
import { toast } from "sonner";
import { useState } from "react";

interface ConfirmResult {
  course_id: string | null;
  deadlines_created: number;
  flashcards_created: number;
}

interface PostUploadActionsPanelProps {
  docId: string;
  docName: string;
  result: ConfirmResult;
  onClose: () => void;
}

export function PostUploadActionsPanel({ docId, docName, result, onClose }: PostUploadActionsPanelProps) {
  const navigate = useNavigate();
  const [generatingMore, setGeneratingMore] = useState(false);

  const handleGenerateMoreFlashcards = async () => {
    setGeneratingMore(true);
    try {
      const res = await api.documents.generateFlashcards(docId, 10);
      toast.success(`Generated ${res.flashcards_created} more flashcard${res.flashcards_created !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to generate flashcards");
    } finally {
      setGeneratingMore(false);
    }
  };

  const stats = [
    result.course_id && { label: "Course created", color: "#0066FF", icon: <BookMarked size={14} /> },
    result.deadlines_created > 0 && { label: `${result.deadlines_created} deadline${result.deadlines_created > 1 ? "s" : ""} added`, color: "#FFD700", icon: <CalendarClock size={14} /> },
    result.flashcards_created > 0 && { label: `${result.flashcards_created} flashcard${result.flashcards_created > 1 ? "s" : ""} created`, color: "#00D4FF", icon: <Layers3 size={14} /> },
  ].filter(Boolean) as { label: string; color: string; icon: React.ReactNode }[];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.75)",
          backdropFilter: "blur(10px)",
          zIndex: 500,
          display: "grid", placeItems: "center",
          padding: 24,
        }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.92, y: 24 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 24 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          style={{
            background: "rgba(8,10,28,0.98)",
            border: "1px solid rgba(0,255,136,0.15)",
            borderRadius: 28,
            padding: "36px 40px",
            width: "100%", maxWidth: 480,
            backdropFilter: "blur(32px)",
            boxShadow: "0 40px 120px rgba(0,0,0,0.5), 0 0 60px rgba(0,255,136,0.05)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,212,255,0.1))",
                border: "1px solid rgba(0,255,136,0.2)",
                display: "grid", placeItems: "center",
              }}>
                <CheckCircle size={24} color="#00FF88" />
              </div>
              <div>
                <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 800, color: "#fff", margin: 0, lineHeight: 1.2 }}>
                  Document Processed!
                </h2>
                <p style={{ color: "rgba(160,180,230,0.5)", fontSize: 12, margin: "5px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>
                  {docName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(160,180,230,0.6)", padding: 8, borderRadius: 10, cursor: "pointer", flexShrink: 0 }}
            >
              <X size={16} />
            </button>
          </div>

          {/* What was created */}
          {stats.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
              {stats.map((s, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 14px",
                    background: `${s.color}0D`,
                    border: `1px solid ${s.color}22`,
                    borderRadius: 12,
                  }}
                >
                  <span style={{ color: s.color }}>{s.icon}</span>
                  <span style={{ color: "#e8f0ff", fontSize: 13, fontWeight: 600 }}>{s.label}</span>
                </div>
              ))}
              {stats.length === 0 && (
                <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 13, textAlign: "center", padding: "12px 0" }}>
                  Document ingested — ready for AI chat
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 20 }} />

          {/* Quick actions */}
          <p style={{ color: "rgba(160,180,230,0.4)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 12px" }}>
            What's next?
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <NavButton
              icon={<Zap size={16} />}
              label={generatingMore ? "Generating…" : "More Flashcards"}
              onClick={handleGenerateMoreFlashcards}
              color="#FFD700"
              disabled={generatingMore}
            />
            <NavButton
              icon={<MessageSquare size={16} />}
              label="Chat About It"
              onClick={() => { navigate("/chat"); onClose(); }}
              color="#0066FF"
            />
            <NavButton
              icon={<BrainCircuit size={16} />}
              label="Study Planner"
              onClick={() => { navigate("/planner"); onClose(); }}
              color="#7B2FBE"
            />
            <NavButton
              icon={<Layers3 size={16} />}
              label="Review Flashcards"
              onClick={() => { navigate("/flashcards"); onClose(); }}
              color="#00D4FF"
            />
          </div>

          <button
            onClick={onClose}
            style={{
              marginTop: 16, width: "100%", padding: "12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, color: "rgba(160,180,230,0.6)",
              fontFamily: "Space Grotesk, sans-serif", fontSize: 13, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Back to Dashboard
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function NavButton({
  icon, label, onClick, color, disabled = false,
}: {
  icon: React.ReactNode; label: string; onClick: () => void; color: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 14px",
        background: `${color}0D`,
        border: `1px solid ${color}22`,
        borderRadius: 14,
        color: disabled ? "rgba(160,180,230,0.4)" : "#e8f0ff",
        fontFamily: "Space Grotesk, sans-serif", fontSize: 13, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s",
        textAlign: "left",
        opacity: disabled ? 0.6 : 1,
      }}
      onMouseEnter={(e) => !disabled && ((e.currentTarget).style.background = `${color}1A`)}
      onMouseLeave={(e) => !disabled && ((e.currentTarget).style.background = `${color}0D`)}
    >
      <span style={{ color: disabled ? "rgba(160,180,230,0.4)" : color }}>{icon}</span>
      {label}
    </button>
  );
}
