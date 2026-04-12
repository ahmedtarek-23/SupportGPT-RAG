import { useState, useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard, CalendarClock, BrainCircuit, Layers3,
  Bell, MessageSquare, BookOpen, ChevronLeft, ChevronRight,
  FileText, LineChart, BookMarked, Settings,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { label: "Courses", icon: BookMarked, path: "/courses" },
  { label: "Study Planner", icon: BrainCircuit, path: "/planner" },
  { label: "Deadlines", icon: CalendarClock, path: "/deadlines" },
  { label: "Notifications", icon: Bell, path: "/notifications" },
  { label: "Flashcards", icon: Layers3, path: "/flashcards" },
  { label: "Lecture Notes", icon: FileText, path: "/notes" },
  { label: "AI Chat Assistant", icon: MessageSquare, path: "/chat" },
  { label: "Analytics", icon: LineChart, path: "/analytics" },
];

export function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchUnread = () => {
      fetch("/api/notifications/unread-count")
        .then(r => r.json())
        .then(d => setUnreadCount(d.unread_count ?? 0))
        .catch(() => {});
    };
    fetchUnread();
    const id = setInterval(fetchUnread, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--sm-bg)",
        fontFamily: "Space Grotesk, sans-serif",
        display: "flex",
        position: "relative",
      }}
    >
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "var(--sm-sidebar-bg)",
          borderRight: "1px solid var(--sm-border-subtle)",
          backdropFilter: `blur(var(--sm-backdrop-blur))`,
          display: "flex",
          flexDirection: "column",
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          zIndex: 50,
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: collapsed ? "20px 16px" : "20px 24px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            borderBottom: "1px solid var(--sm-border-subtle)",
            minHeight: 72,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              minWidth: 36,
              borderRadius: 10,
              background: `linear-gradient(135deg, var(--sm-accent-1), var(--sm-accent-2))`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 0 20px var(--sm-logo-glow)`,
            }}
          >
            <BookOpen size={18} color="#fff" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  background: `linear-gradient(90deg, var(--sm-text-primary), var(--sm-accent-3))`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  whiteSpace: "nowrap",
                }}
              >
                StudyMate
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "16px 8px", display: "flex", flexDirection: "column", gap: 4, overflowY: "auto" }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: "none",
                  cursor: "pointer",
                  background: isActive ? "var(--sm-nav-active-bg)" : "transparent",
                  color: isActive ? "var(--sm-text-primary)" : "var(--sm-text-secondary)",
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  transition: "all 0.2s ease",
                  textAlign: "left",
                  width: "100%",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "var(--sm-surface-hover)";
                    e.currentTarget.style.color = "var(--sm-text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "var(--sm-text-secondary)";
                  }
                }}
              >
                {isActive && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 3,
                      height: 20,
                      borderRadius: "0 4px 4px 0",
                      background: `linear-gradient(180deg, var(--sm-accent-1), var(--sm-accent-2))`,
                    }}
                  />
                )}
                <div style={{ position: "relative", minWidth: 20 }}>
                  <Icon size={20} />
                  {item.path === "/notifications" && unreadCount > 0 && (
                    <span style={{
                      position: "absolute", top: -5, right: -6,
                      minWidth: 16, height: 16, borderRadius: 8,
                      background: `linear-gradient(135deg, var(--sm-accent-1), var(--sm-accent-2))`,
                      color: "#fff", fontSize: 9, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      padding: "0 3px", lineHeight: 1,
                    }}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div style={{ padding: "16px 8px", borderTop: "1px solid var(--sm-border-subtle)" }}>

          {/* Settings */}
          <button
            onClick={() => navigate("/settings")}
            title={collapsed ? "Settings" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 16px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background: location.pathname === "/settings" ? "var(--sm-surface)" : "transparent",
              color: location.pathname === "/settings" ? "var(--sm-text-primary)" : "var(--sm-text-secondary)",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 14,
              fontWeight: 500,
              width: "100%",
              textAlign: "left",
              marginBottom: 4,
              transition: "all 0.2s ease",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = "var(--sm-text-primary)";
              e.currentTarget.style.background = "var(--sm-surface-hover)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = location.pathname === "/settings" ? "var(--sm-text-primary)" : "var(--sm-text-secondary)";
              e.currentTarget.style.background = location.pathname === "/settings" ? "var(--sm-surface)" : "transparent";
            }}
          >
            <Settings size={18} style={{ minWidth: 18 }} />
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ whiteSpace: "nowrap" }}>
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: 12,
              padding: "10px 16px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background: "transparent",
              color: "var(--sm-text-tertiary)",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 12,
              width: "100%",
              marginTop: 4,
              transition: "all 0.2s ease",
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            <AnimatePresence>
              {!collapsed && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  Collapse
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          marginLeft: collapsed ? 72 : 260,
          transition: "margin-left 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
          minHeight: "100vh",
          padding: "32px 40px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
