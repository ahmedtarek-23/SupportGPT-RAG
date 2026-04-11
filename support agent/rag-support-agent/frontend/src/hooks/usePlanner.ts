import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "../services/api";
import type { StudyPlan, StudySession } from "../types";

export function usePlanner() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [currentPlan, currentSessions] = await Promise.all([
        api.planner.current().catch(() => null),
        api.planner.sessions({ days_ahead: 14 }).catch(() => []),
      ]);
      setPlan(currentPlan);
      setSessions(currentSessions);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const generatePlan = async (): Promise<void> => {
    try {
      setGenerating(true);
      const newPlan = await api.planner.generate();
      setPlan(newPlan);
      // Reload sessions after plan generation
      const newSessions = await api.planner.sessions({ days_ahead: 14 }).catch(() => []);
      setSessions(newSessions);
      toast.success("Study plan generated!");
    } catch (e: any) {
      toast.error(`Failed to generate plan: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const updateSession = async (id: string, status: string, notes?: string): Promise<void> => {
    const updated = await api.planner.updateSession(id, { status, notes });
    setSessions(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    if (status === "completed") toast.success("Session marked complete!");
    if (status === "skipped") toast.info("Session skipped");
  };

  return { plan, sessions, loading, generating, error, refetch, generatePlan, updateSession };
}
