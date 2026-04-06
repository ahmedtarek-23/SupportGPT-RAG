import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { Twitter, Linkedin, Github, ArrowUpRight } from "lucide-react";

const teamMembers = [
  {
    id: 1,
    name: "Dr. James Wilson",
    role: "Physics Professor",
    bio: "Cambridge PhD in Theoretical Physics. Published 50+ papers on quantum mechanics and relativity. Passionate about making physics accessible to all students.",
    image: "https://images.unsplash.com/photo-1765776830139-72b2184dae5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtYW4lMjBwb3J0cmFpdCUyMGRhcmslMjBiYWNrZ3JvdW5kfGVufDF8fHx8MTc3NTQzNDk4NXww&ixlib=rb-4.1.0&q=80&w=400",
    accent: "#0066FF",
    tags: ["Physics", "Research", "Innovation"],
    socials: { twitter: "#", linkedin: "#", github: "#" },
  },
  {
    id: 2,
    name: "Prof. Sarah Chen",
    role: "Mathematics Department Head",
    bio: "MIT Mathematics PhD. Developed interactive teaching methods adopted by 500+ universities worldwide. Mentors 100+ PhD students annually.",
    image: "https://images.unsplash.com/photo-1771072426488-87e6bbcc0cf7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjB3b21hbiUyMHBvcnRyYWl0JTIwc3R1ZGlvJTIwZGFya3xlbnwxfHx8fDE3NzU0MzQ5ODZ8MA&ixlib=rb-4.1.0&q=80&w=400",
    accent: "#7B2FBE",
    tags: ["Mathematics", "Education", "Mentorship"],
    socials: { twitter: "#", linkedin: "#", github: "#" },
  },
  {
    id: 3,
    name: "Prof. Marcus Rodriguez",
    role: "Computer Science Lead",
    bio: "Stanford CS PhD with 20 years in tech education. Built curricula for leading universities. AI researcher focusing on educational technology.",
    image: "https://images.unsplash.com/photo-1752738372136-2602aaafdcb7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYWxlJTIwZGV2ZWxvcGVyJTIwdGVjaCUyMHN0YXJ0dXAlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzU0MzQ5ODh8MA&ixlib=rb-4.1.0&q=80&w=400",
    accent: "#00D4FF",
    tags: ["Computer Science", "EdTech", "AI"],
    socials: { twitter: "#", linkedin: "#", github: "#" },
  },
  {
    id: 4,
    name: "Dr. Priya Patel",
    role: "Chemistry Professor",
    bio: "Oxford Chemistry PhD. Award-winning educator. Published research on chemistry education and created viral chemistry lectures with 50M+ views.",
    image: "https://images.unsplash.com/photo-1753164597554-e315d2d5cc8d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3b21hbiUyMGRlc2lnbmVyJTIwY3JlYXRpdmUlMjBwcm9mZXNzaW9uYWwlMjBwb3J0cmFpdHxlbnwxfHx8fDE3NzU0MzQ5ODl8MA&ixlib=rb-4.1.0&q=80&w=400",
    accent: "#BE2F7B",
    tags: ["Chemistry", "Science Communication", "Research"],
    socials: { twitter: "#", linkedin: "#", github: "#" },
  },
];

