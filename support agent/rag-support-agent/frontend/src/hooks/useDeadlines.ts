import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "../services/api";
import type { Deadline, DeadlineCreate } from "../types";

interface DeadlineFilters {
  status?: string;
  deadline_type?: string;
  course_id?: string;
  days_ahead?: number;
}

export function useDeadlines(filters?: DeadlineFilters) {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [total, setTotal] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.deadlines.list(filters);
      setDeadlines(res.deadlines);
      setTotal(res.total);
      setUpcomingCount(res.upcoming_count);
      setOverdueCount(res.overdue_count);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [JSON.stringify(filters)]);

  useEffect(() => { refetch(); }, [refetch]);

  const createDeadline = async (data: DeadlineCreate): Promise<Deadline> => {
    const dl = await api.deadlines.create(data);
    setDeadlines(prev => [dl, ...prev]);
    setTotal(t => t + 1);
    toast.success(`Deadline "${dl.title}" added`);
    return dl;
  };

  const updateDeadline = async (id: string, data: Partial<DeadlineCreate & { status?: string }>): Promise<Deadline> => {
    const updated = await api.deadlines.update(id, data);
    setDeadlines(prev => prev.map(d => d.id === id ? updated : d));
    toast.success("Deadline updated");
    return updated;
  };

  const completeDeadline = async (id: string): Promise<void> => {
    await api.deadlines.update(id, { status: "completed" });
    setDeadlines(prev => prev.map(d => d.id === id ? { ...d, status: "completed" } : d));
    toast.success("Deadline marked complete");
  };

  const deleteDeadline = async (id: string): Promise<void> => {
    await api.deadlines.delete(id);
    setDeadlines(prev => prev.filter(d => d.id !== id));
    setTotal(t => t - 1);
    toast.success("Deadline deleted");
  };

  return {
    deadlines, total, upcomingCount, overdueCount,
    loading, error, refetch,
    createDeadline, updateDeadline, completeDeadline, deleteDeadline,
  };
}
