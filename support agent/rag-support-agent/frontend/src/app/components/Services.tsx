import { motion } from "motion/react";
import { useInView } from "motion/react";
import { useRef } from "react";
import {
  Brain,
  Code2,
  Layers,
  Sparkles,
  Shield,
  BarChart3,
} from "lucide-react";

const services = [
  {
    icon: Brain,
    title: "Smart Summarization",
    description:
      "Upload lecture slides, PDFs, or articles. Get AI-generated summaries with key points, formulas, and important concepts highlighted.",
    color: "#0066FF",
    glow: "rgba(0, 102, 255, 0.25)",
  },
  {
    icon: Code2,
    title: "Assignment Helper",
    description:
      "Get step-by-step solutions to homework problems. AI explains concepts, shows working, and helps you understand the underlying principles.",
    color: "#7B2FBE",
    glow: "rgba(123, 47, 190, 0.25)",
  },
  {
    icon: Layers,
    title: "Exam Preparation",
    description:
      "Generate infinite practice questions, quizzes, and mock exams. Track your progress and identify weak areas needing review.",
    color: "#00D4FF",
    glow: "rgba(0, 212, 255, 0.2)",
  },
  {
    icon: Sparkles,
    title: "PDF Q&A",
    description:
      "Ask questions about your course materials. Our AI retrieves relevant passages and provides context-aware answers instantly.",
    color: "#BE2F7B",
    glow: "rgba(190, 47, 123, 0.25)",
  },
  {
    icon: Shield,
    title: "Concept Explainer",
    description:
      "Struggling with a topic? Ask for analogies, examples, and simplified explanations in your own language.",
    color: "#2FBE7B",
    glow: "rgba(47, 190, 123, 0.2)",
  },
  {
    icon: BarChart3,
    title: "Deadline Tracker",
    description:
      "Stay organized with automated reminders for assignments, exams, and project deadlines. Plan your study schedule effectively.",
    color: "#FF6B35",
    glow: "rgba(255, 107, 53, 0.2)",
  },
];

function ServiceCard({
  service,
  index,
}: {
  service: (typeof services)[0];
  index: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const Icon = service.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{
        y: -8,
        transition: { duration: 0.3 },
      }}
      style={{ position: "relative" }}
    >
      <motion.div
        whileHover={{
          boxShadow: `0 20px 60px ${service.glow}, 0 0 0 1px rgba(255,255,255,0.12)`,
          background: "rgba(255,255,255,0.07)",
        }}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: "36px 32px",
          height: "100%",
          cursor: "default",
          transition: "all 0.3s ease",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top corner accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 80,
            height: 80,
            background: `radial-gradient(circle at top right, ${service.glow}, transparent 70%)`,
          }}
        />

        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: `rgba(${hexToRgb(service.color)}, 0.12)`,
            border: `1px solid rgba(${hexToRgb(service.color)}, 0.25)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 24,
            boxShadow: `0 0 20px rgba(${hexToRgb(service.color)}, 0.15)`,
          }}
        >
          <Icon size={26} color={service.color} />
        </div>

        <h3
          style={{
            fontFamily: "Syne, sans-serif",
            fontSize: 20,
            fontWeight: 700,
            color: "#fff",
            marginBottom: 12,
          }}
        >
          {service.title}
        </h3>

        <p
          style={{
            fontFamily: "Space Grotesk, sans-serif",
            fontSize: 15,
            color: "rgba(160, 180, 230, 0.7)",
            lineHeight: 1.7,
            fontWeight: 400,
          }}
        >
          {service.description}
        </p>

        {/* Bottom line accent */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${service.color}, transparent)`,
            opacity: 0.4,
          }}
        />
      </motion.div>
    </motion.div>
  );
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "255, 255, 255";
}

export function Services() {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true });

  return (
    <section
      id="services"
      style={{
        padding: "120px 24px",
        background: "#03040F",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background accent */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "80vw",
          height: "80vw",
          background:
            "radial-gradient(ellipse, rgba(123, 47, 190, 0.06) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{ textAlign: "center", marginBottom: 72 }}
        >
          <div
            style={{
              display: "inline-block",
              background: "rgba(0, 212, 255, 0.08)",
              border: "1px solid rgba(0, 212, 255, 0.2)",
              borderRadius: 100,
              padding: "5px 16px",
              marginBottom: 20,
            }}
          >
            <span
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: "#00D4FF",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              What We Do
            </span>
          </div>

          <h2
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "clamp(2.2rem, 5vw, 4rem)",
              fontWeight: 800,
              color: "#fff",
              marginBottom: 16,
              lineHeight: 1.1,
            }}
          >
            Features for{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #00D4FF, #7B2FBE)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Every Student
            </span>
          </h2>

          <p
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 17,
              color: "rgba(160, 180, 230, 0.65)",
              maxWidth: 500,
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Powerful AI tools designed to help you learn faster, understand deeper, and succeed in every course.
          </p>
        </motion.div>

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 24,
          }}
        >
          {services.map((service, i) => (
            <ServiceCard key={service.title} service={service} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
