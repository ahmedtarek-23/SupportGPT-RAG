import { motion } from "motion/react";
import { Zap, Twitter, Linkedin, Github, Instagram, ArrowUpRight } from "lucide-react";

const footerLinks = {
  Company: ["About", "Careers", "Blog", "Press Kit"],
  Services: ["AI & ML", "Product Engineering", "UX Design", "Cybersecurity"],
  Resources: ["Case Studies", "Documentation", "API Reference", "Status"],
  Legal: ["Privacy Policy", "Terms of Service", "Cookie Policy"],
};

const socials = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Instagram, href: "#", label: "Instagram" },
];

export function Footer() {
  return (
    <footer
      style={{
        background: "#020310",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "80px 24px 40px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background accent */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "60vw",
          height: "30vw",
          background: "radial-gradient(ellipse, rgba(0, 102, 255, 0.04) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: 1200, margin: "0 auto", position: "relative" }}>
        {/* Top row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr",
            gap: 40,
            marginBottom: 64,
          }}
          className="max-lg:grid-cols-2 max-sm:grid-cols-1"
        >
          {/* Brand */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 0 20px rgba(0, 102, 255, 0.3)",
                }}
              >
                <Zap size={18} color="#fff" />
              </div>
              <span
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: 22,
                  fontWeight: 700,
                  background: "linear-gradient(90deg, #fff, #a0b4ff)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                NEXUS
              </span>
            </div>

            <p
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 14,
                color: "rgba(160, 180, 230, 0.55)",
                lineHeight: 1.7,
                marginBottom: 24,
                maxWidth: 240,
              }}
            >
              Building the future of intelligent digital experiences for the world's
              most ambitious companies.
            </p>

            {/* Socials */}
            <div style={{ display: "flex", gap: 10 }}>
              {socials.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  whileHover={{ scale: 1.12, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  title={label}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(200, 215, 255, 0.5)",
                    transition: "color 0.2s, background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "#fff";
                    (e.currentTarget as HTMLElement).style.background = "rgba(0, 102, 255, 0.2)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(0, 102, 255, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color = "rgba(200, 215, 255, 0.5)";
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                  }}
                >
                  <Icon size={16} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "rgba(180, 200, 255, 0.4)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  marginBottom: 20,
                }}
              >
                {category}
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      style={{
                        fontFamily: "Space Grotesk, sans-serif",
                        fontSize: 14,
                        color: "rgba(180, 200, 255, 0.45)",
                        textDecoration: "none",
                        transition: "color 0.2s",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "#fff";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "rgba(180, 200, 255, 0.45)";
                      }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 20,
            padding: "28px 32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            marginBottom: 48,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h4
              style={{
                fontFamily: "Syne, sans-serif",
                fontSize: 18,
                fontWeight: 700,
                color: "#fff",
                marginBottom: 6,
              }}
            >
              Stay ahead of the curve
            </h4>
            <p
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 14,
                color: "rgba(160, 180, 230, 0.55)",
              }}
            >
              Get monthly insights on AI, design, and technology.
            </p>
          </div>
          <div style={{ display: "flex", gap: 0, flexShrink: 0 }}>
            <input
              type="email"
              placeholder="Enter your email"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRight: "none",
                borderRadius: "12px 0 0 12px",
                padding: "12px 20px",
                color: "#fff",
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 14,
                outline: "none",
                width: 240,
              }}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
                border: "none",
                borderRadius: "0 12px 12px 0",
                padding: "12px 20px",
                color: "#fff",
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              Subscribe
              <ArrowUpRight size={14} />
            </motion.button>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            paddingTop: 28,
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <p
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 13,
              color: "rgba(160, 180, 230, 0.35)",
            }}
          >
            © 2026 Nexus Technologies Inc. All rights reserved.
          </p>

          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#2FBE7B",
                boxShadow: "0 0 8px #2FBE7B",
                animation: "pulse 2s infinite",
              }}
            />
            <span
              style={{
                fontFamily: "Space Grotesk, sans-serif",
                fontSize: 12,
                color: "rgba(160, 180, 230, 0.35)",
              }}
            >
              All systems operational
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </footer>
  );
}
