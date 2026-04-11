import { useState, useEffect } from "react";
import { motion } from "motion/react";
import {
  Settings, Cpu, Bell, Palette, Shield, CheckCircle2,
  AlertCircle, ExternalLink, Save,
} from "lucide-react";
import { GlassCard, PageHeader } from "../components/shared/GlassCard";
import { toast } from "sonner";

// ── Persisted preferences (localStorage) ─────────────────────────────────────
const LS_KEY = "studymate_settings";

interface AppSettings {
  ollamaUrl: string;
  model: string;
  enableCaching: boolean;
  enableClarifications: boolean;
  enableInsights: boolean;
  reminderHours: string;
  chatResponseStyle: string;
}

const DEFAULTS: AppSettings = {
  ollamaUrl: "http://localhost:11434/v1",
  model: "llama3",
  enableCaching: true,
  enableClarifications: true,
  enableInsights: true,
  reminderHours: "48,24,2",
  chatResponseStyle: "detailed",
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // ignore parse errors
  }
  return DEFAULTS;
}

function saveSettings(s: AppSettings) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [ollamaStatus, setOllamaStatus] = useState<"idle" | "checking" | "ok" | "error">("idle");
  const [ollamaModel, setOllamaModel] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [systemInfo, setSystemInfo] = useState<{
    version: string;
    ai_model: string;
    ollama_available: boolean;
  } | null>(null);

  // Fetch system info on mount
  useEffect(() => {
    fetch("/")
      .then((r) => r.json())
      .then((data) => {
        setSystemInfo(data);
        if (data.ollama_available) {
          setOllamaStatus("ok");
          setOllamaModel(data.ai_model);
        } else {
          setOllamaStatus("error");
        }
      })
      .catch(() => setOllamaStatus("error"));
  }, []);

  const set = <K extends keyof AppSettings>(key: K, val: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
    setDirty(true);
  };

  const handleSave = () => {
    saveSettings(settings);
    setDirty(false);
    toast.success("Settings saved");
  };

  const checkOllama = async () => {
    setOllamaStatus("checking");
    try {
      const res = await fetch("/");
      const data = await res.json();
      if (data.ollama_available) {
        setOllamaStatus("ok");
        setOllamaModel(data.ai_model);
        toast.success(`Ollama connected — model: ${data.ai_model}`);
      } else {
        setOllamaStatus("error");
        toast.error("Ollama not available — is it running locally?");
      }
    } catch {
      setOllamaStatus("error");
      toast.error("Could not reach backend");
    }
  };

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Configure your AI backend and platform preferences"
        icon={<Settings size={24} color="#7B2FBE" />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* AI Backend */}
        <GlassCard>
          <SectionHeader icon={<Cpu size={16} color="#7B2FBE" />} title="AI Backend (Ollama)" />

          {/* Status badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "6px 12px",
            borderRadius: 10,
            background: ollamaStatus === "ok"
              ? "rgba(0,255,136,0.08)"
              : ollamaStatus === "error"
              ? "rgba(255,108,108,0.08)"
              : "rgba(255,255,255,0.04)",
            border: `1px solid ${ollamaStatus === "ok"
              ? "rgba(0,255,136,0.25)"
              : ollamaStatus === "error"
              ? "rgba(255,108,108,0.25)"
              : "rgba(255,255,255,0.1)"}`,
            marginBottom: 20,
            fontSize: 12,
            fontWeight: 600,
            color: ollamaStatus === "ok" ? "#00FF88" : ollamaStatus === "error" ? "#FF6C6C" : "rgba(160,180,230,0.5)",
          }}>
            {ollamaStatus === "ok" && <CheckCircle2 size={13} />}
            {ollamaStatus === "error" && <AlertCircle size={13} />}
            {ollamaStatus === "checking" && (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}>
                <Cpu size={13} />
              </motion.div>
            )}
            {ollamaStatus === "idle" && <Cpu size={13} />}
            {ollamaStatus === "ok"
              ? `Connected — ${ollamaModel || "unknown model"}`
              : ollamaStatus === "error"
              ? "Ollama not available"
              : ollamaStatus === "checking"
              ? "Checking..."
              : "Not checked yet"}
          </div>

          <SettingRow label="Ollama Base URL" description="Local Ollama server endpoint">
            <input
              value={settings.ollamaUrl}
              onChange={(e) => set("ollamaUrl", e.target.value)}
              style={inputStyle}
            />
          </SettingRow>

          <SettingRow label="Model" description="LLM used for generation and summaries">
            <select
              value={settings.model}
              onChange={(e) => set("model", e.target.value)}
              style={{ ...inputStyle, background: "rgba(14,18,40,0.95)" }}
            >
              <option value="llama3">llama3</option>
              <option value="mistral">mistral</option>
              <option value="phi3">phi3</option>
              <option value="gemma">gemma</option>
              <option value="llama3.1">llama3.1</option>
              <option value="llama3.2">llama3.2</option>
            </select>
          </SettingRow>

          <SettingRow label="Chat Response Style" description="How the AI structures its answers">
            <select
              value={settings.chatResponseStyle}
              onChange={(e) => set("chatResponseStyle", e.target.value)}
              style={{ ...inputStyle, background: "rgba(14,18,40,0.95)" }}
            >
              <option value="detailed">Detailed — thorough explanations</option>
              <option value="concise">Concise — short and direct</option>
              <option value="bullet">Bullet points — structured lists</option>
            </select>
          </SettingRow>

          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
            <button
              onClick={checkOllama}
              disabled={ollamaStatus === "checking"}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 18px",
                background: ollamaStatus === "ok" ? "rgba(0,255,136,0.08)" : "rgba(123,47,190,0.12)",
                border: `1px solid ${ollamaStatus === "ok" ? "rgba(0,255,136,0.25)" : "rgba(123,47,190,0.3)"}`,
                borderRadius: 12, cursor: ollamaStatus === "checking" ? "not-allowed" : "pointer",
                color: ollamaStatus === "ok" ? "#00FF88" : "#7B2FBE",
                fontSize: 13, fontWeight: 600, fontFamily: "Space Grotesk, sans-serif",
                transition: "all 0.2s",
              }}
            >
              {ollamaStatus === "ok" ? <CheckCircle2 size={14} /> : <Cpu size={14} />}
              {ollamaStatus === "checking" ? "Checking..." : ollamaStatus === "ok" ? "Re-check" : "Test Connection"}
            </button>
          </div>

          <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(123,47,190,0.06)", border: "1px solid rgba(123,47,190,0.12)", borderRadius: 12 }}>
            <div style={{ fontSize: 12, color: "rgba(160,180,230,0.5)", lineHeight: 1.7 }}>
              Pull a model:{" "}
              <code style={{ color: "#7B2FBE", background: "rgba(123,47,190,0.15)", padding: "1px 6px", borderRadius: 4 }}>
                ollama pull llama3
              </code>
              <br />
              Start Ollama:{" "}
              <code style={{ color: "#7B2FBE", background: "rgba(123,47,190,0.15)", padding: "1px 6px", borderRadius: 4 }}>
                ollama serve
              </code>
            </div>
          </div>
        </GlassCard>

        {/* Notifications */}
        <GlassCard>
          <SectionHeader icon={<Bell size={16} color="#FFD700" />} title="Notifications" />

          <SettingRow label="Deadline Reminder Hours" description="Comma-separated hours before deadline (e.g. 48,24,2)">
            <input
              value={settings.reminderHours}
              onChange={(e) => set("reminderHours", e.target.value)}
              placeholder="48,24,2"
              style={inputStyle}
            />
          </SettingRow>

          <ToggleRow
            label="Smart Clarifications"
            description="AI asks clarifying questions for ambiguous queries"
            value={settings.enableClarifications}
            onChange={(v) => set("enableClarifications", v)}
          />

          <ToggleRow
            label="AI Insights Engine"
            description="Automatic weak subject detection and risk alerts"
            value={settings.enableInsights}
            onChange={(v) => set("enableInsights", v)}
          />

          <div style={{
            marginTop: 16, padding: "12px 14px",
            background: "rgba(255,215,0,0.04)",
            border: "1px solid rgba(255,215,0,0.1)",
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 12, color: "rgba(160,180,230,0.4)", lineHeight: 1.6 }}>
              Fine-grained notification timing can be configured in the{" "}
              <a
                href="/notifications"
                style={{ color: "#FFD700", textDecoration: "none", fontWeight: 600 }}
              >
                Notifications page
              </a>
              {" "}→ Preferences.
            </div>
          </div>
        </GlassCard>

        {/* Performance */}
        <GlassCard>
          <SectionHeader icon={<Palette size={16} color="#00D4FF" />} title="Performance" />

          <ToggleRow
            label="Response Caching"
            description="Cache RAG responses in Redis for faster repeat queries"
            value={settings.enableCaching}
            onChange={(v) => set("enableCaching", v)}
          />

          <div style={{
            marginTop: 16, padding: "12px 14px",
            background: "rgba(0,212,255,0.04)",
            border: "1px solid rgba(0,212,255,0.1)",
            borderRadius: 12,
            fontSize: 12,
            color: "rgba(160,180,230,0.4)",
            lineHeight: 1.6,
          }}>
            Settings are stored locally in your browser and applied on next session start.
            Backend configuration (cache TTL, chunk size, etc.) requires updating{" "}
            <code style={{ color: "#00D4FF", background: "rgba(0,212,255,0.1)", padding: "1px 5px", borderRadius: 4 }}>.env</code>.
          </div>

          <div style={{ marginTop: 20 }}>
            <button
              onClick={handleSave}
              disabled={!dirty}
              style={{
                width: "100%", padding: "13px",
                background: dirty
                  ? "linear-gradient(135deg, #0066FF, #7B2FBE)"
                  : "rgba(255,255,255,0.05)",
                border: dirty ? "none" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 14, color: dirty ? "#fff" : "rgba(160,180,230,0.4)",
                fontFamily: "Space Grotesk, sans-serif", fontSize: 14, fontWeight: 700,
                cursor: dirty ? "pointer" : "not-allowed",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <Save size={16} />
              {dirty ? "Save Settings" : "No unsaved changes"}
            </button>
          </div>
        </GlassCard>

        {/* About */}
        <GlassCard>
          <SectionHeader icon={<Shield size={16} color="#00FF88" />} title="About StudyMate" />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <InfoRow label="Version" value={systemInfo?.version ?? "3.0.0"} />
            <InfoRow label="AI Backend" value={systemInfo?.ai_model ? `Ollama / ${systemInfo.ai_model}` : "Ollama (local)"} />
            <InfoRow label="Embeddings" value="all-MiniLM-L6-v2 (384-dim)" />
            <InfoRow label="Vector Store" value="pgvector / PostgreSQL" />
            <InfoRow label="Cache" value="Redis" />
            <InfoRow label="Framework" value="FastAPI + React 18" />
            <InfoRow
              label="AI Status"
              value={ollamaStatus === "ok" ? "Online" : ollamaStatus === "error" ? "Offline" : "Unknown"}
              valueColor={ollamaStatus === "ok" ? "#00FF88" : ollamaStatus === "error" ? "#FF6C6C" : "rgba(160,180,230,0.5)"}
            />
          </div>

          <div style={{ marginTop: 20, padding: "14px", background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.1)", borderRadius: 12 }}>
            <div style={{ color: "#00FF88", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
              100% Local — No API Keys
            </div>
            <div style={{ color: "rgba(160,180,230,0.5)", fontSize: 12, lineHeight: 1.7 }}>
              All AI inference runs via Ollama on your machine.
              Your study data never leaves your device.
            </div>
          </div>

          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              marginTop: 14, color: "#0066FF", fontSize: 13, fontWeight: 600,
              textDecoration: "none",
            }}
          >
            <ExternalLink size={13} /> API Documentation
          </a>
        </GlassCard>

      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
      {icon}
      <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 16, fontWeight: 700, color: "#fff", margin: 0 }}>
        {title}
      </h3>
    </div>
  );
}

function SettingRow({ label, description, children }: { label: string; description: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ marginBottom: 6 }}>
        <div style={{ color: "#e8f0ff", fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div style={{ color: "rgba(160,180,230,0.4)", fontSize: 12, marginTop: 2 }}>{description}</div>
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)",
    }}>
      <div>
        <div style={{ color: "#e8f0ff", fontSize: 14, fontWeight: 600 }}>{label}</div>
        <div style={{ color: "rgba(160,180,230,0.4)", fontSize: 12, marginTop: 2 }}>{description}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
          background: value ? "#0066FF" : "rgba(255,255,255,0.1)",
          position: "relative", flexShrink: 0, transition: "background 0.2s",
        }}
      >
        <motion.div
          animate={{ x: value ? 22 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3 }}
        />
      </button>
    </div>
  );
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "rgba(160,180,230,0.5)" }}>{label}</span>
      <span style={{ color: valueColor || "#e8f0ff", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 10, color: "#fff",
  fontFamily: "Space Grotesk, sans-serif", fontSize: 13,
  outline: "none", boxSizing: "border-box",
  colorScheme: "dark",
};
