/**
 * MetadataConfirmationModal
 *
 * Shown after UploadCenterPanel completes when confidence is LOW or NONE.
 * Lets the user review, edit, and confirm AI-extracted academic metadata
 * before entities (course, deadlines, flashcards) are written to the DB.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, BookOpen, User, CalendarClock, Zap, Check, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ExtractedDoc {
  id: string;
  original_filename?: string;
  filename?: string;
  extracted_title?: string;
  extracted_summary?: string;
  extracted_instructor_name?: string;
  extracted_instructor_email?: string;
  extracted_dates?: Array<{ label: string; date: string; type: string }>;
  extracted_assignments?: Array<{ title: string; due_date?: string; description?: string }>;
  extraction_metadata?: {
    course_code?: string;
    semester?: string;
    flashcard_candidates?: Array<{ question: string; answer: string }>;
  };
  confidence_band?: string;
}

export interface ConfirmationResult {
  course_id: string | null;
  deadlines_created: number;
  flashcards_created: number;
}

interface MetadataConfirmationModalProps {
  doc: ExtractedDoc;
  onConfirmed: (result: ConfirmationResult) => void;
  onSkip: () => void;
}

export function MetadataConfirmationModal({ doc, onConfirmed, onSkip }: MetadataConfirmationModalProps) {
  const meta = doc.extraction_metadata || {};

  const [courseName, setCourseName] = useState(doc.extracted_title || "");
  const [courseCode, setCourseCode] = useState(meta.course_code || "");
  const [createCourse, setCreateCourse] = useState(true);
  const [instructorName, setInstructorName] = useState(doc.extracted_instructor_name || "");
  const [instructorEmail, setInstructorEmail] = useState(doc.extracted_instructor_email || "");

  // Deadlines: combine dates + assignments into one list
  const rawDeadlines = [
    ...(doc.extracted_dates || []).map((d) => ({
      title: d.label,
      due_date: d.date,
      deadline_type: d.type || "assignment",
      included: true,
    })),
    ...(doc.extracted_assignments || []).map((a) => ({
      title: a.title,
      due_date: a.due_date || "",
      deadline_type: "assignment" as string,
      included: true,
    })),
  ];
  const [deadlines, setDeadlines] = useState(rawDeadlines);

  const flashcardCandidates = meta.flashcard_candidates || [];
  const [includeFlashcards, setIncludeFlashcards] = useState(flashcardCandidates.length > 0);
  const [showFlashcardPreview, setShowFlashcardPreview] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  const confidenceBand = doc.confidence_band || "LOW";
  const isNone = confidenceBand === "NONE";

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          create_course: createCourse,
          confirmed_course_name: courseName || undefined,
          confirmed_course_code: courseCode || undefined,
          confirmed_instructor_name: instructorName || undefined,
          confirmed_deadlines: deadlines
            .filter((d) => d.included && d.due_date)
            .map(({ title, due_date, deadline_type }) => ({ title, due_date, deadline_type })),
          confirmed_flashcards: includeFlashcards
            ? flashcardCandidates.map(({ question, answer }) => ({ question, answer }))
            : [],
        }),
      });

      if (!res.ok) throw new Error("Confirmation failed");
      const result = await res.json();

      const parts = [];
      if (result.course_id) parts.push("Course created");
      if (result.deadlines_created) parts.push(`${result.deadlines_created} deadline${result.deadlines_created > 1 ? "s" : ""}`);
      if (result.flashcards_created) parts.push(`${result.flashcards_created} flashcard${result.flashcards_created > 1 ? "s" : ""}`);

      toast.success(parts.length ? `Created: ${parts.join(", ")}` : "Document confirmed");
      onConfirmed({
        course_id: result.course_id ?? null,
        deadlines_created: result.deadlines_created ?? 0,
        flashcards_created: result.flashcards_created ?? 0,
      });
    } catch {
      toast.error("Failed to confirm. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(12px)",
        zIndex: 400,
        display: "grid", placeItems: "center",
        padding: 24,
        overflowY: "auto",
      }}
      onClick={(e) => e.target === e.currentTarget && onSkip()}
    >
      <motion.div
        initial={{ scale: 0.9, y: 32 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 32 }}
        transition={{ type: "spring", damping: 22, stiffness: 240 }}
        style={{
          background: "rgba(8,10,28,0.99)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 28,
          width: "100%", maxWidth: 580,
          backdropFilter: "blur(40px)",
          boxShadow: "0 40px 120px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ padding: "28px 32px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <Sparkles size={18} color="#00D4FF" />
              <span style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 800, color: "#fff" }}>
                Review Detected Info
              </span>
            </div>
            <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 13 }}>
              {doc.filename || doc.original_filename} ·{" "}
              <span style={{
                color: isNone ? "#FF6C6C" : "#FFD700",
                fontWeight: 700,
                fontSize: 11,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}>
                {isNone ? "Low confidence — please review" : "Some fields need review"}
              </span>
            </div>
          </div>
          <button
            onClick={onSkip}
            style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(160,180,230,0.6)", padding: 8, borderRadius: 10, cursor: "pointer", flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Summary pill */}
        {doc.extracted_summary && (
          <div style={{ margin: "16px 32px 0", padding: "12px 16px", background: "rgba(0,212,255,0.06)", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 12 }}>
            <p style={{ color: "rgba(160,180,230,0.7)", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              {doc.extracted_summary}
            </p>
          </div>
        )}

        {/* Scrollable body */}
        <div style={{ padding: "20px 32px", maxHeight: "65vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Course section ─────────────────────────────────── */}
          <Section icon={<BookOpen size={15} />} title="Course" color="#0066FF">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Toggle value={createCourse} onChange={setCreateCourse} />
              <span style={{ color: "rgba(160,180,230,0.6)", fontSize: 13 }}>
                {createCourse ? "Create course from this file" : "Don't create a course"}
              </span>
            </div>
            {createCourse && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
                <input
                  style={inputStyle}
                  placeholder="Course name"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                />
                <input
                  style={{ ...inputStyle, width: 100 }}
                  placeholder="Code"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                />
              </div>
            )}
          </Section>

          {/* ── Instructor section ─────────────────────────────── */}
          <Section icon={<User size={15} />} title="Instructor" color="#7B2FBE">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input
                style={inputStyle}
                placeholder="Instructor name"
                value={instructorName}
                onChange={(e) => setInstructorName(e.target.value)}
              />
              <input
                style={inputStyle}
                placeholder="Email (optional)"
                value={instructorEmail}
                onChange={(e) => setInstructorEmail(e.target.value)}
              />
            </div>
          </Section>

          {/* ── Deadlines section ─────────────────────────────── */}
          {deadlines.length > 0 && (
            <Section icon={<CalendarClock size={15} />} title={`Deadlines (${deadlines.filter(d => d.included).length} selected)`} color="#00D4FF">
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {deadlines.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 12px",
                      background: d.included ? "rgba(0,212,255,0.06)" : "rgba(255,255,255,0.02)",
                      borderRadius: 10,
                      border: "1px solid",
                      borderColor: d.included ? "rgba(0,212,255,0.2)" : "rgba(255,255,255,0.06)",
                      transition: "all 0.2s",
                    }}
                  >
                    <button
                      onClick={() => setDeadlines(prev => prev.map((x, j) => j === i ? { ...x, included: !x.included } : x))}
                      style={{
                        width: 20, height: 20, borderRadius: 6,
                        background: d.included ? "linear-gradient(135deg, #0066FF, #7B2FBE)" : "rgba(255,255,255,0.06)",
                        border: "none", cursor: "pointer", flexShrink: 0,
                        display: "grid", placeItems: "center",
                      }}
                    >
                      {d.included && <Check size={11} color="#fff" strokeWidth={3} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: d.included ? "#e8f0ff" : "rgba(160,180,230,0.4)", fontSize: 13, fontWeight: 600 }}>{d.title}</div>
                      <div style={{ color: "rgba(160,180,230,0.4)", fontSize: 11 }}>
                        {d.deadline_type} · {d.due_date || "No date"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* ── Flashcards section ─────────────────────────────── */}
          {flashcardCandidates.length > 0 && (
            <Section icon={<Zap size={15} />} title="Flashcards" color="#FFD700">
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Toggle value={includeFlashcards} onChange={setIncludeFlashcards} color="#FFD700" />
                <span style={{ color: "rgba(160,180,230,0.6)", fontSize: 13 }}>
                  Create {flashcardCandidates.length} flashcard{flashcardCandidates.length > 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setShowFlashcardPreview(v => !v)}
                  style={{ marginLeft: "auto", background: "none", border: "none", color: "rgba(160,180,230,0.4)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
                >
                  Preview {showFlashcardPreview ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
              </div>
              <AnimatePresence>
                {showFlashcardPreview && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: "hidden" }}>
                    {flashcardCandidates.slice(0, 3).map((fc, i) => (
                      <div key={i} style={{ padding: "10px 12px", background: "rgba(255,215,0,0.04)", border: "1px solid rgba(255,215,0,0.12)", borderRadius: 10, marginBottom: 6 }}>
                        <div style={{ color: "#FFD700", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>Q: {fc.question}</div>
                        <div style={{ color: "rgba(160,180,230,0.6)", fontSize: 12 }}>A: {fc.answer}</div>
                      </div>
                    ))}
                    {flashcardCandidates.length > 3 && (
                      <div style={{ color: "rgba(160,180,230,0.4)", fontSize: 12, textAlign: "center", paddingTop: 4 }}>
                        +{flashcardCandidates.length - 3} more
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Section>
          )}
        </div>

        {/* Sticky footer */}
        <div style={{
          padding: "16px 32px 28px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          display: "flex", gap: 12,
        }}>
          <button
            onClick={onSkip}
            style={{
              padding: "12px 20px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14, color: "rgba(160,180,230,0.6)",
              fontFamily: "Space Grotesk, sans-serif", fontSize: 14, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Skip
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            style={{
              flex: 1, padding: "12px",
              background: submitting ? "rgba(0,102,255,0.3)" : "linear-gradient(135deg, #0066FF, #7B2FBE)",
              border: "none", borderRadius: 14, color: "#fff",
              fontFamily: "Space Grotesk, sans-serif", fontSize: 14, fontWeight: 700,
              cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: submitting ? "none" : "0 4px 20px rgba(0,102,255,0.3)",
            }}
          >
            {submitting ? "Creating..." : "Confirm & Create"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function Section({ icon, title, color, children }: {
  icon: React.ReactNode; title: string; color: string; children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div style={{ color, display: "flex" }}>{icon}</div>
        <span style={{ color: "rgba(160,180,230,0.7)", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, color = "#0066FF" }: {
  value: boolean; onChange: (v: boolean) => void; color?: string;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: 99,
        background: value ? color : "rgba(255,255,255,0.1)",
        border: "none", cursor: "pointer", position: "relative",
        transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ x: value ? 20 : 2 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        style={{ position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.3)" }}
      />
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12, color: "#fff",
  fontFamily: "Space Grotesk, sans-serif", fontSize: 14,
  outline: "none", boxSizing: "border-box",
};
