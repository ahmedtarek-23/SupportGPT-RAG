import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { ArrowUpRight, ExternalLink } from "lucide-react";

const projects = [
  {
    id: 1,
    title: "Acing College Chemistry",
    category: "Student Success",
    tags: ["Organic Chem", "Problem Solving", "Lab Reports"],
    description:
      "Sarah improved from C to A- in Chemistry by using StudyBot to understand complex reaction mechanisms and ace her final exam with our AI-generated practice problems.",
    image: "https://images.unsplash.com/photo-1551135049-8250582164e4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjaGVtaXN0cnklMjBsYWIlMjBzY2llbmNlfGVufDF8fHx8MTc3NTQzNDk4OXww&ixlib=rb-4.1.0&q=80&w=1080",
    accent: "#0066FF",
    size: "large",
  },
  {
    id: 2,
    title: "Mastering Calculus",
    category: "Math Excellence",
    tags: ["Derivatives", "Integration", "Proofs"],
    description:
      "James saved 10+ hours per week by letting StudyBot explain complex calculus proofs and generate unlimited practice problems tailored to his weak areas.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f70d504f0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYXRoJTIwZXF1YXRpb25zJTIwYWJzdHJhY3R8ZW58MXx8fHwxNzc1NDM0OTkxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    accent: "#7B2FBE",
    size: "small",
  },
  {
    id: 3,
    title: "Essay Writing Assistant",
    category: "Writing Excellence",
    tags: ["Literature", "Analysis", "Citations"],
    description:
      "Emma used StudyBot to understand literary concepts and structure better essays, earning A's consistently and saving 5 hours on research per assignment.",
    image: "https://images.unsplash.com/photo-1507842217343-583f20270319?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsaXRlcmF0dXJlJTIwYm9va3N8ZW58MXx8fHwxNzc1NDM0OTkzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    accent: "#00D4FF",
    size: "small",
  },
  {
    id: 4,
    title: "Physics Exam Mastery",
    category: "STEM Excellence",
    tags: ["Mechanics", "Thermodynamics", "Problem Solving"],
    description:
      "Marcus improved his GPA by 0.8 points using StudyBot's AI-powered physics tutoring for complex problem-solving and exam preparation across all physics subjects.",
    image: "https://images.unsplash.com/photo-1619983081563-430f63602796?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwaHlzaWNzJTIwbW90aW9uJTIwZW5lcmd5fGVufDF8fHx8MTc3NTQzNDk4NXww&ixlib=rb-4.1.0&q=80&w=1080",
    accent: "#BE2F7B",
    size: "large",
  },
];

function ProjectCard({
  project,
  index,
}: {
  project: (typeof projects)[0];
  index: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{
        position: "relative",
        borderRadius: 24,
        overflow: "hidden",
        cursor: "pointer",
        gridColumn: project.size === "large" ? "span 2" : "span 1",
        aspectRatio: project.size === "large" ? "16/9" : "4/3",
      }}
      className="max-sm:col-span-1"
    >
      {/* Background image */}
      <motion.img
        src={project.image}
        alt={project.title}
        animate={{ scale: hovered ? 1.08 : 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Gradient overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to top, rgba(3, 4, 15, 0.95) 0%, rgba(3, 4, 15, 0.5) 50%, rgba(3, 4, 15, 0.1) 100%)`,
          transition: "opacity 0.3s",
        }}
      />

      {/* Accent overlay on hover */}
      <motion.div
        animate={{ opacity: hovered ? 0.15 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at bottom left, ${project.accent}, transparent 70%)`,
        }}
      />

      {/* Border glow */}
      <motion.div
        animate={{
          boxShadow: hovered
            ? `inset 0 0 0 1px ${project.accent}40, 0 0 40px ${project.accent}30`
            : "inset 0 0 0 1px rgba(255,255,255,0.08)",
        }}
        transition={{ duration: 0.3 }}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 24,
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "28px 32px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div
            style={{
              background: `rgba(${hexToRgb(project.accent)}, 0.15)`,
              border: `1px solid rgba(${hexToRgb(project.accent)}, 0.3)`,
              borderRadius: 100,
              padding: "4px 12px",
            }}
          >
            <span
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: project.accent,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {project.category}
            </span>
          </div>

          <motion.div
            animate={{
              opacity: hovered ? 1 : 0,
              x: hovered ? 0 : 10,
              y: hovered ? 0 : -10,
            }}
            transition={{ duration: 0.25 }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ExternalLink size={18} color="#fff" />
          </motion.div>
        </div>

        {/* Bottom content */}
        <div>
          {/* Tags */}
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            {project.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(200, 215, 255, 0.6)",
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 6,
                  padding: "3px 10px",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <h3
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: "clamp(1.3rem, 2.5vw, 1.8rem)",
              fontWeight: 700,
              color: "#fff",
              marginBottom: 10,
            }}
          >
            {project.title}
          </h3>

          <motion.p
            animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : 8 }}
            transition={{ duration: 0.3 }}
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 14,
              color: "rgba(180, 200, 240, 0.75)",
              lineHeight: 1.6,
              maxWidth: 500,
            }}
          >
            {project.description}
          </motion.p>

          <motion.div
            animate={{ opacity: hovered ? 1 : 0, x: hovered ? 0 : -8 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 16,
              color: project.accent,
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            View Case Study
            <ArrowUpRight size={16} />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "255, 255, 255";
}

export function Projects() {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true });

  return (
    <section
      id="projects"
      style={{
        padding: "120px 24px",
        background: "linear-gradient(180deg, #03040F 0%, #06050F 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: "0%",
          right: "-10%",
          width: "50vw",
          height: "50vw",
          background: "radial-gradient(circle, rgba(0, 102, 255, 0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <motion.div
          ref={headerRef}
          initial={{ opacity: 0, y: 30 }}
          animate={headerInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 60,
            flexWrap: "wrap",
            gap: 24,
          }}
        >
          <div>
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
                Success Stories
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
              Student{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #7B2FBE, #0066FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Wins
              </span>
            </h2>
          </div>

          <motion.button
            whileHover={{ scale: 1.04, background: "rgba(255,255,255,0.1)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 12,
              padding: "12px 24px",
              color: "#fff",
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            View All Work
            <ArrowUpRight size={16} />
          </motion.button>
        </motion.div>

        {/* Projects grid */}
        <div
          className="projects-grid"
          style={{
            display: "grid",
            gap: 20,
          }}
        >
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}