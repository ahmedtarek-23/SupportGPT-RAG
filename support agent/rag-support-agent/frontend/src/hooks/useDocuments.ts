import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { api } from "../services/api";
import type { Document, UploadTaskStatus } from "../types";

export interface UploadingFile {
  id: string;
  file: File;
  taskId: string | null;
  documentId: string | null;
  status: "queued" | "uploading" | "processing" | "done" | "error";
  progress: number;
  error: string | null;
}

export function useDocuments(courseId?: string) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadingFile[]>([]);
  const pollingRefs = useRef<Record<string, ReturnType<typeof setInterval>>>({});

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (courseId) {
        const res = await api.documents.byCourse(courseId);
        setDocuments(res.documents);
        setTotal(res.total);
      } else {
        const res = await api.documents.list();
        setDocuments(res.documents);
        setTotal(res.total);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { refetch(); }, [refetch]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => { Object.values(pollingRefs.current).forEach(clearInterval); };
  }, []);

  const pollTask = (uploadId: string, taskId: string) => {
    const interval = setInterval(async () => {
      try {
        const status: UploadTaskStatus = await api.documents.uploadStatus(taskId);
        const state = status.state.toUpperCase();

        if (state === "SUCCESS") {
          clearInterval(pollingRefs.current[uploadId]);
          delete pollingRefs.current[uploadId];
          setUploads(prev => prev.map(u =>
            u.id === uploadId ? { ...u, status: "done", progress: 100 } : u
          ));
          toast.success("Document ingested successfully!");
          refetch();
        } else if (state === "FAILURE") {
          clearInterval(pollingRefs.current[uploadId]);
          delete pollingRefs.current[uploadId];
          setUploads(prev => prev.map(u =>
            u.id === uploadId
              ? { ...u, status: "error", error: status.error || "Processing failed" }
              : u
          ));
          toast.error("Document processing failed");
        } else {
          setUploads(prev => prev.map(u =>
            u.id === uploadId ? { ...u, status: "processing", progress: 60 } : u
          ));
        }
      } catch {
        // Polling error — keep trying
      }
    }, 2000);
    pollingRefs.current[uploadId] = interval;
  };

  const uploadFile = async (file: File, sourceName?: string): Promise<void> => {
    const uploadId = `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    setUploads(prev => [...prev, {
      id: uploadId, file, taskId: null, documentId: null,
      status: "uploading", progress: 20, error: null,
    }]);

    try {
      const res = await api.documents.upload(file, sourceName || file.name);
      setUploads(prev => prev.map(u =>
        u.id === uploadId
          ? { ...u, taskId: res.task_id, documentId: res.document_id, status: "processing", progress: 40 }
          : u
      ));
      pollTask(uploadId, res.task_id);
    } catch (e: any) {
      setUploads(prev => prev.map(u =>
        u.id === uploadId ? { ...u, status: "error", error: e.message } : u
      ));
      toast.error(`Upload failed: ${e.message}`);
    }
  };

  const clearUpload = (uploadId: string) => {
    if (pollingRefs.current[uploadId]) {
      clearInterval(pollingRefs.current[uploadId]);
      delete pollingRefs.current[uploadId];
    }
    setUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const clearCompletedUploads = () => {
    setUploads(prev => prev.filter(u => u.status !== "done" && u.status !== "error"));
  };

  return {
    documents, total, loading, error, uploads,
    refetch, uploadFile, clearUpload, clearCompletedUploads,
  };
}
