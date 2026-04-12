/**
 * UploadCenterPanel
 *
 * Drag-and-drop upload zone that:
 * 1. Accepts PDF / DOCX / TXT
 * 2. Uploads to POST /api/documents/upload
 * 3. Polls GET /api/documents/{id}/status via SSE for progress
 * 4. On completion → calls onComplete(documentDetail) for the confirmation modal
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader } from "lucide-react";

type UploadStage = "idle" | "dragging" | "uploading" | "parsing" | "done" | "error";

interface UploadCenterPanelProps {
  onComplete: (doc: any) => void;
  onClose: () => void;
}

const ACCEPTED = [".pdf", ".docx", ".txt", ".md"];
const STAGE_LABELS: Record<UploadStage, string> = {
  idle: "Drop your file here",
  dragging: "Release to upload",
  uploading: "Uploading...",
  parsing: "Extracting academic metadata...",
  done: "Done!",
  error: "Upload failed",
};

export function UploadCenterPanel({ onComplete, onClose }: UploadCenterPanelProps) {
  const [stage, setStage] = useState<UploadStage>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parseProgress, setParseProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED.includes(ext)) {
      setErrorMsg(`Unsupported file type: ${ext}. Use PDF, DOCX or TXT.`);
      setStage("error");
      return;
    }

    const MAX_SIZE_MB = 50;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_SIZE_MB} MB.`);
      setStage("error");
      return;
    }

    setFileName(file.name);
    setStage("uploading");
    setUploadProgress(0);

    // ── Step 1: XHR upload with progress ────────────────────────
    const formData = new FormData();
    formData.append("file", file);

    // ── Step 1: XHR upload — get task_id + document_id immediately ─
    const uploadResult = await new Promise<{ task_id: string; document_id: string } | null>((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status === 413) {
          resolve(null); // handled below
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.task_id && data.document_id) resolve(data);
            else resolve(null);
          } catch {
            resolve(null);
          }
        } else {
          resolve(null);
        }
      };
      xhr.onerror = () => resolve(null);
      xhr.open("POST", "/api/documents/upload");
      xhr.send(formData);
    });

    if (!uploadResult) {
      setErrorMsg("Upload failed — server rejected the file. Check size and format.");
      setStage("error");
      return;
    }

    const { task_id: taskId, document_id: docId } = uploadResult;

    // ── Step 2: Poll SSE document status (status polling by document_id) ──
    setStage("parsing");
    setParseProgress(10);

    // Poll the document record (DB-backed) every 2s — more reliable than Celery task polling
    let completed = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      await sleep(2000);
      setParseProgress(Math.min(88, 10 + attempt * 0.9));

      try {
        const statusRes = await fetch(`/api/documents/${docId}`);
        if (!statusRes.ok) continue;
        const docRecord = await statusRes.json();

        if (docRecord.status === "completed") {
          completed = true;
          setParseProgress(96);
          await sleep(300);
          setStage("done");
          await sleep(500);
          onComplete(docRecord);
          break;
        }
        if (docRecord.status === "failed") {
          setErrorMsg(docRecord.error_message || "AI extraction failed. Try re-uploading.");
          setStage("error");
          return;
        }
        // still "pending" or "processing" — keep polling
      } catch {
        // network hiccup — keep polling
      }
    }

    if (!completed) {
      // Timed out (3 minutes) — still show the doc so user can confirm manually
      setErrorMsg("Extraction is taking longer than expected. You can confirm metadata manually.");
      setStage("error");
    }
  }, [onComplete]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setStage("idle");
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setStage("dragging"); };
  const onDragLeave = () => { if (stage === "dragging") setStage("idle"); };
  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const isActive = stage === "idle" || stage === "dragging";
  const borderColor =
    stage === "dragging" ? "var(--sm-accent-1)"
    : stage === "error" ? "#E05555"
    : stage === "done" ? "#00C97A"
    : "var(--sm-border)";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(10px)",
        zIndex: 300,
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
        className="upload-modal-inner"
        style={{
          background: "var(--sm-sidebar-bg)",
          border: "1px solid var(--sm-border)",
          borderRadius: 28,
          padding: "36px 40px",
          width: "100%", maxWidth: 520,
          backdropFilter: `blur(var(--sm-backdrop-blur))`,
          boxShadow: "0 40px 120px rgba(0,0,0,0.45)",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: "Syne, sans-serif", fontSize: 22, fontWeight: 800, color: "var(--sm-text-primary)", margin: 0 }}>
              Upload Academic File
            </h2>
            <p style={{ color: "var(--sm-text-secondary)", fontSize: 13, margin: "6px 0 0" }}>
              AI will extract course, instructor, deadlines & flashcards
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "var(--sm-surface)", border: "1px solid var(--sm-border)", color: "var(--sm-text-secondary)", padding: 8, borderRadius: 10, cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Drop zone */}
        <div
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => isActive && fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${borderColor}`,
            borderRadius: 20,
            padding: "48px 32px",
            textAlign: "center",
            cursor: isActive ? "pointer" : "default",
            transition: "border-color 0.25s, background 0.25s",
            background: stage === "dragging"
              ? "rgba(0,102,255,0.06)"
              : stage === "done"
                ? "rgba(0,201,122,0.04)"
                : stage === "error"
                  ? "rgba(224,85,85,0.04)"
                  : "var(--sm-surface)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            style={{ display: "none" }}
            onChange={onInputChange}
          />

          {/* Icon */}
          <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
            {stage === "done" ? (
              <CheckCircle size={44} color="#00C97A" />
            ) : stage === "error" ? (
              <AlertCircle size={44} color="#E05555" />
            ) : stage === "parsing" || stage === "uploading" ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}>
                <Loader size={44} color="var(--sm-accent-1)" />
              </motion.div>
            ) : (
              <Upload size={44} color={stage === "dragging" ? "var(--sm-accent-1)" : "var(--sm-text-tertiary)"} />
            )}
          </div>

          {/* Stage label */}
          <div style={{
            color: stage === "error" ? "#E05555" : stage === "done" ? "#00C97A" : "var(--sm-text-primary)",
            fontWeight: 700, fontSize: 16, marginBottom: 6,
          }}>
            {STAGE_LABELS[stage]}
          </div>

          {fileName && stage !== "idle" && (
            <div style={{ color: "var(--sm-text-secondary)", fontSize: 13, display: "flex", alignItems: "center", gap: 6, justifyContent: "center", marginBottom: 8 }}>
              <FileText size={13} /> {fileName}
            </div>
          )}

          {stage === "idle" && (
            <div style={{ color: "var(--sm-text-tertiary)", fontSize: 13 }}>
              PDF, DOCX, TXT supported
            </div>
          )}

          {stage === "error" && (
            <div style={{ color: "#E05555", fontSize: 13, marginTop: 4 }}>{errorMsg}</div>
          )}

          {/* Upload progress bar */}
          <AnimatePresence>
            {stage === "uploading" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ marginTop: 20 }}
              >
                <ProgressBar value={uploadProgress} label="Uploading" color="#0066FF" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Parse progress bar */}
          <AnimatePresence>
            {stage === "parsing" && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{ marginTop: 20 }}
              >
                <ProgressBar value={parseProgress} label="Extracting metadata" color="#7B2FBE" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* What gets extracted */}
        {isActive && (
          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              "Course name & code",
              "Instructor & office hours",
              "Deadlines & exam dates",
              "Flashcard candidates",
              "Summary & key concepts",
              "Semester info",
            ].map((item) => (
              <div
                key={item}
                style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--sm-text-secondary)", fontSize: 12 }}
              >
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--sm-accent-1)", flexShrink: 0 }} />
                {item}
              </div>
            ))}
          </div>
        )}

        {/* Retry button on error */}
        {stage === "error" && (
          <button
            onClick={() => { setStage("idle"); setErrorMsg(""); setFileName(""); }}
            style={{
              marginTop: 20, width: "100%", padding: "12px",
              background: "var(--sm-surface)",
              border: "1px solid var(--sm-border)",
              borderRadius: 14, color: "var(--sm-text-primary)",
              fontFamily: "Space Grotesk, sans-serif", fontSize: 14, fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        )}
      </motion.div>
    </motion.div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function ProgressBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
        <span style={{ color: "var(--sm-text-secondary)" }}>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: "var(--sm-surface-hover)", borderRadius: 99, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ height: "100%", background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: 99 }}
        />
      </div>
    </div>
  );
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
