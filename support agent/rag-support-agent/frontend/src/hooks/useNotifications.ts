import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "../services/api";
import type { Notification } from "../types";

export function useNotifications(filter?: { unread_only?: boolean; notification_type?: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const data = await api.notifications.list(filter);
      setNotifications(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [JSON.stringify(filter)]);

  useEffect(() => { refetch(); }, [refetch]);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const markRead = async (id: string): Promise<void> => {
    await api.notifications.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  };

  const markAllRead = async (): Promise<void> => {
    await api.notifications.markAllRead();
    const now = new Date().toISOString();
    setNotifications(prev => prev.map(n => ({ ...n, read_at: n.read_at || now })));
    toast.success("All notifications marked as read");
  };

  const deleteNotification = async (id: string): Promise<void> => {
    await api.notifications.delete(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications, unreadCount, loading, error,
    refetch, markRead, markAllRead, deleteNotification,
  };
}
