import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { api } from "../services/api";
import type { Flashcard, FlashcardStats } from "../types";

export function useFlashcards(courseId?: string) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [cards, cardStats, review] = await Promise.all([
        api.flashcards.list(courseId ? { course_id: courseId } : undefined),
        api.flashcards.stats(),
        api.flashcards.review(),
      ]);
      setFlashcards(cards);
      setStats(cardStats);
      setReviewQueue(review);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { refetch(); }, [refetch]);

  const submitReview = async (id: string, quality: number): Promise<void> => {
    const updated = await api.flashcards.submitReview(id, quality);
    setFlashcards(prev => prev.map(f => f.id === id ? updated : f));
    setReviewQueue(prev => prev.filter(f => f.id !== id));
    if (quality >= 3) toast.success("Good work! Card scheduled.");
    else toast.info("Card flagged for re-review soon.");
  };

  const generate = async (topic: string, count = 10): Promise<void> => {
    try {
      setGenerating(true);
      const newCards = await api.flashcards.generate({
        topic,
        course_id: courseId,
        count,
      });
      setFlashcards(prev => [...newCards, ...prev]);
      if (stats) setStats({ ...stats, total_cards: stats.total_cards + newCards.length });
      toast.success(`${newCards.length} flashcards generated!`);
    } catch (e: any) {
      toast.error(`Generation failed: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const deleteCard = async (id: string): Promise<void> => {
    await api.flashcards.delete(id);
    setFlashcards(prev => prev.filter(f => f.id !== id));
    setReviewQueue(prev => prev.filter(f => f.id !== id));
    toast.success("Flashcard deleted");
  };

  return {
    flashcards, stats, reviewQueue,
    loading, generating, error,
    refetch, submitReview, generate, deleteCard,
  };
}
