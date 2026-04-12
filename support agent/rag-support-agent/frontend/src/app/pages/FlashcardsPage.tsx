import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Layers3, Sparkles, RotateCcw, Trash2 } from "lucide-react";
import { GlassCard, PageHeader } from "../components/shared/GlassCard";
import { toast } from "sonner";

export default function FlashcardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [reviewQueue, setReviewQueue] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [mode, setMode] = useState<"browse" | "review" | "generate">("browse");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [genTopic, setGenTopic] = useState("");
  const [genCount, setGenCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchCards(), fetchStats()]);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (mode !== "review") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); setFlipped(f => !f); }
      if (e.key === "ArrowRight" && flipped) reviewCard(4);
      if (e.key === "ArrowLeft" && flipped) reviewCard(2);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, flipped, currentIdx]);

  const fetchCards = () =>
    fetch("/api/flashcards").then(r => r.json()).then(setCards).catch(() => setCards([]));

  const fetchStats = () =>
    fetch("/api/flashcards/stats").then(r => r.json()).then(setStats).catch(() => setStats(null));

  const fetchReview = () =>
    fetch("/api/flashcards/review").then(r => r.json()).then(d => {
      setReviewQueue(d.flashcards || d || []);
      setCurrentIdx(0);
      setFlipped(false);
    }).catch(() => { setReviewQueue([]); setCurrentIdx(0); setFlipped(false); });

  if (loading) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "60vh" }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{
            width: 40, height: 40,
            border: "3px solid var(--sm-border)",
            borderTopColor: "var(--sm-accent-3)",
            borderRadius: "50%",
          }}
        />
      </div>
    );
  }

  const generate = async () => {
    if (!genTopic) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: genTopic, count: genCount }),
      });
      const data = await res.json();
      const generated = data?.generated ?? 0;
      if (generated === 0) {
        toast.error("No flashcards generated — no relevant course material found. Upload related documents first.");
      } else {
        toast.success(`Generated ${generated} flashcard${generated !== 1 ? "s" : ""} from your course material`);
        fetchCards();
        fetchStats();
        setMode("browse");
        setGenTopic("");
      }
    } catch {
      toast.error("Failed to generate flashcards. Please try again.");
    }
    setGenerating(false);
  };

  const reviewCard = async (quality: number) => {
    const card = reviewQueue[currentIdx];
    if (!card) return;
    await fetch(`/api/flashcards/${card.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quality }),
    });
    setFlipped(false);
    if (currentIdx < reviewQueue.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      fetchStats();
      setMode("browse");
    }
  };

  const deleteCard = async (id: string) => {
    await fetch(`/api/flashcards/${id}`, { method: "DELETE" });
    fetchCards();
    fetchStats();
  };

  return (
    <div>
      <PageHeader
        title="Flashcards"
        subtitle="AI-generated study cards with spaced repetition"
        icon={<Layers3 size={24} color="var(--sm-accent-3)" />}
      />

      {/* Mode tabs */}
      <div className="sm-tab-bar" style={{
        display: "flex", gap: 4, marginBottom: 24,
        background: "var(--sm-surface)", borderRadius: 14, padding: 4, width: "fit-content",
      }}>
        {(["browse", "review", "generate"] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); if (m === "review") fetchReview(); }} style={{
            padding: "10px 20px", borderRadius: 10, border: "none", cursor: "pointer",
            background: mode === m
              ? "linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,102,255,0.1))"
              : "transparent",
            color: mode === m ? "var(--sm-text-primary)" : "var(--sm-text-secondary)",
            fontFamily: "Space Grotesk", fontSize: 14, fontWeight: 600, textTransform: "capitalize",
          }}>
            {m === "generate" ? "AI Generate" : m}
          </button>
        ))}
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 24 }}>
          <GlassCard hover={false} style={{ padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "var(--sm-text-primary)", fontFamily: "Syne" }}>
              {stats.total_cards}
            </div>
            <div style={{ fontSize: 12, color: "var(--sm-text-secondary)" }}>Total Cards</div>
          </GlassCard>
          <GlassCard hover={false} style={{ padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#E6B800", fontFamily: "Syne" }}>
              {stats.due_for_review}
            </div>
            <div style={{ fontSize: 12, color: "var(--sm-text-secondary)" }}>Due for Review</div>
          </GlassCard>
          <GlassCard hover={false} style={{ padding: "14px 18px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#00C97A", fontFamily: "Syne" }}>
              {stats.mastered}
            </div>
            <div style={{ fontSize: 12, color: "var(--sm-text-secondary)" }}>Mastered</div>
          </GlassCard>
        </div>
      )}

      {/* ── Browse mode ─────────────────────────────────────────────── */}
      {mode === "browse" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
          {cards.length === 0 ? (
            <GlassCard style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40 }}>
              <Layers3 size={40} color="var(--sm-text-tertiary)" style={{ marginBottom: 12 }} />
              <div style={{ color: "var(--sm-text-secondary)", fontSize: 14 }}>
                No flashcards yet. Use AI Generate to create some!
              </div>
            </GlassCard>
          ) : cards.map((c: any) => (
            <GlassCard key={c.id} style={{ position: "relative" }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{ color: "var(--sm-accent-3)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                  Question
                </div>
                <div style={{ color: "var(--sm-text-primary)", fontSize: 14, lineHeight: 1.6 }}>{c.question}</div>
              </div>
              <div style={{
                padding: "12px", background: "var(--sm-surface-hover)",
                borderRadius: 12, border: "1px solid var(--sm-border)",
              }}>
                <div style={{ color: "#00C97A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                  Answer
                </div>
                <div style={{ color: "var(--sm-text-primary)", fontSize: 13, lineHeight: 1.6 }}>{c.answer}</div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <span style={{ fontSize: 11, color: "var(--sm-text-tertiary)" }}>
                  {c.course_name || "General"} · Rep: {c.repetitions} · EF: {c.ease_factor?.toFixed(1)}
                </span>
                <button onClick={() => deleteCard(c.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(224,85,85,0.5)", padding: 4 }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* ── Review mode ─────────────────────────────────────────────── */}
      {mode === "review" && (
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          {reviewQueue.length === 0 ? (
            <GlassCard style={{ textAlign: "center", padding: 40 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <div style={{ color: "var(--sm-text-primary)", fontWeight: 700, fontSize: 18 }}>All caught up!</div>
              <div style={{ color: "var(--sm-text-secondary)", fontSize: 14, marginTop: 8 }}>
                No cards due for review right now.
              </div>
            </GlassCard>
          ) : (
            <>
              <div style={{ textAlign: "center", color: "var(--sm-text-secondary)", fontSize: 13, marginBottom: 16 }}>
                Card {currentIdx + 1} of {reviewQueue.length}
              </div>

              {/* 3D flip card */}
              <div style={{ perspective: "1200px", cursor: "pointer" }} onClick={() => setFlipped(f => !f)}>
                <motion.div
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                  style={{ position: "relative", minHeight: 250, transformStyle: "preserve-3d" }}
                >
                  {/* Front face — Question */}
                  <div
                    className="fc-face-front"
                    style={{
                      position: "absolute", inset: 0, backfaceVisibility: "hidden",
                      display: "flex", flexDirection: "column", justifyContent: "center",
                      alignItems: "center", textAlign: "center", padding: 32,
                      background: "var(--sm-surface)", borderRadius: 20,
                      border: "1px solid var(--sm-border)",
                    }}
                  >
                    <div style={{ color: "var(--sm-accent-3)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>
                      Question
                    </div>
                    <div style={{ color: "var(--sm-text-primary)", fontSize: 18, lineHeight: 1.6 }}>
                      {reviewQueue[currentIdx]?.question}
                    </div>
                    <div style={{ color: "var(--sm-text-tertiary)", fontSize: 12, marginTop: 20 }}>
                      Tap to reveal answer
                    </div>
                  </div>

                  {/* Back face — Answer */}
                  <div
                    className="fc-face-back"
                    style={{
                      position: "absolute", inset: 0, backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      display: "flex", flexDirection: "column", justifyContent: "center",
                      alignItems: "center", textAlign: "center", padding: 32,
                      background: "var(--sm-surface)", borderRadius: 20,
                      border: "1px solid var(--sm-border)",
                    }}
                  >
                    <div style={{ color: "#00C97A", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 16 }}>
                      Answer
                    </div>
                    <div style={{ color: "var(--sm-text-primary)", fontSize: 18, lineHeight: 1.6 }}>
                      {reviewQueue[currentIdx]?.answer}
                    </div>
                  </div>
                </motion.div>
              </div>

              {flipped && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center", flexWrap: "wrap" }}
                >
                  <RatingButton label="Again" color="#E05555" onClick={() => reviewCard(1)} />
                  <RatingButton label="Hard" color="#E07A00" onClick={() => reviewCard(2)} />
                  <RatingButton label="Good" color="#E6B800" onClick={() => reviewCard(3)} />
                  <RatingButton label="Easy" color="#00C97A" onClick={() => reviewCard(4)} />
                  <RatingButton label="Perfect" color="var(--sm-accent-3)" onClick={() => reviewCard(5)} />
                </motion.div>
              )}

              <div style={{ textAlign: "center", color: "var(--sm-text-tertiary)", fontSize: 11, marginTop: 14 }}>
                Space to flip · ← Hard · → Easy
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Generate mode ───────────────────────────────────────────── */}
      {mode === "generate" && (
        <GlassCard style={{ maxWidth: 600 }} glow="rgba(0,212,255,0.05)">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Sparkles size={20} color="var(--sm-accent-3)" />
            <h3 style={{ color: "var(--sm-text-primary)", fontWeight: 700, fontSize: 16, margin: 0 }}>
              AI Flashcard Generator
            </h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input
              style={{
                width: "100%", padding: "14px 18px",
                background: "var(--sm-input-bg)", border: "1px solid var(--sm-input-border)",
                borderRadius: 14, color: "var(--sm-text-primary)", fontSize: 15, outline: "none",
              }}
              placeholder="Enter a topic (e.g. 'Binary Search Trees', 'Photosynthesis')..."
              value={genTopic}
              onChange={e => setGenTopic(e.target.value)}
              onKeyDown={e => e.key === "Enter" && generate()}
            />
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ color: "var(--sm-text-secondary)", fontSize: 14 }}>Cards to generate:</span>
              <select
                value={genCount}
                onChange={e => setGenCount(Number(e.target.value))}
                style={{
                  padding: "8px 12px",
                  background: "var(--sm-input-bg)", border: "1px solid var(--sm-input-border)",
                  borderRadius: 10, color: "var(--sm-text-primary)", fontSize: 14, cursor: "pointer",
                }}
              >
                {[5, 10, 15, 20, 30].map(n => (
                  <option key={n} value={n} style={{ background: "var(--sm-sidebar-bg)" }}>{n}</option>
                ))}
              </select>
            </div>
            <button
              onClick={generate}
              disabled={generating || !genTopic}
              style={{
                padding: "14px", borderRadius: 14, border: "none",
                cursor: generating ? "not-allowed" : "pointer",
                background: "linear-gradient(135deg, var(--sm-accent-3), var(--sm-accent-1))",
                color: "#fff", fontWeight: 700, fontSize: 15,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                opacity: generating || !genTopic ? 0.65 : 1,
              }}
            >
              {generating
                ? <><RotateCcw size={16} className="animate-spin" /> Generating...</>
                : <><Sparkles size={16} /> Generate Flashcards</>
              }
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

function RatingButton({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 16px", borderRadius: 12,
        border: `1px solid ${color}55`, background: `${color}15`,
        color, fontWeight: 600, fontSize: 13, cursor: "pointer", transition: "all 0.2s",
      }}
      onMouseEnter={e => { (e.currentTarget).style.background = `${color}28`; }}
      onMouseLeave={e => { (e.currentTarget).style.background = `${color}15`; }}
    >
      {label}
    </button>
  );
}
