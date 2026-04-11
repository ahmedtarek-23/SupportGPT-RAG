import { motion, AnimatePresence } from "motion/react";
import {
  X, BookOpen, Mail, Clock, FileText, CalendarClock,
  Layers3, TrendingUp, CheckCircle2, AlertCircle, Sparkles,
} from "lucide-react";
import { useCourseDetails } from "../../hooks/useCourses";
import { LectureSlotEditor } from "./courses/LectureSlotEditor";
import type { OfficeHourSlot } from "../../types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  courseId: string | null;
  onClose: () => void;
}

export function CourseDetailPanel({ courseId, onClose }: Props) {
  const { details, loading, error } = useCourseDetails(courseId);
  const open = !!courseId;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
              zIndex: 100, backdropFilter: "blur(4px)",
            }}
          />

          {/* Panel */}
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
              background: "rgba(6, 8, 26, 0.97)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(32px)",
              zIndex: 101, overflow: "hidden",
              display: "flex", flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "24px 28px 20px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", gap: 14, flexShrink: 0,
            }}>
              {details && (
                <div style={{
                  width: 40, height: 40, borderRadius: 12,
                  background: details.course.color,
                  display: "grid", placeItems: "center", flexShrink: 0,
                }}>
                  <BookOpen size={18} color="#fff" />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{
                  fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 800,
                  color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {loading ? "Loading..." : (details?.course.name || "Course Details")}
                </h2>
                {details?.course.code && (
                  <span style={{
                    fontSize: 12, color: "rgba(160,180,230,0.6)", fontWeight: 600,
                    background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 6,
                  }}>
                    {details.course.code}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                style={{
                  background: "rgba(255,255,255,0.06)", border: "none",
                  color: "rgba(160,180,230,0.7)", padding: 8, borderRadius: 10,
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflow: "auto", padding: "24px 28px" }}>
              {loading && <LoadingSpinner />}
              {error && <ErrorState message={error} />}
              {!loading && !error && details && (
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

                  {/* Stats row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    <MiniStat
                      icon={<CalendarClock size={14} />}
                      label="Deadlines"
                      value={details.upcoming_deadlines.length}
                      color="#FF6C6C"
                    />
                    <MiniStat
                      icon={<Layers3 size={14} />}
                      label="Flashcards"
                      value={details.flashcards.total}
                      color="#00D4FF"
                    />
                    <MiniStat
                      icon={<TrendingUp size={14} />}
                      label="Study Hrs"
                      value={`${details.study_progress.total_hours}h`}
                      color="#00FF88"
                    />
                  </div>

                  {/* Instructor section */}
                  <Section title="Instructor">
                    {details.instructor.name ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
                            display: "grid", placeItems: "center", flexShrink: 0,
                          }}>
                            <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>
                              {details.instructor.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div style={{ color: "#fff", fontWeight: 600, fontSize: 15 }}>
                              {details.instructor.name}
                              {details.instructor.extracted_from_document && (
                                <span style={{ marginLeft: 8, fontSize: 10, color: "#00D4FF", fontWeight: 600 }}>
                                  <Sparkles size={10} style={{ display: "inline", marginRight: 2 }} />
                                  AI extracted
                                </span>
                              )}
                            </div>
                            {details.instructor.email && (
                              <a
                                href={`mailto:${details.instructor.email}`}
                                style={{ display: "flex", alignItems: "center", gap: 4, color: "#0066FF", fontSize: 12, textDecoration: "none", marginTop: 2 }}
                              >
                                <Mail size={11} /> {details.instructor.email}
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Office hours */}
                        {details.instructor.office_hours?.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 12, color: "rgba(160,180,230,0.5)", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
                              Office Hours
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                              {details.instructor.office_hours.map((oh: OfficeHourSlot, i: number) => (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex", alignItems: "center", gap: 10,
                                    padding: "8px 12px",
                                    background: "rgba(0,102,255,0.06)",
                                    border: "1px solid rgba(0,102,255,0.12)",
                                    borderRadius: 10,
                                  }}
                                >
                                  <Clock size={12} color="#0066FF" />
                                  <span style={{ color: "#e8f0ff", fontSize: 13, fontWeight: 600 }}>{oh.day}</span>
                                  <span style={{ color: "rgba(160,180,230,0.6)", fontSize: 13 }}>
                                    {oh.start} – {oh.end}
                                  </span>
                                  {oh.location && (
                                    <span style={{ marginLeft: "auto", color: "rgba(160,180,230,0.4)", fontSize: 11 }}>
                                      {oh.location}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {details.instructor.notes && (
                          <div style={{
                            padding: "12px 14px",
                            background: "rgba(255,255,255,0.02)",
                            border: "1px solid rgba(255,255,255,0.06)",
                            borderRadius: 12,
                            color: "rgba(200,210,255,0.7)",
                            fontSize: 13, lineHeight: 1.6,
                          }}>
                            {details.instructor.notes}
                          </div>
                        )}
                      </div>
                    ) : (
                      <EmptyRow text="No instructor info — upload a syllabus to extract automatically" />
                    )}
                  </Section>

                  {/* Flashcard progress */}
                  <Section title="Flashcard Progress">
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <RetentionRing
                        pct={details.flashcards.mastery_rate}
                        color="#00D4FF"
                        size={64}
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <StatLine label="Total cards" value={details.flashcards.total} color="#e8f0ff" />
                        <StatLine label="Mastered" value={details.flashcards.mastered} color="#00FF88" />
                        <StatLine label="Due for review" value={details.flashcards.due_for_review} color="#FFD700" />
                      </div>
                    </div>
                  </Section>

                  {/* Study progress */}
                  <Section title="Study Progress">
                    <ProgressBar
                      label="Session completion"
                      value={details.study_progress.completion_rate}
                      detail={`${details.study_progress.completed_sessions}/${details.study_progress.total_sessions} sessions`}
                      color="#00FF88"
                    />
                    <div style={{ marginTop: 8, fontSize: 13, color: "rgba(160,180,230,0.5)" }}>
                      Total study time: <strong style={{ color: "#fff" }}>{details.study_progress.total_hours}h</strong>
                    </div>
                  </Section>

                  {/* Upcoming deadlines */}
                  {details.upcoming_deadlines.length > 0 && (
                    <Section title="Upcoming Deadlines">
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {details.upcoming_deadlines.slice(0, 5).map(dl => (
                          <div
                            key={dl.id}
                            style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              padding: "10px 14px",
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              borderRadius: 12,
                            }}
                          >
                            <div>
                              <div style={{ color: "#e8f0ff", fontWeight: 600, fontSize: 13 }}>{dl.title}</div>
                              <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 11, marginTop: 2, textTransform: "capitalize" }}>
                                {dl.deadline_type}
                              </div>
                            </div>
                            <div style={{
                              fontSize: 14, fontWeight: 800,
                              color: dl.days_until <= 3 ? "#FF6C6C" : dl.days_until <= 7 ? "#FFD700" : "#0066FF",
                              fontFamily: "Syne, sans-serif",
                            }}>
                              {dl.days_until}d
                            </div>
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                  {/* Lecture Schedule */}
                  <Section title="Lecture Schedule">
                    <LectureSlotEditor courseId={details.course.id} />
                  </Section>

                  {/* Documents */}
                  {details.documents.length > 0 && (
                    <Section title={`Documents (${details.documents.length})`}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {details.documents.slice(0, 5).map(doc => (
                          <div
                            key={doc.id}
                            style={{
                              display: "flex", alignItems: "center", gap: 12,
                              padding: "10px 14px",
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              borderRadius: 12,
                            }}
                          >
                            <FileText size={14} color="#FF3366" style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                color: "#e8f0ff", fontSize: 13, fontWeight: 600,
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {doc.extracted_title || doc.filename}
                              </div>
                              {doc.extracted_summary && (
                                <div style={{
                                  color: "rgba(160,180,230,0.5)", fontSize: 11, marginTop: 2,
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                  {doc.extracted_summary}
                                </div>
                              )}
                            </div>
                            <DocStatusBadge status={doc.status} />
                          </div>
                        ))}
                      </div>
                    </Section>
                  )}

                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 style={{
        fontFamily: "Syne, sans-serif", fontSize: 13, fontWeight: 700,
        color: "rgba(160,180,230,0.5)", textTransform: "uppercase", letterSpacing: 1.5,
        margin: "0 0 12px",
      }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function MiniStat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div style={{
      padding: "12px 14px",
      background: `${color}0D`,
      border: `1px solid ${color}22`,
      borderRadius: 14, textAlign: "center",
    }}>
      <div style={{ color, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", fontFamily: "Syne, sans-serif" }}>{value}</div>
      <div style={{ fontSize: 11, color: "rgba(160,180,230,0.5)", fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function StatLine({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 13 }}>
      <span style={{ color: "rgba(160,180,230,0.5)" }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function ProgressBar({ label, value, detail, color }: { label: string; value: number; detail: string; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
        <span style={{ color: "#e8f0ff", fontWeight: 600 }}>{label}</span>
        <span style={{ color: "rgba(160,180,230,0.5)" }}>{detail}</span>
      </div>
      <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{ height: "100%", background: color, borderRadius: 4 }}
        />
      </div>
    </div>
  );
}

function RetentionRing({ pct, color, size }: { pct: number; color: string; size: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }} transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "grid", placeItems: "center",
        fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: "Syne, sans-serif",
      }}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}

function DocStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "#00FF88", processing: "#FFD700", pending: "rgba(160,180,230,0.5)", failed: "#FF6C6C",
  };
  const icons: Record<string, React.ReactNode> = {
    completed: <CheckCircle2 size={12} />,
    failed: <AlertCircle size={12} />,
  };
  const c = colors[status] || colors.pending;
  return (
    <span style={{
      display: "flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: 700, color: c,
      textTransform: "capitalize", flexShrink: 0,
    }}>
      {icons[status]} {status}
    </span>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div style={{ color: "rgba(160,180,230,0.4)", fontSize: 13, padding: "12px 0", textAlign: "center" }}>
      {text}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: 200 }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        style={{ width: 32, height: 32, border: "3px solid rgba(0,102,255,0.2)", borderTopColor: "#0066FF", borderRadius: "50%" }}
      />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ color: "#FF6C6C", textAlign: "center", padding: "40px 0", fontSize: 13 }}>
      <AlertCircle size={20} style={{ marginBottom: 8 }} />
      <div>{message}</div>
    </div>
  );
}
