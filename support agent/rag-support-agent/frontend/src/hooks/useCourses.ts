import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "../services/api";
import type { Course, CourseCreate, CourseDetails } from "../types";

export function useCourses(activeOnly = true) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.courses.list(activeOnly);
      setCourses(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activeOnly]);

  useEffect(() => { refetch(); }, [refetch]);

  const createCourse = async (data: CourseCreate): Promise<Course> => {
    const course = await api.courses.create(data);
    setCourses(prev => [...prev, course]);
    toast.success(`Course "${course.name}" created`);
    return course;
  };

  const updateCourse = async (id: string, data: Partial<CourseCreate>): Promise<Course> => {
    const updated = await api.courses.update(id, data);
    setCourses(prev => prev.map(c => c.id === id ? updated : c));
    toast.success("Course updated");
    return updated;
  };

  const deleteCourse = async (id: string): Promise<void> => {
    await api.courses.delete(id);
    setCourses(prev => prev.filter(c => c.id !== id));
    toast.success("Course deleted");
  };

  return { courses, loading, error, refetch, createCourse, updateCourse, deleteCourse };
}

export function useCourseDetails(courseId: string | null) {
  const [details, setDetails] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!courseId) { setDetails(null); return; }
    try {
      setLoading(true);
      setError(null);
      const data = await api.courses.details(courseId);
      setDetails(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { refetch(); }, [refetch]);

  return { details, loading, error, refetch };
}
