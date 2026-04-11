import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen, Search, Clock, ChevronRight, X,
  FileText, CheckCircle2, AlertCircle, Loader2, Sparkles,
  Mail, RefreshCw, Upload, Zap, BrainCircuit, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard, PageHeader } from "../components/shared/GlassCard";
import { useDocuments } from "../../hooks/useDocuments";
import { useCourses } from "../../hooks/useCourses";
import { api } from "../../services/api";
import type { Document, DocumentDetail, DocumentSummary } from "../../types";

const ACCEPTED = [".pdf", ".docx", ".txt"];

export default function LectureNotesPage() {
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentDetail | null>(null);
  const [batchUploading, setBatchUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { courses } = useCourses();
  const { documents, total, loading, error, uploads, refetch, uploadFile, clearUpload, clearCompletedUploads } = useDocuments(
    selectedCourseId || undefined
  );

  // Re-fetch when course changes
  useEffect(() => {
    refetch();
  }, [selectedCourseId]);

  const handleFiles = useCallback(async (files: File[]) => {
    const valid = files.filter(f => ACCEPTED.some(ext => f.name.toLowerCase().endsWith(ext)));
    if (valid.length === 0) {
      toast.error(`Only ${ACCEPTED.join(", ")} files are accepted`);
      return;
    }
    const invalidCount = files.length - valid.length;
    if (invalidCount > 0) toast.warning(`${invalidCount} file(s) skipped (unsupported format)`);

    if (valid.length > 1) {
      // Use batch endpoint for multiple files
      setBatchUploading(true);
      try {
        const res = await api.documents.batchUpload(valid);
        toast.success(`${res.tasks.length} files queued for processing`);
        setTimeout(() => refetch(), 2000);
      } catch (e: any) {
        toast.error(`Batch upload failed: ${e.message}`);
      } finally {
        setBatchUploading(false);
      }
    } else {
      // Single file — use tracked upload
      const course = courses.find(c => c.id === selectedCourseId);
      const sourceName = course ? `${course.code || course.name} — ${valid[0].name}` : valid[0].name;
      await uploadFile(valid[0], sourceName);
    }
  }, [courses, selectedCourseId, uploadFile, refetch]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [handleFiles]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const filteredDocs = documents.filter(d =>
    !searchQuery ||
    d.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.extracted_title || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const viewDocSummary = async (docId: string) => {
    try {
      const detail = await api.documents.get(docId);
      setSelectedDoc(detail);
    } catch (e: any) {
      toast.error(`Could not load document: ${e.message}`);
    }
  };

  return (
    <div>
      <PageHeader
        title="Lecture Notes"
        subtitle="Upload and analyze your study documents — AI extracts course info automatically"
        icon={<BookOpen size={24} color="#FF3366" />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20 }}>

        {/* ── Left column ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Course selector */}
          <GlassCard style={{ padding: 20 }}>
            <label style={labelStyle}>Link to Course (optional)</label>
            <select
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              style={selectStyle}
            >
              <option value="">All documents</option>
              {courses.map(c => (
                <option key={c.id} value={c.id}>{c.code ? `${c.code} — ` : ""}{c.name}</option>
              ))}
            </select>
            <div style={{ fontSize: 11, color: "rgba(160,180,230,0.4)", marginTop: 8 }}>
              Selecting a course lets AI auto-fill instructor info from your uploaded syllabus
            </div>
          </GlassCard>

          {/* Drag & Drop Upload */}
          <GlassCard style={{ padding: 20 }}>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 14px" }}>
              Upload Documents
            </h3>

            {/* Drop zone */}
            <div
              onDragEnter={() => setDragOver(true)}
              onDragLeave={() => setDragOver(false)}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#FF3366" : "rgba(255,51,102,0.3)"}`,
                borderRadius: 16, padding: "28px 20px",
                background: dragOver ? "rgba(255,51,102,0.08)" : "rgba(255,51,102,0.03)",
                textAlign: "center", cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <motion.div animate={{ scale: dragOver ? 1.1 : 1 }} transition={{ duration: 0.2 }}>
                {batchUploading ? (
                  <>
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                      <Loader2 size={28} color="#FF3366" style={{ marginBottom: 10 }} />
                    </motion.div>
                    <div style={{ color: "#FF3366", fontWeight: 700, fontSize: 14 }}>Uploading batch...</div>
                  </>
                ) : (
                  <>
                    <Upload size={28} color="#FF3366" style={{ marginBottom: 10 }} />
                    <div style={{ color: "#FF3366", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>
                      {dragOver ? "Drop to upload" : "Drag & drop files here"}
                    </div>
                    <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 12 }}>
                      or click to browse · multi-file supported
                    </div>
                    <div style={{ color: "rgba(160,180,230,0.3)", fontSize: 11, marginTop: 8 }}>
                      Supports: PDF, DOCX, TXT
                    </div>
                  </>
                )}
              </motion.div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED.join(",")}
              onChange={handleInputChange}
              style={{ display: "none" }}
            />
          </GlassCard>

          {/* Upload queue */}
          <AnimatePresence>
            {uploads.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <GlassCard style={{ padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ color: "#e8f0ff", fontWeight: 600, fontSize: 14 }}>Upload Queue</span>
                    <button
                      onClick={clearCompletedUploads}
                      style={{ background: "none", border: "none", color: "rgba(160,180,230,0.5)", cursor: "pointer", fontSize: 11 }}
                    >
                      Clear done
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {uploads.map(u => (
                      <UploadItem
                        key={u.id}
                        upload={u}
                        onClear={() => clearUpload(u.id)}
                        onView={(docId) => viewDocSummary(docId)}
                      />
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search */}
          <GlassCard style={{ padding: "12px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Search size={16} color="rgba(160,180,230,0.4)" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  background: "transparent", border: "none", color: "#fff", outline: "none",
                  width: "100%", fontFamily: "Space Grotesk, sans-serif", fontSize: 14,
                }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ background: "none", border: "none", color: "rgba(160,180,230,0.5)", cursor: "pointer" }}>
                  <X size={14} />
                </button>
              )}
            </div>
          </GlassCard>
        </div>

        {/* ── Right column: Document list ──────────────────────────────────── */}
        <GlassCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>
              Documents ({total})
            </h3>
            <button
              onClick={refetch}
              style={{ background: "none", border: "none", color: "rgba(160,180,230,0.5)", cursor: "pointer" }}
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          {loading ? (
            <div style={{ display: "grid", placeItems: "center", minHeight: 200 }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{ width: 28, height: 28, border: "3px solid rgba(255,51,102,0.2)", borderTopColor: "#FF3366", borderRadius: "50%" }}
              />
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#FF6C6C", fontSize: 13 }}>
              <AlertCircle size={18} style={{ marginBottom: 8 }} />
              <div>{error}</div>
            </div>
          ) : filteredDocs.length === 0 ? (
            <EmptyDocsState hasSearch={!!searchQuery} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filteredDocs.map(doc => (
                <DocumentRow
                  key={doc.id}
                  doc={doc}
                  courses={courses}
                  onClick={() => viewDocSummary(doc.id)}
                />
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Document Summary Modal */}
      <AnimatePresence>
        {selectedDoc && (
          <DocumentSummaryModal doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Upload Item ─────────────────────────────────────────────────────────────

function UploadItem({ upload, onClear, onView }: { upload: any; onClear: () => void; onView?: (docId: string) => void }) {
  const STATUS_COLORS: Record<string, string> = {
    queued: "rgba(160,180,230,0.5)", uploading: "#0066FF",
    processing: "#FFD700", done: "#00FF88", error: "#FF6C6C",
  };
  const color = STATUS_COLORS[upload.status] || STATUS_COLORS.queued;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "8px 10px",
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${color}22`,
      borderRadius: 10,
    }}>
      {upload.status === "done" ? (
        <CheckCircle2 size={14} color="#00FF88" />
      ) : upload.status === "error" ? (
        <AlertCircle size={14} color="#FF6C6C" />
      ) : (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader2 size={14} color={color} />
        </motion.div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "#e8f0ff", fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {upload.file.name}
        </div>
        <div style={{ color, fontSize: 10, textTransform: "capitalize" }}>
          {upload.status === "error" ? upload.error : upload.status}
        </div>
      </div>
      {/* Progress bar */}
      {(upload.status === "uploading" || upload.status === "processing") && (
        <div style={{ width: 40, height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${upload.progress}%` }}
            style={{ height: "100%", background: color, borderRadius: 2 }}
          />
        </div>
      )}
      {upload.status === "done" && upload.documentId && onView && (
        <button
          onClick={() => onView(upload.documentId)}
          style={{ background: "none", border: "none", color: "#00D4FF", cursor: "pointer", padding: "2px 4px" }}
          title="View extracted data"
        >
          <ExternalLink size={12} />
        </button>
      )}
      {(upload.status === "done" || upload.status === "error") && (
        <button onClick={onClear} style={{ background: "none", border: "none", color: "rgba(160,180,230,0.4)", cursor: "pointer" }}>
          <X size={12} />
        </button>
      )}
    </div>
  );
}

// ── Document Row ────────────────────────────────────────────────────────────

function DocumentRow({ doc, courses, onClick }: { doc: Document; courses: any[]; onClick: () => void }) {
  const course = courses.find(c => c.id === doc.course_id);
  const hasExtracted = doc.extracted_title || doc.extracted_summary || doc.extracted_instructor_name;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "14px 16px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14, cursor: "pointer",
        transition: "all 0.2s",
      }}
      whileHover={{ background: "rgba(255,255,255,0.04)" }}
      onClick={onClick}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: "rgba(255,51,102,0.1)",
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          <FileText size={16} color="#FF3366" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: "#fff", fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {doc.extracted_title || doc.filename}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3, color: "rgba(160,180,230,0.5)", fontSize: 12 }}>
            {course && (
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: course.color }} />
                {course.code || course.name}
              </span>
            )}
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Clock size={10} />
              {new Date(doc.created_at).toLocaleDateString()}
            </span>
            {hasExtracted && (
              <span style={{ color: "#00D4FF", display: "flex", alignItems: "center", gap: 3, fontSize: 11 }}>
                <Sparkles size={9} /> AI extracted
              </span>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {doc.extracted_flashcard_count > 0 && (
          <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#FFD700", background: "rgba(255,215,0,0.1)", padding: "2px 8px", borderRadius: 6 }}>
            <Zap size={10} /> {doc.extracted_flashcard_count}
          </span>
        )}
        <DocTypeBadge type={doc.document_type} />
        <DocStatusBadge status={doc.status} />
        <ChevronRight size={14} color="rgba(255,255,255,0.2)" />
      </div>
    </motion.div>
  );
}