function TeamCard({
  member,
  index,
}: {
  member: (typeof teamMembers)[0];
  index: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [hovered, setHovered] = useState(false);

  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : "255, 255, 255";
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      style={{ position: "relative" }}
    >
      <motion.div
        animate={{
          boxShadow: hovered
            ? `0 30px 80px rgba(${hexToRgb(member.accent)}, 0.3), 0 0 0 1px rgba(${hexToRgb(member.accent)}, 0.2)`
            : "0 8px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)",
        }}
        transition={{ duration: 0.4 }}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 24,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Image container */}
        <div
          style={{
            position: "relative",
            height: 280,
            overflow: "hidden",
          }}
        >
          <motion.img
            src={member.image}
            alt={member.name}
            animate={{ scale: hovered ? 1.06 : 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center top",
            }}
          />

          {/* Gradient on image */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(to bottom, transparent 40%, rgba(3, 4, 15, 0.9) 100%)`,
            }}
          />

          {/* Accent glow at bottom of image */}
          <motion.div
            animate={{ opacity: hovered ? 0.5 : 0 }}
            transition={{ duration: 0.4 }}
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 80,
              background: `linear-gradient(to top, ${member.accent}40, transparent)`,
            }}
          />

          {/* Social icons - appear on hover */}
          <motion.div
            animate={{
              opacity: hovered ? 1 : 0,
              y: hovered ? 0 : 10,
            }}
            transition={{ duration: 0.3 }}
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              display: "flex",
              gap: 8,
            }}
          >
            {[
              { Icon: Twitter, href: member.socials.twitter },
              { Icon: Linkedin, href: member.socials.linkedin },
              { Icon: Github, href: member.socials.github },
            ].map(({ Icon, href }) => (
              <a
                key={href}
                href={href}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "rgba(3, 4, 15, 0.7)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  backdropFilter: "blur(10px)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = member.accent;
                  (e.currentTarget as HTMLElement).style.border = `1px solid ${member.accent}`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(3, 4, 15, 0.7)";
                  (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.15)";
                }}
              >
                <Icon size={14} />
              </a>
            ))}
          </motion.div>
        </div>

        {/* Info */}
        <div style={{ padding: "24px 28px" }}>
          {/* Role badge */}
          <div
            style={{
              display: "inline-block",
              background: `rgba(${hexToRgb(member.accent)}, 0.12)`,
              border: `1px solid rgba(${hexToRgb(member.accent)}, 0.25)`,
              borderRadius: 8,
              padding: "3px 10px",
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 11,
                fontWeight: 600,
                color: member.accent,
                letterSpacing: "0.06em",
              }}
            >
              {member.role}
            </span>
          </div>

          <h3
            style={{
              fontFamily: "Syne, sans-serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#fff",
              marginBottom: 12,
            }}
          >
            {member.name}
          </h3>

          {/* Bio - expands on hover */}
          <motion.div
            animate={{
              height: hovered ? "auto" : 0,
              opacity: hovered ? 1 : 0,
              marginBottom: hovered ? 16 : 0,
            }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <p
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 14,
                color: "rgba(160, 180, 230, 0.75)",
                lineHeight: 1.7,
              }}
            >
              {member.bio}
            </p>
          </motion.div>

          {/* Tags */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
            {member.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  color: "rgba(200, 215, 255, 0.5)",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 6,
                  padding: "3px 10px",
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          {/* View profile link */}
          <motion.div
            animate={{ opacity: hovered ? 1 : 0.4 }}
            transition={{ duration: 0.3 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: member.accent,
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            View Profile
            <ArrowUpRight size={14} />
          </motion.div>
        </div>

        {/* Bottom accent line */}
        <motion.div
          animate={{ scaleX: hovered ? 1 : 0.3, opacity: hovered ? 1 : 0.4 }}
          transition={{ duration: 0.4 }}
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${member.accent}, transparent)`,
            transformOrigin: "left",
          }}
        />
      </motion.div>
    </motion.div>
  );
}

export function Team() {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true });

  return (
    <section
      id="team"
      style={{
        padding: "120px 24px",
        background: "#03040F",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "70vw",
          height: "70vw",
          background:
            "radial-gradient(ellipse, rgba(0, 102, 255, 0.05) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
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
              background: "rgba(0, 102, 255, 0.08)",
              border: "1px solid rgba(0, 102, 255, 0.2)",
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
                color: "#4488FF",
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              The Team
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
            Expert{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #0066FF, #00D4FF)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Educators
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
            Leading academics and educators from top universities worldwide — passionate about transforming education through AI.
          </p>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}
        >
          {teamMembers.map((member, i) => (
            <TeamCard key={member.id} member={member} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
