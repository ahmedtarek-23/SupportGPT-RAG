import { Navigate, BrowserRouter, Routes, Route } from "react-router";
import { Toaster } from "sonner";
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
    <BrowserRouter>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgba(8,10,28,0.97)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#e8f0ff",
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: 14,
            borderRadius: 14,
            backdropFilter: "blur(24px)",
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
  );
}