// ── Document Summary Modal ──────────────────────────────────────────────────

function DocumentSummaryModal({ doc, onClose }: { doc: DocumentDetail; onClose: () => void }) {
  const [generatingFlashcards, setGeneratingFlashcards] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [summaryText, setSummaryText] = useState(doc.extracted_summary || "");

  const generateFlashcards = async () => {
    setGeneratingFlashcards(true);
    try {
      const data = await api.documents.generateFlashcards(doc.id);
      toast.success(`Created ${data.flashcards_created} flashcard${data.flashcards_created !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to generate flashcards");
    } finally {
      setGeneratingFlashcards(false);
    }
  };

  const regenerateSummary = async () => {
    setGeneratingSummary(true);
    try {
      const data = await api.documents.generateSummary(doc.id);
      setSummaryText(data.summary || summaryText);
      toast.success("Summary updated");
    } catch {
      toast.error("Failed to regenerate summary");
    } finally {
      setGeneratingSummary(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)", zIndex: 200,
        display: "grid", placeItems: "center", padding: 20,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
        style={{
          background: "rgba(8,10,28,0.98)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 28, padding: "32px 36px",
          width: "100%", maxWidth: 640,
          maxHeight: "85vh", overflow: "auto",
          backdropFilter: "blur(32px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <FileText size={20} color="#FF3366" />
            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>
              {doc.extracted_title || doc.filename}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.06)", border: "none", color: "rgba(160,180,230,0.7)", padding: 8, borderRadius: 10, cursor: "pointer" }}>
            <X size={16} />
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <button
            onClick={generateFlashcards}
            disabled={generatingFlashcards || doc.status !== "completed"}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "10px", borderRadius: 12, border: "none", cursor: generatingFlashcards ? "not-allowed" : "pointer",
              background: "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.08))",
              color: "#FFD700", fontFamily: "Space Grotesk, sans-serif", fontSize: 13, fontWeight: 600,
            }}
          >
            {generatingFlashcards
              ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Loader2 size={14} /></motion.div> Generating...</>
              : <><Zap size={14} /> Generate Flashcards</>
            }
          </button>
          <button
            onClick={regenerateSummary}
            disabled={generatingSummary || doc.status !== "completed"}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "10px", borderRadius: 12, border: "1px solid rgba(0,212,255,0.2)", cursor: generatingSummary ? "not-allowed" : "pointer",
              background: "rgba(0,212,255,0.06)",
              color: "#00D4FF", fontFamily: "Space Grotesk, sans-serif", fontSize: 13, fontWeight: 600,
            }}
          >
            {generatingSummary
              ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><Loader2 size={14} /></motion.div> Generating...</>
              : <><BrainCircuit size={14} /> Regenerate Summary</>
            }
          </button>
        </div>

        {/* Summary */}
        {summaryText && (
          <Section title="AI Summary">
            <p style={{ color: "rgba(200,210,255,0.8)", fontSize: 14, lineHeight: 1.7, margin: 0 }}>
              {summaryText}
            </p>
          </Section>
        )}

        {/* Instructor */}
        {doc.extracted_instructor_name && (
          <Section title="Instructor">
            <div style={{ color: "#e8f0ff", fontSize: 14, fontWeight: 600 }}>{doc.extracted_instructor_name}</div>
            {doc.extracted_instructor_email && (
              <a href={`mailto:${doc.extracted_instructor_email}`} style={{ color: "#0066FF", fontSize: 13, display: "flex", alignItems: "center", gap: 4, marginTop: 4, textDecoration: "none" }}>
                <Mail size={12} /> {doc.extracted_instructor_email}
              </a>
            )}
          </Section>
        )}

        {/* Office hours */}
        {doc.extracted_office_hours && doc.extracted_office_hours.length > 0 && (
          <Section title="Office Hours">
            {doc.extracted_office_hours.map((oh, i) => (
              <div key={i} style={{ display: "flex", gap: 12, fontSize: 13, color: "rgba(200,210,255,0.7)", marginBottom: 4 }}>
                <span style={{ fontWeight: 600, color: "#fff", minWidth: 80 }}>{oh.day}</span>
                <span>{oh.start} – {oh.end}</span>
                {oh.location && <span style={{ color: "rgba(160,180,230,0.4)" }}>{oh.location}</span>}
              </div>
            ))}
          </Section>
        )}

        {/* Important dates */}
        {doc.extracted_dates && doc.extracted_dates.length > 0 && (
          <Section title={`Important Dates (${doc.extracted_dates.length})`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {doc.extracted_dates.map((d, i) => (
                <div key={i} style={{ fontSize: 13, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, color: "#e8f0ff" }}>
                  {d}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Assignments */}
        {doc.extracted_assignments && doc.extracted_assignments.length > 0 && (
          <Section title={`Assignments (${doc.extracted_assignments.length})`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {doc.extracted_assignments.map((a, i) => (
                <div key={i} style={{ fontSize: 13, padding: "8px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, color: "#e8f0ff" }}>
                  {a}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 20 }}>
          <MiniStat label="Chunks" value={doc.num_chunks ?? 0} color="#0066FF" />
          <MiniStat label="Dates" value={doc.extracted_dates?.length ?? 0} color="#FFD700" />
          <MiniStat label="Flashcards" value={doc.extracted_flashcard_count ?? 0} color="#00D4FF" />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <h4 style={{ fontSize: 11, fontWeight: 700, color: "rgba(160,180,230,0.4)", textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 10px" }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "center", padding: "12px", background: `${color}0D`, border: `1px solid ${color}22`, borderRadius: 12 }}>
      <div style={{ fontSize: 20, fontWeight: 800, fontFamily: "Syne, sans-serif", color }}>{value}</div>
      <div style={{ fontSize: 11, color: "rgba(160,180,230,0.5)" }}>{label}</div>
    </div>
  );
}

function DocTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = { pdf: "#FF3366", docx: "#0066FF", txt: "#00FF88" };
  const c = colors[type.toLowerCase()] || "#7B2FBE";
  return (
    <span style={{ fontSize: 10, fontWeight: 700, color: c, background: `${c}18`, padding: "2px 7px", borderRadius: 5, textTransform: "uppercase" }}>
      {type}
    </span>
  );
}

function DocStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { completed: "#00FF88", processing: "#FFD700", pending: "rgba(160,180,230,0.4)", failed: "#FF6C6C" };
  const c = colors[status] || colors.pending;
  return (
    <span style={{ fontSize: 10, fontWeight: 600, color: c, textTransform: "capitalize" }}>
      {status === "completed" ? <CheckCircle2 size={12} /> : null}
    </span>
  );
}

function EmptyDocsState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <FileText size={32} color="rgba(255,51,102,0.3)" style={{ marginBottom: 12 }} />
      <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 14 }}>
        {hasSearch ? "No documents match your search" : "No documents yet — upload a PDF, DOCX, or TXT file"}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 600,
  color: "rgba(160,180,230,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
};

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10, color: "#fff",
  fontFamily: "Space Grotesk, sans-serif", fontSize: 13,
  outline: "none",
};
