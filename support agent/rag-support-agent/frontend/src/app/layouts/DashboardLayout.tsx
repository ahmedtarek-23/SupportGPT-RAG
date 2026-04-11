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
        background: "#03040F",
        fontFamily: "Space Grotesk, sans-serif",
        display: "flex",
      }}
    >
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "rgba(5, 6, 17, 0.95)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(24px)",
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
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            minHeight: 72,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              minWidth: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 20px rgba(0, 102, 255, 0.4)",
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
                  background: "linear-gradient(90deg, #fff, #a0b4ff)",
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
                  background: isActive
                    ? "linear-gradient(135deg, rgba(0,102,255,0.15), rgba(123,47,190,0.1))"
                    : "transparent",
                  color: isActive ? "#fff" : "rgba(160, 180, 230, 0.7)",
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
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.color = "#e8f0ff";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(160, 180, 230, 0.7)";
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
                      background: "linear-gradient(180deg, #0066FF, #7B2FBE)",
                    }}
                  />
                )}
                <div style={{ position: "relative", minWidth: 20 }}>
                  <Icon size={20} />
                  {item.path === "/notifications" && unreadCount > 0 && (
                    <span style={{
                      position: "absolute", top: -5, right: -6,
                      minWidth: 16, height: 16, borderRadius: 8,
                      background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
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
        <div style={{ padding: "16px 8px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>

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
              background: location.pathname === "/settings" ? "rgba(123,47,190,0.12)" : "transparent",
              color: location.pathname === "/settings" ? "#fff" : "rgba(160, 180, 230, 0.5)",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 14,
              fontWeight: 500,
              width: "100%",
              textAlign: "left",
              marginBottom: 4,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = "#e8f0ff"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            onMouseLeave={e => {
              e.currentTarget.style.color = location.pathname === "/settings" ? "#fff" : "rgba(160, 180, 230, 0.5)";
              e.currentTarget.style.background = location.pathname === "/settings" ? "rgba(123,47,190,0.12)" : "transparent";
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
              color: "rgba(160, 180, 230, 0.4)",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 12,
              width: "100%",
              marginTop: 4,
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
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
