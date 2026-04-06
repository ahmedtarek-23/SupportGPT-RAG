import { useState } from "react";
import { Loader2, Send, MessageSquare, CheckCircle, AlertCircle, HelpCircle, FileText } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  text: string;
  confidence?: { level: string; score: number; explanation: string };
  sources?: Array<{ source: string; snippet: string; similarity: number }>;
}

interface ClarificationQuestion {
  question: string;
  options: string[];
}

export function SupportChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clarification, setClarification] = useState<ClarificationQuestion | null>(null);
  const [selectedClarification, setSelectedClarification] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setError(null);
    const newMessages: Message[] = [...messages, { role: "user" as const, text: trimmed }];
    setMessages(newMessages);
    setQuery("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: trimmed, top_k: 3, session_id: sessionId }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(body || "Server error");
      }

      const data = await response.json();
      
      // Store session ID
      if (data.session_id && !sessionId) {
        setSessionId(data.session_id);
      }

      // Check if clarification needed
      if (data.clarifications) {
        setClarification({
          question: data.clarifications.question,
          options: data.clarifications.options,
        });
      } else {
        // Add assistant response with confidence and sources
        setMessages((current) => [...current, { 
          role: "assistant", 
          text: data.answer || "No response.",
          confidence: data.confidence,
          sources: data.sources?.map((s: any) => ({
            source: s.source,
            snippet: s.text?.substring(0, 100) + "...",
            similarity: s.similarity_score,
          })) || [],
        }]);
        setClarification(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to reach the API.");
    } finally {
      setLoading(false);
    }
  };

  const handleClarification = async (option: string) => {
    setSelectedClarification(option);
    setError(null);
    setClarification(null);
    setLoading(true);

    try {
      const lastUserMessage = messages.filter((m) => m.role === "user").pop()?.text || "";
      
      const response = await fetch("/api/chat/clarify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: sessionId,
          original_query: lastUserMessage,
          clarification_response: option,
        }),
      });

      if (!response.ok) throw new Error("Clarification failed");

      const data = await response.json();

      setMessages((current) => [...current, {
        role: "assistant",
        text: data.answer || "No response.",
        confidence: data.confidence,
        sources: data.sources?.map((s: any) => ({
          source: s.source,
          snippet: s.text?.substring(0, 100) + "...",
          similarity: s.similarity_score,
        })) || [],
      }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Clarification error");
    } finally {
      setLoading(false);
      setSelectedClarification(null);
    }
  };

  const getConfidenceIcon = (level: string) => {
    switch(level) {
      case "high":
        return <CheckCircle color="#00FF88" size={16} />;
      case "medium":
        return <AlertCircle color="#FFD700" size={16} />;
      case "low":
        return <AlertCircle color="#FF6C6C" size={16} />;
      default:
        return <HelpCircle color="#888" size={16} />;
    }
  };

  return (
    <section
      id="support"
      style={{
        padding: "120px 24px",
        background: "#050611",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              background: "rgba(0, 212, 255, 0.12)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <MessageSquare color="#00D4FF" size={24} />
          </div>
          <div>
            <div
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                fontSize: 11,
                fontWeight: 700,
                color: "#00D4FF",
                marginBottom: 8,
              }}
            >
              Live Support (Phase 6)
            </div>
            <h2
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: "clamp(2rem, 4vw, 3rem)",
                fontWeight: 800,
                color: "#fff",
                margin: 0,
              }}
            >
              Chat with SupportGPT
            </h2>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "1fr",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 28,
              padding: 24,
              boxShadow: "0 40px 120px rgba(0,0,0,0.16)",
              minHeight: 400,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Clarification Dialog */}
            {clarification && (
              <div
                style={{
                  background: "rgba(0, 212, 255, 0.08)",
                  border: "1px solid rgba(0, 212, 255, 0.2)",
                  borderRadius: 20,
                  padding: "20px 24px",
                  marginBottom: 16,
                }}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: "#00D4FF", fontWeight: 700, marginBottom: 8 }}>SupportGPT</div>
                  <div style={{ color: "#e8f0ff", fontSize: 15, lineHeight: 1.6 }}>{clarification.question}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                  {clarification.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleClarification(option)}
                      disabled={loading}
                      style={{
                        padding: "12px 16px",
                        background: selectedClarification === option ? "rgba(0, 212, 255, 0.2)" : "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(0, 212, 255, 0.3)",
                        borderRadius: 12,
                        color: "#e8f0ff",
                        cursor: loading ? "not-allowed" : "pointer",
                        textAlign: "left",
                        transition: "all 0.2s",
                        fontSize: 14,
                      }}
                    >
                      {selectedClarification === option && <Loader2 size={14} className="animate-spin" style={{ marginRight: 8 }} />}
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            <div style={{ display: "flex", gap: 12, flexDirection: "column", flex: 1, overflowY: "auto" }}>
              {messages.length === 0 ? (
                <div style={{ color: "rgba(160, 180, 230, 0.85)", fontSize: 15 }}>
                  Ask any question about your product, policies, or support data. I'll provide answers with confidence scores and source attribution.
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={`${message.role}-${index}`}>
                    {/* Message Bubble */}
                    <div
                      style={{
                        alignSelf: message.role === "assistant" ? "flex-start" : "flex-end",
                        background: message.role === "assistant" ? "rgba(13, 18, 36, 0.95)" : "rgba(0, 212, 255, 0.08)",
                        border: message.role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0, 212, 255, 0.18)",
                        borderRadius: 20,
                        padding: "16px 18px",
                        maxWidth: "100%",
                        minWidth: 200,
                        color: "#e8f0ff",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: "rgba(160, 180, 230, 0.84)" }}>
                        {message.role === "assistant" ? "SupportGPT" : "You"}
                      </div>
                      <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{message.text}</div>
                    </div>

                    {/* Confidence Badge */}
                    {message.confidence && message.role === "assistant" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: 12,
                          marginLeft: 0,
                          padding: "10px 14px",
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 12,
                          fontSize: 12,
                          color: "rgba(160, 180, 230, 0.8)",
                        }}
                      >
                        {getConfidenceIcon(message.confidence.level)}
                        <span><strong>Confidence:</strong> {message.confidence.level.toUpperCase()} ({Math.round(message.confidence.score * 100)}%)</span>
                      </div>
                    )}

                    {/* Source Attribution */}
                    {message.sources && message.sources.length > 0 && (
                      <div style={{ marginTop: 12, display: "flex", gap: 8, flexDirection: "column" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(160, 180, 230, 0.6)" }}>Sources:</div>
                        {message.sources.map((source, sidx) => (
                          <div
                            key={sidx}
                            style={{
                              padding: "10px 12px",
                              background: "rgba(255,255,255,0.02)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              borderRadius: 10,
                              fontSize: 11,
                              color: "rgba(160, 180, 230, 0.7)",
                              display: "flex",
                              gap: 8,
                              alignItems: "flex-start",
                            }}
                          >
                            <FileText size={12} style={{ marginTop: 2, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontWeight: 600 }}>{source.source}</div>
                              <div style={{ marginTop: 4, opacity: 0.8 }}>{source.snippet}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Input Area */}
          <div
            style={{
              display: "grid",
              gap: 16,
              padding: 24,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 28,
              boxShadow: "0 40px 120px rgba(0,0,0,0.16)",
            }}
          >
            <textarea
              rows={4}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ask about password reset, billing, return policy, or your product docs..."
              style={{
                width: "100%",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 18,
                padding: "16px 18px",
                color: "#fff",
                fontSize: 15,
                outline: "none",
                resize: "vertical",
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                width: "100%",
                padding: "16px 22px",
                borderRadius: 18,
                border: "none",
                background: "linear-gradient(135deg, #00D4FF, #7B2FBE)",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
                transition: "transform 0.2s ease",
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Processing...
                </>
              ) : (
                <>
                  Send question <Send size={18} />
                </>
              )}
            </button>
            {error && (
              <div
                style={{
                  color: "#FF6C6C",
                  background: "rgba(255,108,108,0.08)",
                  border: "1px solid rgba(255,108,108,0.18)",
                  borderRadius: 16,
                  padding: "14px 18px",
                  fontSize: 14,
                }}
              >
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
