import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Settings, X, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../services/api";
import type { ReminderPreferences } from "../../../types";

const DEFAULT_PREFS: ReminderPreferences = {
  deadline_reminder_hours: [24, 48],
  daily_study_reminder_time: "08:00",
  lecture_reminder_minutes: 15,
  enable_deadline_reminders: true,
  enable_daily_study_reminders: true,
  enable_lecture_reminders: true,
};

const PRESET_HOURS = [1, 3, 6, 12, 24, 48, 72];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NotificationPrefsPanel({ open, onClose }: Props) {
  const [prefs, setPrefs] = useState<ReminderPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api.notifications.getPreferences()
      .then(setPrefs)
      .catch(() => setPrefs(DEFAULT_PREFS))
      .finally(() => setLoading(false));
  }, [open]);

  const toggleHour = (h: number) => {
    setPrefs((p) => ({
      ...p,
      deadline_reminder_hours: p.deadline_reminder_hours.includes(h)
        ? p.deadline_reminder_hours.filter((x) => x !== h)
        : [...p.deadline_reminder_hours, h].sort((a, b) => a - b),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.notifications.updatePreferences(prefs);
      setPrefs(updated);
      toast.success("Preferences saved");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.45)",
              zIndex: 100, backdropFilter: "blur(4px)",
            }}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, width: 400,
              background: "rgba(6,8,26,0.97)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(32px)",
              zIndex: 101, display: "flex", flexDirection: "column",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "24px 24px 18px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: "rgba(255,215,0,0.1)",
                display: "grid", placeItems: "center",
              }}>
                <Settings size={18} color="#FFD700" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>
                  Reminder Preferences
                </div>
                <div style={{ fontSize: 12, color: "rgba(160,180,230,0.5)" }}>
                  Configure when you get notified
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ background: "rgba(255,255,255,0.05)", border: "none", color: "rgba(160,180,230,0.6)", padding: 8, borderRadius: 10, cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
              {loading ? (
                <div style={{ color: "rgba(160,180,230,0.4)", textAlign: "center", paddingTop: 60, fontSize: 13 }}>
                  Loading preferences...
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                  {/* Deadline reminders */}
                  <PrefsSection
                    title="Deadline Reminders"
                    color="#FF6C6C"
                    enabled={prefs.enable_deadline_reminders}
                    onToggle={(v) => setPrefs((p) => ({ ...p, enable_deadline_reminders: v }))}
                  >
                    <div style={{ fontSize: 12, color: "rgba(160,180,230,0.5)", marginBottom: 10 }}>
                      Remind me before a deadline is due:
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {PRESET_HOURS.map((h) => {
                        const active = prefs.deadline_reminder_hours.includes(h);
                        const label = h < 24 ? `${h}h` : `${h / 24}d`;
                        return (
                          <button
                            key={h}
                            onClick={() => toggleHour(h)}
                            style={{
                              padding: "6px 14px",
                              borderRadius: 8,
                              border: `1px solid ${active ? "rgba(255,108,108,0.5)" : "rgba(255,255,255,0.1)"}`,
                              background: active ? "rgba(255,108,108,0.12)" : "transparent",
                              color: active ? "#FF6C6C" : "rgba(160,180,230,0.5)",
                              fontSize: 12,
                              fontWeight: active ? 700 : 400,
                              cursor: "pointer",
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                    {prefs.deadline_reminder_hours.length === 0 && (
                      <div style={{ fontSize: 11, color: "rgba(255,108,108,0.5)", marginTop: 6 }}>
                        Select at least one interval
                      </div>
                    )}
                  </PrefsSection>

                  {/* Daily study reminder */}
                  <PrefsSection
                    title="Daily Study Reminder"
                    color="#0066FF"
                    enabled={prefs.enable_daily_study_reminders}
                    onToggle={(v) => setPrefs((p) => ({ ...p, enable_daily_study_reminders: v }))}
                  >
                    <label style={labelStyle}>Remind me at</label>
                    <input
                      type="time"
                      value={prefs.daily_study_reminder_time || "08:00"}
                      onChange={(e) => setPrefs((p) => ({ ...p, daily_study_reminder_time: e.target.value }))}
                      style={inputStyle}
                    />
                  </PrefsSection>

                  {/* Lecture reminders */}
                  <PrefsSection
                    title="Lecture Reminders"
                    color="#7B2FBE"
                    enabled={prefs.enable_lecture_reminders}
                    onToggle={(v) => setPrefs((p) => ({ ...p, enable_lecture_reminders: v }))}
                  >
                    <label style={labelStyle}>Minutes before lecture</label>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {[5, 10, 15, 30, 60].map((m) => (
                        <button
                          key={m}
                          onClick={() => setPrefs((p) => ({ ...p, lecture_reminder_minutes: m }))}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 8,
                            border: `1px solid ${prefs.lecture_reminder_minutes === m ? "rgba(123,47,190,0.5)" : "rgba(255,255,255,0.1)"}`,
                            background: prefs.lecture_reminder_minutes === m ? "rgba(123,47,190,0.15)" : "transparent",
                            color: prefs.lecture_reminder_minutes === m ? "#7B2FBE" : "rgba(160,180,230,0.5)",
                            fontSize: 12,
                            fontWeight: prefs.lecture_reminder_minutes === m ? 700 : 400,
                            cursor: "pointer",
                          }}
                        >
                          {m}m
                        </button>
                      ))}
                    </div>
                  </PrefsSection>

                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: "16px 24px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex", gap: 10,
            }}>
              <button
                onClick={handleSave}
                disabled={saving || loading}
                style={{
                  flex: 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "12px 0",
                  background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
                  border: "none", borderRadius: 12, color: "#fff", fontWeight: 700,
                  fontSize: 14, cursor: saving ? "not-allowed" : "pointer",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                <Save size={15} />
                {saving ? "Saving..." : "Save preferences"}
              </button>
              <button
                onClick={onClose}
                style={{
                  padding: "12px 20px",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, color: "rgba(160,180,230,0.6)", fontSize: 14, cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function PrefsSection({
  title, color, enabled, onToggle, children,
}: {
  title: string;
  color: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{title}</div>
        <button
          onClick={() => onToggle(!enabled)}
          style={{
            width: 44,
            height: 24,
            borderRadius: 12,
            background: enabled ? color : "rgba(255,255,255,0.08)",
            border: "none",
            cursor: "pointer",
            position: "relative",
            transition: "background 0.25s",
            flexShrink: 0,
          }}
        >
          <motion.div
            animate={{ x: enabled ? 22 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            style={{
              position: "absolute",
              top: 2,
              width: 20,
              height: 20,
              borderRadius: "50%",
              background: "#fff",
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }}
          />
        </button>
      </div>
      <div style={{ opacity: enabled ? 1 : 0.35, transition: "opacity 0.2s", pointerEvents: enabled ? "auto" : "none" }}>
        {children}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "rgba(160,180,230,0.5)",
  fontWeight: 600,
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  color: "#e8f0ff",
  fontSize: 14,
  padding: "10px 14px",
  outline: "none",
  colorScheme: "dark",
  width: "100%",
  boxSizing: "border-box",
};
