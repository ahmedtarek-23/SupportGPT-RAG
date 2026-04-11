import { motion } from "motion/react";
import { ReactNode, CSSProperties } from "react";

interface GlassCardProps {
  children: ReactNode;
  style?: CSSProperties;
  hover?: boolean;
  glow?: string;
  onClick?: () => void;
  className?: string;
}

export function GlassCard({ children, style, hover = true, glow, onClick, className }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hover ? { y: -2, transition: { duration: 0.2 } } : undefined}
      onClick={onClick}
      className={className}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 24,
        padding: 24,
        boxShadow: glow
          ? `0 20px 80px rgba(0,0,0,0.2), 0 0 30px ${glow}`
          : "0 20px 80px rgba(0,0,0,0.2)",
        backdropFilter: "blur(24px)",
        cursor: onClick ? "pointer" : "default",
        transition: "border-color 0.3s ease, box-shadow 0.3s ease",
        ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

export function PageHeader({ title, subtitle, icon }: { title: string; subtitle?: string; icon?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginBottom: 32, display: "flex", alignItems: "center", gap: 16 }}
    >
      {icon && (
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            background: "linear-gradient(135deg, rgba(0,102,255,0.15), rgba(123,47,190,0.1))",
            display: "grid",
            placeItems: "center",
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <h1
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 800,
            color: "#fff",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        {subtitle && (
          <p style={{ color: "rgba(160, 180, 230, 0.6)", fontSize: 14, margin: "4px 0 0" }}>
            {subtitle}
          </p>
        )}
      </div>
    </motion.div>
  );
}
