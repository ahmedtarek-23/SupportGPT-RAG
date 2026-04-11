import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { api } from "../../../services/api";
import type { LectureSlot, LectureSlotCreate } from "../../../types";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SHORT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TYPE_COLORS: Record<string, string> = {
  lecture: "#0066FF",
  lab: "#7B2FBE",
  tutorial: "#00D4FF",
};

interface Props {
  courseId: string;
}

export function LectureSlotEditor({ courseId }: Props) {
  const [slots, setSlots] = useState<LectureSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState<LectureSlotCreate>({
    day_of_week: 0,
    start_time: "09:00",
    end_time: "10:00",
    location: "",
    lecture_type: "lecture",
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const course = await api.courses.get(courseId);
      setSlots(course.lectures || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!form.start_time || !form.end_time) return;
    setSubmitting(true);
    try {
      await api.courses.addLectureSlot(courseId, {
        ...form,
        location: form.location || undefined,
      });
      toast.success("Lecture slot added");
      setShowForm(false);
      setForm({ day_of_week: 0, start_time: "09:00", end_time: "10:00", location: "", lecture_type: "lecture" });
      await load();
    } catch (e: any) {
      toast.error(e.message || "Failed to add slot");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await api.courses.deleteLectureSlot(id);
      setSlots((prev) => prev.filter((s) => s.id !== id));
      toast.success("Lecture slot removed");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const sorted = [...slots].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <div>
      {loading ? (
        <div style={{ color: "rgba(160,180,230,0.4)", fontSize: 13, textAlign: "center", padding: "10px 0" }}>
          Loading schedule...
        </div>
      ) : (
        <>
          {sorted.length === 0 && !showForm && (
            <div style={{ color: "rgba(160,180,230,0.4)", fontSize: 13, textAlign: "center", padding: "12px 0" }}>
              No lecture slots yet
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <AnimatePresence>
              {sorted.map((slot) => (
                <motion.div
                  key={slot.id}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 10,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: TYPE_COLORS[slot.lecture_type] || "#0066FF",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#e8f0ff",
                      minWidth: 28,
                    }}
                  >
                    {SHORT_DAYS[slot.day_of_week]}
                  </span>
                  <Clock size={12} color="rgba(160,180,230,0.4)" />
                  <span style={{ fontSize: 12, color: "rgba(160,180,230,0.7)" }}>
                    {slot.start_time} – {slot.end_time}
                  </span>
                  {slot.location && (
                    <span
                      style={{
                        fontSize: 11,
                        color: "rgba(160,180,230,0.4)",
                        marginLeft: "auto",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: 100,
                      }}
                    >
                      {slot.location}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: TYPE_COLORS[slot.lecture_type] || "#0066FF",
                      textTransform: "capitalize",
                      marginLeft: slot.location ? 0 : "auto",
                      background: `${TYPE_COLORS[slot.lecture_type] || "#0066FF"}15`,
                      padding: "2px 7px",
                      borderRadius: 5,
                      flexShrink: 0,
                    }}
                  >
                    {slot.lecture_type}
                  </span>
                  <button
                    onClick={() => handleDelete(slot.id)}
                    disabled={deletingId === slot.id}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: deletingId === slot.id ? "not-allowed" : "pointer",
                      color: "rgba(255,108,108,0.5)",
                      padding: 4,
                      flexShrink: 0,
                      opacity: deletingId === slot.id ? 0.4 : 1,
                    }}
                    title="Remove slot"
                  >
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Add form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden" }}
              >
                <div
                  style={{
                    marginTop: 10,
                    padding: "16px",
                    background: "rgba(0,102,255,0.05)",
                    border: "1px solid rgba(0,102,255,0.15)",
                    borderRadius: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {/* Day */}
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={labelStyle}>Day of week</label>
                      <select
                        value={form.day_of_week}
                        onChange={(e) => setForm((f) => ({ ...f, day_of_week: +e.target.value }))}
                        style={selectStyle}
                      >
                        {DAY_NAMES.map((d, i) => (
                          <option key={i} value={i}>{d}</option>
                        ))}
                      </select>
                    </div>

                    {/* Start */}
                    <div>
                      <label style={labelStyle}>Start time</label>
                      <input
                        type="time"
                        value={form.start_time}
                        onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>

                    {/* End */}
                    <div>
                      <label style={labelStyle}>End time</label>
                      <input
                        type="time"
                        value={form.end_time}
                        onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>

                    {/* Location */}
                    <div>
                      <label style={labelStyle}>Location</label>
                      <input
                        type="text"
                        placeholder="Room / Building"
                        value={form.location}
                        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                        style={inputStyle}
                      />
                    </div>

                    {/* Type */}
                    <div>
                      <label style={labelStyle}>Type</label>
                      <select
                        value={form.lecture_type}
                        onChange={(e) => setForm((f) => ({ ...f, lecture_type: e.target.value }))}
                        style={selectStyle}
                      >
                        <option value="lecture">Lecture</option>
                        <option value="lab">Lab</option>
                        <option value="tutorial">Tutorial</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handleAdd}
                      disabled={submitting}
                      style={{
                        flex: 1,
                        padding: "9px 0",
                        background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
                        border: "none",
                        borderRadius: 10,
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: submitting ? "not-allowed" : "pointer",
                        opacity: submitting ? 0.7 : 1,
                      }}
                    >
                      {submitting ? "Adding..." : "Add slot"}
                    </button>
                    <button
                      onClick={() => setShowForm(false)}
                      style={{
                        padding: "9px 16px",
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 10,
                        color: "rgba(160,180,230,0.6)",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 10,
                padding: "8px 14px",
                background: "rgba(0,102,255,0.07)",
                border: "1px dashed rgba(0,102,255,0.25)",
                borderRadius: 10,
                color: "#0066FF",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <Plus size={14} /> Add lecture slot
            </button>
          )}
        </>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 600,
  color: "rgba(160,180,230,0.5)",
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: 0.5,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 8,
  color: "#e8f0ff",
  fontSize: 13,
  padding: "8px 10px",
  outline: "none",
  boxSizing: "border-box",
  colorScheme: "dark",
};

const selectStyle: React.CSSProperties = {
  ...{
    width: "100%",
    background: "rgba(14,18,40,0.95)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "#e8f0ff",
    fontSize: 13,
    padding: "8px 10px",
    outline: "none",
    boxSizing: "border-box",
  },
};
