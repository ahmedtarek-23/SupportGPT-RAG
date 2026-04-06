import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ArrowRight, Play, TrendingUp, Users, Award, Cpu } from "lucide-react";

const FloatingShape = ({
  size,
  color,
  style,
  delay = 0,
  duration = 6,
}: {
  size: number;
  color: string;
  style?: React.CSSProperties;
  delay?: number;
  duration?: number;
}) => (
  <motion.div
    style={{
      position: "absolute",
      width: size,
      height: size,
      borderRadius: size * 0.3,
      background: color,
      ...style,
    }}
    animate={{
      y: [-20, 20, -20],
      rotate: [0, 180, 360],
      scale: [1, 1.1, 1],
    }}
    transition={{
      duration,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

const FloatingRing = ({
  size,
  color,
  style,
  delay = 0,
}: {
  size: number;
  color: string;
  style?: React.CSSProperties;
  delay?: number;
}) => (
  <motion.div
    style={{
      position: "absolute",
      width: size,
      height: size,
      borderRadius: "50%",
      border: `1.5px solid ${color}`,
      ...style,
    }}
    animate={{
      y: [-15, 15, -15],
      rotate: [0, 360],
      scale: [1, 1.05, 1],
    }}
    transition={{
      duration: 8,
      delay,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

const stats = [
  { icon: TrendingUp, value: "50+", label: "Subjects Covered" },
  { icon: Users, value: "10K+", label: "Active Students" },
  { icon: Award, value: "3.5+", label: "Avg GPA Boost" },
  { icon: Cpu, value: "24/7", label: "AI Support" },
];

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  return (
    <div
      ref={ref}
      id="hero"
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#03040F",
      }}
    >
      {/* Ambient gradient orbs */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-20%",
            left: "-10%",
            width: "60vw",
            height: "60vw",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0, 102, 255, 0.15) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: "10%",
            right: "-15%",
            width: "50vw",
            height: "50vw",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(123, 47, 190, 0.2) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "5%",
            left: "30%",
            width: "40vw",
            height: "40vw",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0, 212, 255, 0.1) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      {/* Grid pattern overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      {/* Floating shapes */}
      <FloatingShape
        size={60}
        color="rgba(0, 102, 255, 0.15)"
        style={{ top: "15%", left: "8%", borderRadius: "30%" }}
        delay={0}
        duration={7}
      />
      <FloatingShape
        size={40}
        color="rgba(123, 47, 190, 0.2)"
        style={{ top: "25%", right: "12%", borderRadius: "50%" }}
        delay={1}
        duration={5}
      />
      <FloatingShape
        size={80}
        color="rgba(0, 212, 255, 0.08)"
        style={{ bottom: "20%", left: "15%", borderRadius: "40%" }}
        delay={2}
        duration={8}
      />
      <FloatingShape
        size={30}
        color="rgba(0, 102, 255, 0.2)"
        style={{ top: "60%", right: "8%", borderRadius: "50%" }}
        delay={0.5}
        duration={6}
      />

      <FloatingRing
        size={120}
        color="rgba(0, 212, 255, 0.12)"
        style={{ top: "10%", right: "20%" }}
        delay={1.5}
      />
      <FloatingRing
        size={80}
        color="rgba(123, 47, 190, 0.2)"
        style={{ bottom: "25%", left: "5%" }}
        delay={0.8}
      />
      <FloatingRing
        size={200}
        color="rgba(0, 102, 255, 0.06)"
        style={{ top: "30%", left: "25%" }}
        delay={2}
      />

      {/* Glowing orb center */}
      <motion.div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0, 102, 255, 0.08) 0%, rgba(123, 47, 190, 0.05) 40%, transparent 70%)",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          filter: "blur(20px)",
        }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Main content */}
      <motion.div
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          maxWidth: 900,
          padding: "0 24px",
          y,
          opacity,
        }}
      >
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(0, 102, 255, 0.1)",
            border: "1px solid rgba(0, 102, 255, 0.3)",
            borderRadius: 100,
            padding: "6px 16px",
            marginBottom: 32,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#00D4FF",
              boxShadow: "0 0 8px #00D4FF",
            }}
          />
          <span
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: "#00D4FF",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            AI Study Assistant
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: "clamp(3rem, 7vw, 6rem)",
            fontWeight: 800,
            lineHeight: 1.05,
            marginBottom: 24,
            color: "#fff",
          }}
        >
          Study{" "}
          <span
            style={{
              background: "linear-gradient(135deg, #00D4FF 0%, #7B2FBE 50%, #0066FF 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Smarter
          </span>
          <br />
          with AI
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: "clamp(1rem, 2vw, 1.2rem)",
            color: "rgba(180, 190, 230, 0.8)",
            maxWidth: 620,
            margin: "0 auto 48px",
            lineHeight: 1.7,
            fontWeight: 400,
          }}
        >
          Your personal AI tutor for lecture notes, assignments, PDFs, deadlines, and exam preparation. Learn faster, retain better, and ace your courses.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}
        >
          <motion.button
            whileHover={{ scale: 1.04, boxShadow: "0 0 40px rgba(0, 102, 255, 0.7), 0 0 80px rgba(123, 47, 190, 0.4)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
              border: "none",
              cursor: "pointer",
              color: "#fff",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 16,
              fontWeight: 600,
              padding: "16px 36px",
              borderRadius: 14,
              boxShadow: "0 0 30px rgba(0, 102, 255, 0.4)",
              letterSpacing: "0.02em",
            }}
          >
            Get Started Free
            <ArrowRight size={18} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.04, background: "rgba(255,255,255,0.1)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => document.querySelector("#projects")?.scrollIntoView({ behavior: "smooth" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              cursor: "pointer",
              color: "#fff",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 16,
              fontWeight: 600,
              padding: "16px 36px",
              borderRadius: 14,
              backdropFilter: "blur(10px)",
              letterSpacing: "0.02em",
            }}
          >
            <Play size={16} fill="currentColor" />
            See How It Works
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.1 }}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          padding: "0 24px 48px",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          className="stats-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            overflow: "hidden",
            backdropFilter: "blur(20px)",
            maxWidth: 800,
            width: "100%",
          }}
        >
          {stats.map(({ icon: Icon, value, label }, i) => (
            <motion.div
              key={label}
              whileHover={{ background: "rgba(255,255,255,0.06)" }}
              style={{
                padding: "20px 24px",
                textAlign: "center",
                borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                transition: "background 0.3s",
              }}
            >
              <Icon size={18} color="#00D4FF" style={{ margin: "0 auto 6px" }} />
              <div
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: "clamp(1.2rem, 2.5vw, 1.8rem)",
                  fontWeight: 800,
                  background: "linear-gradient(135deg, #fff, #a0b4ff)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  lineHeight: 1.2,
                }}
              >
                {value}
              </div>
              <div
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: "clamp(10px, 1.2vw, 12px)",
                  color: "rgba(160, 180, 255, 0.6)",
                  fontWeight: 500,
                  marginTop: 2,
                  letterSpacing: "0.03em",
                }}
              >
                {label}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}