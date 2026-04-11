import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Plus, BookOpen, Trash2, Edit3, X, Mail, Clock, Upload, Sparkles,
} from "lucide-react";
import { GlassCard, PageHeader } from "../components/shared/GlassCard";
import { CourseDetailPanel } from "../components/CourseDetailPanel";
import { useCourses } from "../../hooks/useCourses";
import { toast } from "sonner";
import type { Course, CourseCreate } from "../../types";
import { api } from "../../services/api";
import { UploadCenterPanel } from "../components/upload/UploadCenterPanel";
import { MetadataConfirmationModal } from "../components/upload/MetadataConfirmationModal";

const PRESET_COLORS = [
  "#0066FF", "#7B2FBE", "#00D4FF", "#00FF88",
  "#FF3366", "#FFD700", "#FF8C00", "#FF6C6C",
];

const SEMESTER_OPTIONS = [
  "Spring 2026", "Summer 2026", "Fall 2026", "Spring 2027",
];

export default function CoursesPage() {
  const { courses, loading, error, refetch, createCourse, updateCourse, deleteCourse } = useCourses(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [confirmDoc, setConfirmDoc] = useState<any | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleUploadComplete = (doc: any) => {
    setShowUploadPanel(false);
    if (doc.confidence_band === "HIGH") {
      refetch();
    } else {
      setConfirmDoc(doc);
    }
  };

  const handleCreate = async (data: CourseCreate) => {
    try {
      setSubmitting(true);
      await createCourse(data);
      setShowAddModal(false);
    } catch {
      // toast shown in hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (id: string, data: Partial<CourseCreate>) => {
    try {
      setSubmitting(true);
      await updateCourse(id, data);
      setEditingCourse(null);
    } catch {
      // toast shown in hook
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteCourse(id);
      if (selectedCourseId === id) setSelectedCourseId(null);
    } catch {
      // toast shown in hook
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, gap: 16, flexWrap: "wrap" }}>
        <PageHeader
          title="Courses"
          subtitle="Upload a syllabus to auto-create a course"
          icon={<BookOpen size={24} color="#7B2FBE" />}
        />
        <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
          {/* Primary CTA — upload */}
          <button
            onClick={() => setShowUploadPanel(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 20px",
              background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
              border: "none", borderRadius: 14, color: "#fff",
              fontFamily: "Space Grotesk, sans-serif", fontSize: 14, fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 20px rgba(0,102,255,0.3)",
            }}
          >
            <Upload size={16} /> Upload Syllabus
          </button>
          {/* Secondary CTA — manual */}
          <button
            onClick={() => setShowAddModal(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "12px 18px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "rgba(160,180,230,0.8)",
              fontFamily: "Space Grotesk, sans-serif", fontSize: 14, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <Plus size={16} /> Add Manually
          </button>
        </div>
      </div>

      {courses.length === 0 ? (
        <EmptyCoursesState onAdd={() => setShowAddModal(true)} onUpload={() => setShowUploadPanel(true)} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
          {courses.map(course => (
            <CourseCard
              key={course.id}
              course={course}
              onViewDetails={() => setSelectedCourseId(course.id)}
              onEdit={() => setEditingCourse(course)}
              onDelete={() => handleDelete(course.id, course.name)}
            />
          ))}
        </div>
      )}

      {/* Course Detail Panel */}
      <CourseDetailPanel
        courseId={selectedCourseId}
        onClose={() => setSelectedCourseId(null)}
      />

      {/* Add Course Modal */}
      <AnimatePresence>
        {(showAddModal || editingCourse) && (
          <CourseFormModal
            existing={editingCourse}
            onSubmit={editingCourse
              ? (data) => handleUpdate(editingCourse.id, data)
              : handleCreate
            }
            onClose={() => { setShowAddModal(false); setEditingCourse(null); }}
            submitting={submitting}
          />
        )}
      </AnimatePresence>

      {/* Upload Panel */}
      <AnimatePresence>
        {showUploadPanel && (
          <UploadCenterPanel
            onComplete={handleUploadComplete}
            onClose={() => setShowUploadPanel(false)}
          />
        )}
      </AnimatePresence>

      {/* Metadata Confirmation Modal */}
      <AnimatePresence>
        {confirmDoc && (
          <MetadataConfirmationModal
            doc={confirmDoc}
            onConfirmed={(_result) => { setConfirmDoc(null); refetch(); }}
            onSkip={() => setConfirmDoc(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Course Card ─────────────────────────────────────────────────────────────

function CourseCard({
  course, onViewDetails, onEdit, onDelete,
}: {
  course: Course;
  onViewDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        overflow: "hidden",
        boxShadow: "0 20px 80px rgba(0,0,0,0.2)",
        backdropFilter: "blur(24px)",
        cursor: "pointer",
        transition: "border-color 0.3s, transform 0.2s",
      }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      {/* Color bar + header */}
      <div style={{
        background: `linear-gradient(135deg, ${course.color}22, ${course.color}08)`,
        borderBottom: `2px solid ${course.color}33`,
        padding: "20px 24px",
        display: "flex", alignItems: "flex-start", gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: course.color,
          display: "grid", placeItems: "center", flexShrink: 0,
          boxShadow: `0 4px 20px ${course.color}55`,
        }}>
          <BookOpen size={20} color="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "Syne, sans-serif", fontSize: 17, fontWeight: 800,
            color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {course.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
            {course.code && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: course.color,
                background: `${course.color}18`, padding: "2px 8px", borderRadius: 6,
              }}>
                {course.code}
              </span>
            )}
            {course.semester && (
              <span style={{ fontSize: 11, color: "rgba(160,180,230,0.5)" }}>
                {course.semester}
              </span>
            )}
          </div>
        </div>
        {/* Action buttons */}
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <IconBtn icon={<Edit3 size={13} />} onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Edit" />
          <IconBtn icon={<Trash2 size={13} />} onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete" danger />
        </div>
      </div>

      {/* Instructor info */}
      <div style={{ padding: "16px 24px 0" }}>
        {(course.instructor_name || course.instructor) ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
              display: "grid", placeItems: "center", flexShrink: 0,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>
                {(course.instructor_name || course.instructor || "?").charAt(0)}
              </span>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#e8f0ff", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {course.instructor_name || course.instructor}
                {course.extracted_from_document && (
                  <Sparkles size={10} color="#00D4FF" style={{ marginLeft: 4 }} />
                )}
              </div>
              {course.instructor_email && (
                <div style={{ color: "#0066FF", fontSize: 11, display: "flex", alignItems: "center", gap: 3 }}>
                  <Mail size={9} /> {course.instructor_email}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ color: "rgba(160,180,230,0.3)", fontSize: 12, marginBottom: 12 }}>
            No instructor info yet
          </div>
        )}

        {/* Office hours preview */}
        {course.instructor_office_hours && course.instructor_office_hours.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
            <Clock size={11} color="rgba(160,180,230,0.4)" />
            <span style={{ fontSize: 12, color: "rgba(160,180,230,0.5)" }}>
              Office hours: {course.instructor_office_hours.slice(0, 2).map(oh => `${oh.day} ${oh.start}`).join(", ")}
              {course.instructor_office_hours.length > 2 && ` +${course.instructor_office_hours.length - 2} more`}
            </span>
          </div>
        )}
      </div>

      {/* Mastery progress bar */}
      <div style={{ padding: "0 24px 12px" }}>
        <MasteryBar courseId={course.id} color={course.color} />
      </div>

      {/* View Details button */}
      <div style={{ padding: "4px 24px 20px" }}>
        <button
          onClick={onViewDetails}
          style={{
            width: "100%", padding: "10px",
            background: `${course.color}11`,
            border: `1px solid ${course.color}33`,
            borderRadius: 12, color: course.color,
            fontFamily: "Space Grotesk, sans-serif", fontSize: 13, fontWeight: 700,
            cursor: "pointer", transition: "all 0.2s",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = `${course.color}22`)}
          onMouseLeave={e => (e.currentTarget.style.background = `${course.color}11`)}
        >
          View Details
        </button>
      </div>
    </motion.div>
  );
}

// ── Mastery Bar ─────────────────────────────────────────────────────────────

function MasteryBar({ courseId, color }: { courseId: string; color: string }) {
  const [mastery, setMastery] = useState<{ total: number; mastered: number; rate: number } | null>(null);

  useEffect(() => {
    api.courses.details(courseId)
      .then((d) => {
        const f = d.flashcards;
        if (f && f.total > 0) {
          setMastery({ total: f.total, mastered: f.mastered, rate: f.mastery_rate ?? 0 });
        }
      })
      .catch(() => {});
  }, [courseId]);

  if (!mastery) return null;

  const pct = Math.round(mastery.rate * 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: "rgba(160,180,230,0.4)", fontWeight: 600 }}>Mastery</span>
        <span style={{ fontSize: 11, color, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ height: "100%", background: `linear-gradient(90deg, ${color}, ${color}80)`, borderRadius: 99 }}
        />
      </div>
      <div style={{ fontSize: 10, color: "rgba(160,180,230,0.3)", marginTop: 4 }}>
        {mastery.mastered}/{mastery.total} flashcards mastered
      </div>
    </div>
  );
}

// ── Course Form Modal ───────────────────────────────────────────────────────

function CourseFormModal({
  existing, onSubmit, onClose, submitting,
}: {
  existing: Course | null;
  onSubmit: (data: CourseCreate) => Promise<void>;
  onClose: () => void;
  submitting: boolean;
}) {
  const [name, setName] = useState(existing?.name || "");
  const [code, setCode] = useState(existing?.code || "");
  const [color, setColor] = useState(existing?.color || PRESET_COLORS[0]);
  const [semester, setSemester] = useState(existing?.semester || "");
  const [instructorName, setInstructorName] = useState(existing?.instructor_name || existing?.instructor || "");
  const [instructorEmail, setInstructorEmail] = useState(existing?.instructor_email || "");
  const [notes, setNotes] = useState(existing?.instructor_notes || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error("Course name is required"); return; }
    await onSubmit({
      name: name.trim(),
      code: code.trim() || undefined,
      color,
      semester: semester || undefined,
      instructor_name: instructorName.trim() || undefined,
      instructor: instructorName.trim() || undefined,
      instructor_email: instructorEmail.trim() || undefined,
      instructor_notes: notes.trim() || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)", zIndex: 200,
        display: "grid", placeItems: "center", padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        style={{
          background: "rgba(8, 10, 28, 0.98)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 28, padding: "32px 36px",
          width: "100%", maxWidth: 500,
          backdropFilter: "blur(32px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", margin: 0 }}>
            {existing ? "Edit Course" : "Add Course"}
          </h2>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(160,180,230,0.7)", padding: 8, borderRadius: 10, cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <FormField label="Course Name *">
            <input
              value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Data Structures"
              style={inputStyle}
              required
            />
          </FormField>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FormField label="Course Code">
              <input value={code} onChange={e => setCode(e.target.value)} placeholder="CS201" style={inputStyle} />
            </FormField>
            <FormField label="Semester">
              <select value={semester} onChange={e => setSemester(e.target.value)} style={inputStyle}>
                <option value="">Select...</option>
                {SEMESTER_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="Color">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c} type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: c, border: color === c ? "2px solid #fff" : "2px solid transparent",
                    cursor: "pointer", boxShadow: color === c ? `0 0 12px ${c}80` : "none",
                    transition: "all 0.2s",
                  }}
                />
              ))}
            </div>
          </FormField>

          <div style={{ height: 1, background: "rgba(255,255,255,0.06)" }} />

          <FormField label="Instructor Name">
            <input value={instructorName} onChange={e => setInstructorName(e.target.value)} placeholder="Dr. Jane Smith" style={inputStyle} />
          </FormField>
          <FormField label="Instructor Email">
            <input value={instructorEmail} onChange={e => setInstructorEmail(e.target.value)} placeholder="instructor@uni.edu" type="email" style={inputStyle} />
          </FormField>
          <FormField label="Notes">
            <textarea
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Office hours notes, contact preferences..."
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </FormField>

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: "13px", background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14,
              color: "rgba(160,180,230,0.7)", fontSize: 14, fontWeight: 600,
              fontFamily: "Space Grotesk, sans-serif", cursor: "pointer",
            }}>
              Cancel
            </button>
            <button type="submit" disabled={submitting} style={{
              flex: 2, padding: "13px",
              background: submitting ? "rgba(0,102,255,0.3)" : "linear-gradient(135deg, #0066FF, #7B2FBE)",
              border: "none", borderRadius: 14,
              color: "#fff", fontSize: 14, fontWeight: 700,
              fontFamily: "Space Grotesk, sans-serif", cursor: submitting ? "not-allowed" : "pointer",
              transition: "opacity 0.2s",
            }}>
              {submitting ? "Saving..." : (existing ? "Save Changes" : "Create Course")}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(160,180,230,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function IconBtn({ icon, onClick, title, danger = false }: { icon: React.ReactNode; onClick: (e: React.MouseEvent) => void; title: string; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: danger ? "rgba(255,108,108,0.1)" : "rgba(255,255,255,0.06)",
        border: "none",
        color: danger ? "#FF6C6C" : "rgba(160,180,230,0.6)",
        padding: 6, borderRadius: 8, cursor: "pointer",
        display: "grid", placeItems: "center",
        transition: "all 0.2s",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? "rgba(255,108,108,0.2)" : "rgba(255,255,255,0.1)")}
      onMouseLeave={e => (e.currentTarget.style.background = danger ? "rgba(255,108,108,0.1)" : "rgba(255,255,255,0.06)")}
    >
      {icon}
    </button>
  );
}

