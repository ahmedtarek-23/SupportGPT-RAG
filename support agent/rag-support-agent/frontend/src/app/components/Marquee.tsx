import { motion } from "motion/react";

const items = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "History",
  "Literature",
  "Computer Science",
  "Economics",
  "Psychology",
  "Engineering",
];

const MarqueeRow = ({ reverse = false }: { reverse?: boolean }) => {
  const duplicated = [...items, ...items, ...items];
  return (
    <div style={{ overflow: "hidden", position: "relative" }}>
      <motion.div
        animate={{ x: reverse ? ["0%", "33.33%"] : ["0%", "-33.33%"] }}
        transition={{
          duration: 24,
          ease: "linear",
          repeat: Infinity,
        }}
        style={{
          display: "flex",
          gap: 12,
          width: "max-content",
        }}
      >
        {duplicated.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: "rgba(180, 200, 255, 0.45)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                padding: "8px 20px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 100,
                transition: "color 0.2s",
              }}
            >
              {item}
            </span>
            <span style={{ color: "rgba(0, 212, 255, 0.3)", fontSize: 8 }}>◆</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
};

export function Marquee() {
  return (
    <div
      style={{
        padding: "60px 0",
        background: "linear-gradient(180deg, #03040F 0%, #05040F 100%)",
        borderTop: "1px solid rgba(255,255,255,0.04)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Fade edges */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 120,
          background: "linear-gradient(to right, #03040F, transparent)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 120,
          background: "linear-gradient(to left, #03040F, transparent)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />

      <MarqueeRow />
      <MarqueeRow reverse />
    </div>
  );
}
