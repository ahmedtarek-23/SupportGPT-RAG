import { Navigate, BrowserRouter, Routes, Route } from "react-router";
import { Toaster } from "sonner";
import { ThemeProvider } from "./context/ThemeContext";
import { DashboardLayout } from "./layouts/DashboardLayout";
import DashboardPage from "./pages/DashboardPage";
import CoursesPage from "./pages/CoursesPage";
import DeadlinesPage from "./pages/DeadlinesPage";
import StudyPlannerPage from "./pages/StudyPlannerPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import NotificationsPage from "./pages/NotificationsPage";
import ChatAssistantPage from "./pages/ChatAssistantPage";
import LectureNotesPage from "./pages/LectureNotesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";

export default function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--sm-sidebar-bg)",
            border: "1px solid var(--sm-border)",
            color: "var(--sm-text-primary)",
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: 14,
            borderRadius: 14,
            backdropFilter: "blur(var(--sm-backdrop-blur))",
          },
        }}
      />
      <Routes>
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/deadlines" element={<DeadlinesPage />} />
          <Route path="/planner" element={<StudyPlannerPage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/chat" element={<ChatAssistantPage />} />
          <Route path="/notes" element={<LectureNotesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
    </ThemeProvider>
  );
}
