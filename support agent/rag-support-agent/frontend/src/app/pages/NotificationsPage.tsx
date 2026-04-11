import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Bell, Check, CheckCheck, Trash2, Settings, Clock } from "lucide-react";
import { GlassCard, PageHeader } from "../components/shared/GlassCard";
import { NotificationPrefsPanel } from "../components/notifications/NotificationPrefsPanel";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<string>("all");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = () => {
    const params = new URLSearchParams();
    if (filter === "unread") params.set("unread_only", "true");
    if (filter !== "all" && filter !== "unread") params.set("notification_type", filter);

    setLoading(true);
    fetch(`/api/notifications?${params}`)
      .then(r => r.json())
      .then(d => {
        setNotifications(d.notifications || []);
        setUnreadCount(d.unread_count || 0);
      })
      .catch(() => {
        setNotifications([]);
        setUnreadCount(0);
      })
      .finally(() => setLoading(false));
  };

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
    fetchNotifications();
  };

  const markAllRead = async () => {
    await fetch("/api/notifications/read-all", { method: "PUT" });
    fetchNotifications();
  };

  const deleteNotification = async (id: string) => {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    fetchNotifications();
  };

  const typeColors: Record<string, string> = {
    deadline: "#FF6C6C",
    study: "#0066FF",
    lecture: "#7B2FBE",
    system: "#00D4FF",
  };

  const typeEmoji: Record<string, string> = {
    deadline: "⏰",
    study: "📖",
    lecture: "🎓",
    system: "🔔",
  };

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ width: 40, height: 40, border: "3px solid rgba(255,215,0,0.3)", borderTopColor: "#FFD700", borderRadius: "50%" }}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Notifications" subtitle={`${unreadCount} unread`} icon={<Bell size={24} color="#FFD700" />} />

      <NotificationPrefsPanel open={prefsOpen} onClose={() => setPrefsOpen(false)} />

      {/* Actions bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        {/* Filters */}
        <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 14, padding: 4, flexWrap: "wrap" }}>
          {["all", "unread", "deadline", "study", "lecture", "system"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
              background: filter === f ? "rgba(0,102,255,0.15)" : "transparent",
              color: filter === f ? "#fff" : "rgba(160,180,230,0.6)", fontFamily: "Space Grotesk", fontSize: 13, fontWeight: 600,
              textTransform: "capitalize",
            }}>{f}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(0,102,255,0.2)", cursor: "pointer",
              background: "transparent", color: "#0066FF", fontSize: 13, fontWeight: 600,
            }}>
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
          <button
            onClick={() => setPrefsOpen(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10,
              border: "1px solid rgba(255,215,0,0.2)", cursor: "pointer",
              background: "rgba(255,215,0,0.06)", color: "#FFD700", fontSize: 13, fontWeight: 600,
            }}
          >
            <Settings size={14} /> Preferences
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {notifications.length === 0 ? (
          <GlassCard style={{ textAlign: "center", padding: 40 }}>
            <Bell size={40} color="rgba(255,215,0,0.2)" style={{ marginBottom: 12 }} />
            <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 14 }}>No notifications yet</div>
          </GlassCard>
        ) : (
          notifications.map((n: any) => {
            const isUnread = !n.read_at;
            const color = typeColors[n.notification_type] || "#0066FF";
            const emoji = typeEmoji[n.notification_type] || "🔔";

            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                style={{
                  padding: "16px 20px",
                  background: isUnread ? "rgba(0,102,255,0.04)" : "rgba(255,255,255,0.02)",
                  border: `1px solid ${isUnread ? "rgba(0,102,255,0.12)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "all 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: 1 }}>
                  {/* Unread dot */}
                  {isUnread && (
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, marginTop: 6, flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ color: "#e8f0ff", fontWeight: isUnread ? 700 : 500, fontSize: 14 }}>
                      {emoji} {n.title}
                    </div>
                    <div style={{ color: "rgba(160,180,230,0.6)", fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                      {n.message}
                    </div>
                    <div style={{ color: "rgba(160,180,230,0.4)", fontSize: 11, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={11} />
                      {new Date(n.scheduled_at).toLocaleString()}
                      <span style={{ padding: "2px 8px", borderRadius: 10, background: `${color}15`, color, fontSize: 10, fontWeight: 600, marginLeft: 8, textTransform: "capitalize" }}>
                        {n.notification_type}
                      </span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  {isUnread && (
                    <button onClick={() => markRead(n.id)} style={{ background: "rgba(0,102,255,0.08)", border: "1px solid rgba(0,102,255,0.15)", borderRadius: 8, cursor: "pointer", padding: "6px", display: "grid", placeItems: "center" }}>
                      <Check size={14} color="#0066FF" />
                    </button>
                  )}
                  <button onClick={() => deleteNotification(n.id)} style={{ background: "rgba(255,108,108,0.06)", border: "1px solid rgba(255,108,108,0.12)", borderRadius: 8, cursor: "pointer", padding: "6px", display: "grid", placeItems: "center" }}>
                    <Trash2 size={14} color="#FF6C6C" />
                  </button>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
