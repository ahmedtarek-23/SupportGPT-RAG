import { useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "motion/react";
import { Quote, ChevronLeft, ChevronRight, Star } from "lucide-react";

const testimonials = [
  {
    id: 1,
    quote:
      "StudyBot completely changed my approach to learning. I went from struggling in Chemistry to getting an A. The AI explanations are better than my textbook, and I love how it breaks down complex topics.",
    author: "Emma Thompson",
    title: "Engineering Student, MIT",
    rating: 5,
    accent: "#0066FF",
    initials: "ET",
  },
  {
    id: 2,
    quote:
      "I saved so much time on assignments with StudyBot. Instead of hours searching for answers, I get instant help with step-by-step explanations. My GPA improved by 0.7 points this semester!",
    author: "Raj Patel",
    title: "Pre-Med Student, Stanford",
    rating: 5,
    accent: "#7B2FBE",
    initials: "RP",
  },
  {
    id: 3,
    quote:
      "The PDF Q&A feature is a game-changer. I can upload my lecture notes and ask questions instantly. No more re-reading dense textbooks. StudyBot helps me focus on understanding, not memorizing.",
    author: "Sarah Chen",
    title: "Business Major, Harvard",
    rating: 5,
    accent: "#00D4FF",
    initials: "SC",
  },
  {
    id: 4,
    quote:
      "Exam prep was never this easy. The AI generates unlimited practice questions tailored to my weak areas. I felt so confident going into my finals. Definitely recommend StudyBot to every student I know!",
    author: "Marcus Johnson",
    title: "CS Student, Berkeley",
    rating: 5,
    accent: "#BE2F7B",
    initials: "MJ",
  },
];

const clients = [
  "MIT", "STANFORD", "HARVARD", "BERKELEY", "YALE", "CALTECH", "PRINCETON", "DUKE"
];

export function Testimonials() {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true });

  const goTo = (idx: number) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  };

  const prev = () => goTo((current - 1 + testimonials.length) % testimonials.length);
  const next = () => goTo((current + 1) % testimonials.length);

  const t = testimonials[current];

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : "255, 255, 255";
  };

  return (
    <section
      id="testimonials"
      style={{
        padding: "120px 24px",
        background: "linear-gradient(180deg, #06050F 0%, #03040F 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background accents */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "-5%",
          width: "40vw",
          height: "40vw",
          background: "radial-gradient(circle, rgba(123, 47, 190, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          filter: "blur(20px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          right: "-5%",
          width: "35vw",
          height: "35vw",
          background: "radial-gradient(circle, rgba(0, 102, 255, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          filter: "blur(20px)",
        }}
      />

      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
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
              background: "rgba(123, 47, 190, 0.1)",
              border: "1px solid rgba(123, 47, 190, 0.25)",
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
                color: "#A855F7",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              Student Love
            </span>
          </div>

          <h2
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "clamp(2.2rem, 5vw, 4rem)",
              fontWeight: 800,
              color: "#fff",
              lineHeight: 1.1,
            }}
          >
            What Students{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #A855F7, #0066FF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Say
            </span>
          </h2>
        </motion.div>

        {/* Testimonial card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            position: "relative",
            marginBottom: 56,
          }}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={t.id}
              custom={direction}
              initial={{ opacity: 0, x: direction * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 60 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 28,
                padding: "52px 56px",
                backdropFilter: "blur(20px)",
                position: "relative",
                overflow: "hidden",
                boxShadow: `0 0 80px rgba(${hexToRgb(t.accent)}, 0.08)`,
              }}
            >
              {/* Accent corner glow */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 300,
                  height: 300,
                  background: `radial-gradient(circle at top right, rgba(${hexToRgb(t.accent)}, 0.12), transparent 70%)`,
                  pointerEvents: "none",
                }}
              />

              {/* Quote icon */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: `rgba(${hexToRgb(t.accent)}, 0.12)`,
                  border: `1px solid rgba(${hexToRgb(t.accent)}, 0.25)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 32,
                }}
              >
                <Quote size={22} color={t.accent} />
              </div>

              {/* Stars */}
              <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} size={16} fill="#FFB800" color="#FFB800" />
                ))}
              </div>

              {/* Quote */}
              <p
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: "clamp(1rem, 2vw, 1.25rem)",
                  color: "rgba(220, 230, 255, 0.9)",
                  lineHeight: 1.75,
                  fontWeight: 400,
                  marginBottom: 40,
                  maxWidth: 800,
                }}
              >
                "{t.quote}"
              </p>

              {/* Author */}
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${t.accent}, rgba(${hexToRgb(t.accent)}, 0.4))`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "Syne, sans-serif",
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#fff",
                    flexShrink: 0,
                    boxShadow: `0 0 20px rgba(${hexToRgb(t.accent)}, 0.3)`,
                  }}
                >
                  {t.initials}
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontSize: 17,
                      fontWeight: 700,
                      color: "#fff",
                      marginBottom: 2,
                    }}
                  >
                    {t.author}
                  </div>
                  <div
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: 13,
                      color: "rgba(160, 180, 230, 0.6)",
                    }}
                  >
                    {t.title}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Navigation */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <button
            onClick={prev}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(0, 102, 255, 0.2)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(0, 102, 255, 0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            <ChevronLeft size={20} />
          </button>

          <div style={{ display: "flex", gap: 8 }}>
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                style={{
                  height: 8,
                  width: i === current ? 28 : 8,
                  borderRadius: 100,
                  background:
                    i === current
                      ? "linear-gradient(90deg, #0066FF, #7B2FBE)"
                      : "rgba(255,255,255,0.15)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>

          <button
            onClick={next}
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(0, 102, 255, 0.2)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(0, 102, 255, 0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)";
            }}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Client logos marquee */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={headerInView ? { opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.6 }}
          style={{ marginTop: 80 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: "rgba(160, 180, 230, 0.35)",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                marginRight: 8,
              }}
            >
              Trusted by
            </span>
            {clients.map((client, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    fontFamily: "Syne, sans-serif",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "rgba(180, 200, 255, 0.3)",
                    letterSpacing: "0.12em",
                    transition: "color 0.2s",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLElement).style.color = "rgba(180, 200, 255, 0.7)";
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLElement).style.color = "rgba(180, 200, 255, 0.3)";
                  }}
                >
                  {client}
                </span>
                {i < clients.length - 1 && (
                  <span style={{ color: "rgba(255,255,255,0.1)", fontSize: 18 }}>·</span>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
