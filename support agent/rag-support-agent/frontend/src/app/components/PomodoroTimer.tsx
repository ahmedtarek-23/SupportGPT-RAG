/**
 * Pomodoro Timer — inline dashboard widget.
 *
 * Modes: Focus (25min) → Short Break (5min) → Long Break (15min)
 * Cycle counter, progress ring, start/pause/reset.
 * Plays a subtle audio cue on session completion.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, RotateCcw, Coffee, Brain, Zap, Link2 } from "lucide-react";
import { api } from "../../services/api";

// ── Types & Constants ────────────────────────────────────────────

type TimerMode = "focus" | "short_break" | "long_break";

const MODES: Record<TimerMode, { label: string; seconds: number; color: string; icon: typeof Brain }> = {
  focus:       { label: "Focus",       seconds: 25 * 60, color: "#0066FF", icon: Brain },
  short_break: { label: "Short Break", seconds:  5 * 60, color: "#00FF88", icon: Coffee },
  long_break:  { label: "Long Break",  seconds: 15 * 60, color: "#7B2FBE", icon: Coffee },
};

// ── Helper ────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // AudioContext not supported
  }
}

// ── Component ─────────────────────────────────────────────────────

interface PomodoroProps {
  /** When set, the timer records actual_start / actual_end on this session */
  sessionId?: string;
  /** Called when a focus session completes (use to refetch sessions) */
  onFocusComplete?: () => void;
}

export function PomodoroTimer({ sessionId, onFocusComplete }: PomodoroProps = {}) {
  const [mode, setMode] = useState<TimerMode>("focus");
  const [remaining, setRemaining] = useState(MODES.focus.seconds);
  const [running, setRunning] = useState(false);
  const [cycles, setCycles] = useState(0);          // completed focus sessions
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<string | null>(null);

  const { seconds: total, color, label, icon: ModeIcon } = MODES[mode];

  // Record actual_start when a focus session begins
  const handleStart = useCallback(() => {
    if (!running && mode === "focus" && sessionId) {
      const now = new Date().toISOString();
      startTimeRef.current = now;
      api.planner.updateSession(sessionId, { status: "active" }).catch(() => {});
    }
    setRunning(true);
  }, [running, mode, sessionId]);

  // Tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            playBeep();
            // Persist actual_end if we have a linked session and just finished focus
            if (mode === "focus" && sessionId) {
              api.planner.updateSession(sessionId, {
                status: "completed",
                notes: `Completed via Pomodoro timer at ${new Date().toLocaleTimeString()}`,
              }).then(() => onFocusComplete?.()).catch(() => {});
            }
            // Auto-advance
            if (mode === "focus") {
              const next = cycles + 1;
              setCycles(next);
              const nextMode: TimerMode = next % 4 === 0 ? "long_break" : "short_break";
              switchMode(nextMode);
            } else {
              switchMode("focus");
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, sessionId]);

  const switchMode = useCallback((m: TimerMode) => {
    setRunning(false);
    setMode(m);
    setRemaining(MODES[m].seconds);
  }, []);

  function reset() {
    setRunning(false);
    setRemaining(total);
  }

  // Progress ring
  const size = 140;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (total - remaining) / total;
  const offset = circumference * (1 - progress);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h3 style={{ fontFamily: "Syne, sans-serif", fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>
          ⏱ Pomodoro Timer
        </h3>
        {sessionId && (
          <div style={{
            display: "flex", alignItems: "center", gap: 5,
            fontSize: 11, color: "#00FF88",
            background: "rgba(0,255,136,0.08)",
            border: "1px solid rgba(0,255,136,0.2)",
            padding: "3px 8px", borderRadius: 6,
          }}>
            <Link2 size={10} /> Session linked
          </div>
        )}
      </div>

      {/* Mode selector */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
        {(Object.keys(MODES) as TimerMode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            style={{
              flex: 1,
              padding: "8px 6px",
              borderRadius: 10,
              border: `1px solid ${m === mode ? MODES[m].color + "44" : "rgba(255,255,255,0.06)"}`,
              background: m === mode ? MODES[m].color + "15" : "transparent",
              color: m === mode ? MODES[m].color : "rgba(160,180,230,0.5)",
              cursor: "pointer",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 11,
              fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            {MODES[m].label}
          </button>
        ))}
      </div>

      {/* Ring + time */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <div style={{ position: "relative", width: size, height: size }}>
          <svg
            width={size}
            height={size}
            style={{ transform: "rotate(-90deg)", position: "absolute", top: 0, left: 0 }}
          >
            {/* Track */}
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.06)"
              strokeWidth={stroke}
            />
            {/* Progress */}
            <motion.circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transition={{ duration: 0.5 }}
              style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}
            />
          </svg>

          {/* Center content */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={remaining}
                initial={{ scale: 0.95, opacity: 0.6 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#fff",
                  letterSpacing: "-0.02em",
                }}
              >
                {formatTime(remaining)}
              </motion.div>
            </AnimatePresence>
            <div style={{ fontSize: 11, color: "rgba(160,180,230,0.5)", fontWeight: 600, marginTop: 2 }}>
              {label}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 16 }}>
        <button
          onClick={reset}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(160,180,230,0.7)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RotateCcw size={16} />
        </button>

        <motion.button
          onClick={() => (running ? setRunning(false) : handleStart())}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: running
              ? "rgba(255,255,255,0.08)"
              : `linear-gradient(135deg, ${color}, ${color}bb)`,
            border: "none",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: running ? "none" : `0 0 20px ${color}44`,
            transition: "box-shadow 0.3s",
          }}
        >
          {running ? <Pause size={20} /> : <Play size={20} fill="#fff" />}
        </motion.button>

        {/* Cycle indicator */}
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(255,215,0,0.06)",
            border: "1px solid rgba(255,215,0,0.15)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
          }}
        >
          <Zap size={13} color="#FFD700" />
          <span style={{ fontSize: 11, color: "#FFD700", fontWeight: 700, lineHeight: 1 }}>{cycles}</span>
        </div>
      </div>

      {/* Cycle dots */}
      <div style={{ display: "flex", justifyContent: "center", gap: 5 }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: cycles % 4 > i ? color : "rgba(255,255,255,0.1)",
              boxShadow: cycles % 4 > i ? `0 0 6px ${color}` : "none",
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>

      {/* Tip */}
      <div style={{ marginTop: 14, padding: "8px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 10, textAlign: "center" }}>
        <p style={{ margin: 0, fontSize: 11, color: "rgba(160,180,230,0.35)", lineHeight: 1.5 }}>
          {mode === "focus"
            ? "Stay focused. No distractions."
            : mode === "short_break"
            ? "Stretch, breathe, hydrate."
            : "Take a real break. You earned it!"}
        </p>
      </div>
    </div>
  );
}