function EmptyCoursesState({ onAdd, onUpload }: { onAdd: () => void; onUpload: () => void }) {
  return (
    <GlassCard>
      <div style={{ textAlign: "center", padding: "60px 40px" }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: "0 auto 20px",
          background: "linear-gradient(135deg, rgba(0,102,255,0.15), rgba(123,47,190,0.1))",
          display: "grid", placeItems: "center",
        }}>
          <Upload size={32} color="#0066FF" />
        </div>
        <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 20, fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
          Upload your first syllabus
        </h3>
        <p style={{ color: "rgba(160,180,230,0.5)", fontSize: 14, margin: "0 0 8px", maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
          AI will automatically extract your course name, instructor, deadlines, and create flashcards.
        </p>
        <p style={{ color: "rgba(160,180,230,0.3)", fontSize: 12, margin: "0 0 28px" }}>
          Supports PDF, DOCX, and TXT
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={onUpload}
            style={{
              padding: "12px 28px",
              background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
              border: "none", borderRadius: 14, color: "#fff",
              fontFamily: "Space Grotesk, sans-serif", fontSize: 14, fontWeight: 700,
              cursor: "pointer", boxShadow: "0 4px 20px rgba(0,102,255,0.3)",
              display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <Upload size={16} /> Upload Syllabus
          </button>
          <button
            onClick={onAdd}
            style={{
              padding: "12px 20px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "rgba(160,180,230,0.7)",
              fontFamily: "Space Grotesk, sans-serif", fontSize: 14, fontWeight: 600,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <Plus size={16} /> Add Manually
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

function PageLoader() {
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

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ color: "#FF6C6C", fontSize: 15, marginBottom: 16 }}>{message}</div>
      <button onClick={onRetry} style={{ padding: "10px 24px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#e8f0ff", cursor: "pointer", fontSize: 14 }}>
        Retry
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12, color: "#fff",
  fontFamily: "Space Grotesk, sans-serif", fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};
