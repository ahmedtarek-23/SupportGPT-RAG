import { useState, useRef, useEffect } from "react";
import {
  Loader2, Send, MessageSquare, CheckCircle, AlertCircle,
  HelpCircle, FileText, ThumbsUp, ThumbsDown, X,
} from "lucide-react";
import { api } from "../../services/api";

interface Message {
  role: "user" | "assistant";
  text: string;
  confidence?: { level: string; score: number; explanation: string };
  sources?: Array<{ source: string; snippet: string; similarity: number }>;
  feedbackSubmitted?: boolean;
  query?: string;
}

interface ClarificationQuestion {
  question: string;
  options: string[];
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "#00C97A",
  medium: "#E6B800",
  low: "#E05555",
};

export function SupportChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarification, setClarification] = useState<ClarificationQuestion | null>(null);
  const [selectedClarification, setSelectedClarification] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState<number | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, clarification]);

  const addAssistantMessage = (data: any, userQuery: string) => {
    setMessages((cur) => [
      ...cur,
      {
        role: "assistant",
        text: data.answer || "No response.",
        confidence: data.confidence,
        sources: data.sources?.map((s: any) => ({
          source: s.source,
          snippet: (s.text || "").substring(0, 120) + "...",
          similarity: s.similarity_score,
        })) || [],
        query: userQuery,
      },
    ]);
  };

  const handleSend = async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    setError(null);
    setMessages((cur) => [...cur, { role: "user", text: trimmed }]);
    setQuery("");
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const data = await api.chat.send({ query: trimmed, session_id: sessionId ?? undefined });
      if (data.session_id && !sessionId) setSessionId(data.session_id);
      if (data.clarifications) {
        setClarification({ question: data.clarifications.question, options: data.clarifications.options });
      } else {
        addAssistantMessage(data, trimmed);
        setClarification(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to reach the AI.";
      setError(controller.signal.aborted ? "Request timed out. Is Ollama running?" : msg);
    } finally {
      clearTimeout(timer);
      setLoading(false);
    }
  };

  const handleClarification = async (option: string) => {
    setSelectedClarification(option);
    setError(null);
    setClarification(null);
    setLoading(true);
    const lastUserQuery = messages.filter((m) => m.role === "user").pop()?.text || "";
    try {
      const data = await api.chat.clarify({
        session_id: sessionId ?? "",
        original_query: lastUserQuery,
        clarification_response: option,
      });
      addAssistantMessage(data, lastUserQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clarification failed. Try again.");
    } finally {
      setLoading(false);
      setSelectedClarification(null);
    }
  };

  const handleFeedbackSubmit = async (msgIndex: number) => {
    const msg = messages[msgIndex];
    if (!msg || feedbackRating === 0) return;
    setFeedbackSubmitting(true);
    try {
      await api.feedback.submit({
        query: msg.query || "",
        answer: msg.text,
        rating: feedbackRating,
        comment: feedbackComment || undefined,
      });
      setMessages((cur) =>
        cur.map((m, i) => (i === msgIndex ? { ...m, feedbackSubmitted: true } : m))
      );
      setFeedbackOpen(null);
      setFeedbackRating(0);
      setFeedbackComment("");
    } catch {
      // silent – don't break chat on feedback failure
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const getConfidenceIcon = (level: string) => {
    const color = CONFIDENCE_COLORS[level] || "var(--sm-text-tertiary)";
    if (level === "high") return <CheckCircle color={color} size={14} />;
    return <AlertCircle color={color} size={14} />;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: "rgba(0,212,255,0.12)",
          display: "grid", placeItems: "center", flexShrink: 0,
        }}>
          <MessageSquare color="var(--sm-accent-3)" size={20} />
        </div>
        <div>
          <div style={{ fontFamily: "Syne, sans-serif", fontWeight: 700, fontSize: 18, color: "var(--sm-text-primary)" }}>
            AI Chat Assistant
          </div>
          <div style={{ fontSize: 12, color: "var(--sm-text-secondary)" }}>
            RAG · Local AI · Session memory
          </div>
        </div>
        {sessionId && (
          <div style={{
            marginLeft: "auto", fontSize: 11,
            color: "var(--sm-accent-3)",
            background: "rgba(0,212,255,0.07)",
            border: "1px solid rgba(0,212,255,0.2)",
            borderRadius: 8, padding: "3px 10px",
          }}>
            Session active
          </div>
        )}
      </div>

      {/* Message thread */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, paddingRight: 4, minHeight: 0 }}>

        {messages.length === 0 && (
          <div style={{ color: "var(--sm-text-secondary)", fontSize: 14, textAlign: "center", marginTop: 60, lineHeight: 1.8 }}>
            Ask anything about your uploaded notes, deadlines, or course content.
            <br />
            Answers include confidence scores and source attribution.
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx}>
            {/* Bubble */}
            <div style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div
                className={msg.role === "assistant" ? "chat-bubble-assistant" : "chat-bubble-user"}
                style={{
                  maxWidth: "85%",
                  padding: "14px 18px",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, rgba(0,102,255,0.25), rgba(123,47,190,0.2))"
                    : "var(--sm-surface)",
                  border: msg.role === "user"
                    ? "1px solid rgba(0,102,255,0.3)"
                    : "1px solid var(--sm-border)",
                  color: "var(--sm-text-primary)",
                  fontSize: 14,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                }}
              >
                <div style={{
                  fontSize: 11, fontWeight: 700,
                  color: msg.role === "user" ? "var(--sm-accent-3)" : "var(--sm-text-secondary)",
                  marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em",
                }}>
                  {msg.role === "user" ? "You" : "StudyMate AI"}
                </div>
                {msg.text}
              </div>
            </div>

            {/* Confidence + sources + feedback (assistant only) */}
            {msg.role === "assistant" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, marginLeft: 4 }}>

                {msg.confidence && (
                  <div
                    className="confidence-badge"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12,
                      color: CONFIDENCE_COLORS[msg.confidence.level] || "var(--sm-text-secondary)",
                      background: "var(--sm-surface)",
                      border: `1px solid ${CONFIDENCE_COLORS[msg.confidence.level] || "var(--sm-border)"}33`,
                      borderRadius: 8, padding: "4px 10px", width: "fit-content",
                    }}
                  >
                    {getConfidenceIcon(msg.confidence.level)}
                    <span>
                      {msg.confidence.level.toUpperCase()} confidence &mdash;{" "}
                      {Math.round(msg.confidence.score * 100)}%
                    </span>
                    <HelpCircle size={12} title={msg.confidence.explanation} style={{ cursor: "help", opacity: 0.6 }} />
                  </div>
                )}

                {msg.sources && msg.sources.length > 0 && (
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {msg.sources.map((src, si) => (
                      <div
                        key={si}
                        title={src.snippet}
                        className="source-chip"
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          fontSize: 11, color: "var(--sm-text-secondary)",
                          background: "var(--sm-surface)",
                          border: "1px solid var(--sm-border)",
                          borderRadius: 6, padding: "3px 8px",
                          cursor: "default", maxWidth: 220,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                      >
                        <FileText size={10} />
                        {src.source}
                        <span style={{ opacity: 0.5 }}>· {Math.round(src.similarity * 100)}%</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Feedback */}
                {!msg.feedbackSubmitted && feedbackOpen !== idx && (
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--sm-text-tertiary)" }}>Was this helpful?</span>
                    <button onClick={() => { setFeedbackOpen(idx); setFeedbackRating(5); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: CONFIDENCE_COLORS.high, padding: 4 }}
                      title="Yes, helpful">
                      <ThumbsUp size={14} />
                    </button>
                    <button onClick={() => { setFeedbackOpen(idx); setFeedbackRating(2); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: CONFIDENCE_COLORS.low, padding: 4 }}
                      title="Not helpful">
                      <ThumbsDown size={14} />
                    </button>
                  </div>
                )}

                {msg.feedbackSubmitted && (
                  <div style={{ fontSize: 11, color: CONFIDENCE_COLORS.high }}>
                    <CheckCircle size={11} style={{ marginRight: 4, display: "inline" }} />
                    Feedback recorded
                  </div>
                )}

                {feedbackOpen === idx && (
                  <div style={{
                    background: "var(--sm-surface)", border: "1px solid var(--sm-border)",
                    borderRadius: 14, padding: "14px 16px",
                    display: "flex", flexDirection: "column", gap: 10, maxWidth: 380,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--sm-text-secondary)" }}>Rate this answer</span>
                      <button onClick={() => { setFeedbackOpen(null); setFeedbackRating(0); setFeedbackComment(""); }}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sm-text-tertiary)" }}>
                        <X size={14} />
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[1, 2, 3, 4, 5].map((r) => (
                        <button key={r} onClick={() => setFeedbackRating(r)} style={{
                          width: 32, height: 32, borderRadius: 8,
                          border: `1px solid ${feedbackRating >= r ? "var(--sm-accent-3)" : "var(--sm-border)"}`,
                          background: feedbackRating >= r ? "rgba(0,212,255,0.1)" : "transparent",
                          color: feedbackRating >= r ? "var(--sm-accent-3)" : "var(--sm-text-tertiary)",
                          cursor: "pointer", fontSize: 13, fontWeight: 700,
                        }}>{r}</button>
                      ))}
                    </div>
                    <textarea rows={2} value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="Optional comment..."
                      style={{
                        background: "var(--sm-input-bg)", border: "1px solid var(--sm-input-border)",
                        borderRadius: 8, color: "var(--sm-text-primary)",
                        fontSize: 12, padding: "8px 10px", resize: "none", outline: "none",
                      }}
                    />
                    <button onClick={() => handleFeedbackSubmit(idx)}
                      disabled={feedbackRating === 0 || feedbackSubmitting}
                      style={{
                        background: "linear-gradient(135deg, var(--sm-accent-1), var(--sm-accent-2))",
                        border: "none", borderRadius: 8, color: "#fff",
                        fontSize: 12, fontWeight: 600, padding: "8px 0",
                        cursor: feedbackRating === 0 ? "not-allowed" : "pointer",
                        opacity: feedbackRating === 0 ? 0.5 : 1,
                      }}>
                      {feedbackSubmitting ? "Submitting..." : "Submit feedback"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Clarification prompt */}
        {clarification && (
          <div style={{
            background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.2)",
            borderRadius: 16, padding: "18px 20px",
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--sm-accent-3)", marginBottom: 10 }}>
              StudyMate needs clarification
            </div>
            <div style={{ color: "var(--sm-text-primary)", fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
              {clarification.question}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {clarification.options.map((opt, i) => (
                <button key={i} onClick={() => handleClarification(opt)} disabled={loading} style={{
                  padding: "10px 14px",
                  background: selectedClarification === opt ? "rgba(0,212,255,0.12)" : "var(--sm-surface)",
                  border: "1px solid rgba(0,212,255,0.25)", borderRadius: 10,
                  color: "var(--sm-text-primary)", cursor: loading ? "not-allowed" : "pointer",
                  textAlign: "left", fontSize: 13, transition: "background 0.2s",
                }}>{opt}</button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--sm-text-secondary)", fontSize: 13 }}>
            <Loader2 size={14} className="animate-spin" />
            Thinking...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        marginTop: 16, display: "flex", flexDirection: "column", gap: 10,
        borderTop: "1px solid var(--sm-border-subtle)", paddingTop: 16,
      }}>
        {error && (
          <div style={{
            color: "#E05555", background: "rgba(224,85,85,0.08)",
            border: "1px solid rgba(224,85,85,0.18)",
            borderRadius: 10, padding: "10px 14px", fontSize: 13,
          }}>
            {error}
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <textarea
            rows={2}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Ask about your notes, deadlines, or course content… (Enter to send)"
            style={{
              flex: 1,
              background: "var(--sm-input-bg)", border: "1px solid var(--sm-input-border)",
              borderRadius: 14, padding: "12px 16px",
              color: "var(--sm-text-primary)", fontSize: 14,
              outline: "none", resize: "none",
              fontFamily: "Space Grotesk, sans-serif",
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !query.trim()}
            style={{
              width: 48, height: 48, alignSelf: "flex-end",
              borderRadius: 14, border: "none",
              background: loading || !query.trim()
                ? "var(--sm-surface)"
                : "linear-gradient(135deg, var(--sm-accent-1), var(--sm-accent-2))",
              color: loading || !query.trim() ? "var(--sm-text-tertiary)" : "#fff",
              cursor: loading || !query.trim() ? "not-allowed" : "pointer",
              display: "grid", placeItems: "center",
              flexShrink: 0, transition: "background 0.2s",
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
