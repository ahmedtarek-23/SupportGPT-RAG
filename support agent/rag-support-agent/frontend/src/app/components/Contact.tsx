import { useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { Mail, MapPin, Phone, Send, ArrowRight, Loader2 } from "lucide-react";

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "support@studybot.edu",
    color: "#0066FF",
  },
  {
    icon: Phone,
    label: "Support",
    value: "24/7 Student Support",
    color: "#7B2FBE",
  },
  {
    icon: MapPin,
    label: "Campus",
    value: "Available at 500+ Universities",
    color: "#00D4FF",
  },
];

export function Contact() {
  const headerRef = useRef(null);
  const headerInView = useInView(headerRef, { once: true });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
    budget: "",
  });
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 1800);
  };

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%",
    background: focused === field ? "rgba(0, 102, 255, 0.06)" : "rgba(255,255,255,0.04)",
    border: `1px solid ${focused === field ? "rgba(0, 102, 255, 0.4)" : "rgba(255,255,255,0.08)"}`,
    borderRadius: 12,
    padding: "14px 16px",
    color: "#fff",
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 15,
    outline: "none",
    transition: "all 0.2s ease",
    boxShadow: focused === field ? "0 0 0 3px rgba(0, 102, 255, 0.08)" : "none",
    boxSizing: "border-box" as const,
  });

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "Space Grotesk, sans-serif",
    fontSize: 12,
    fontWeight: 600,
    color: "rgba(160, 180, 230, 0.6)",
    marginBottom: 8,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  };

  return (
    <section
      id="contact"
      style={{
        padding: "120px 24px",
        background: "#03040F",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background accents */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          right: "-10%",
          width: "50vw",
          height: "50vw",
          background: "radial-gradient(circle, rgba(0, 102, 255, 0.06) 0%, transparent 70%)",
          pointerEvents: "none",
          filter: "blur(30px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          left: "-5%",
          width: "40vw",
          height: "40vw",
          background: "radial-gradient(circle, rgba(123, 47, 190, 0.08) 0%, transparent 70%)",
          pointerEvents: "none",
          filter: "blur(20px)",
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
              Let's Talk
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
            Start Something{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #00D4FF, #7B2FBE)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Extraordinary
            </span>
          </h2>

          <p
            style={{
              fontFamily: "Space Grotesk, sans-serif",
              fontSize: 17,
              color: "rgba(160, 180, 230, 0.65)",
              maxWidth: 480,
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Ready to build the future? Tell us about your project and we'll get
            back to you within 24 hours.
          </p>
        </motion.div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.6fr",
            gap: 32,
            alignItems: "start",
          }}
          className="max-lg:grid-cols-1"
        >
          {/* Left column - info */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={headerInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            {/* Contact info cards */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
              {contactInfo.map(({ icon: Icon, label, value, color }) => (
                <motion.div
                  key={label}
                  whileHover={{ x: 4 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 16,
                    padding: "20px 24px",
                    cursor: "default",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      background: `rgba(${hexToRgb(color)}, 0.12)`,
                      border: `1px solid rgba(${hexToRgb(color)}, 0.2)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} color={color} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "Space Grotesk, sans-serif",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "rgba(160, 180, 230, 0.5)",
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        marginBottom: 3,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        fontFamily: "Space Grotesk, sans-serif",
                        fontSize: 15,
                        fontWeight: 500,
                        color: "#fff",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA box */}
            <div
              style={{
                background: "linear-gradient(135deg, rgba(0, 102, 255, 0.12), rgba(123, 47, 190, 0.12))",
                border: "1px solid rgba(0, 102, 255, 0.2)",
                borderRadius: 20,
                padding: "28px",
              }}
            >
              <h3
                style={{
                  fontFamily: "Syne, sans-serif",
                  fontSize: 20,
                  fontWeight: 700,
                  color: "#fff",
                  marginBottom: 10,
                }}
              >
                Have an urgent project?
              </h3>
              <p
                style={{
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: 14,
                  color: "rgba(160, 180, 230, 0.7)",
                  lineHeight: 1.6,
                  marginBottom: 20,
                }}
              >
                We offer priority access for enterprise clients. Book a call with our leadership team directly.
              </p>
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 20px",
                  color: "#fff",
                  fontFamily: "Space Grotesk, sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 0 20px rgba(0, 102, 255, 0.3)",
                }}
              >
                Book a Call
                <ArrowRight size={16} />
              </button>
            </div>
          </motion.div>

          {/* Right column - form */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={headerInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 28,
                padding: "44px 44px",
                backdropFilter: "blur(20px)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Accent glow */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 200,
                  height: 200,
                  background: "radial-gradient(circle at top right, rgba(0, 102, 255, 0.08), transparent 70%)",
                  pointerEvents: "none",
                }}
              />

              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{
                    textAlign: "center",
                    padding: "40px 20px",
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #0066FF, #00D4FF)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 24px",
                      boxShadow: "0 0 40px rgba(0, 102, 255, 0.4)",
                    }}
                  >
                    <Send size={30} color="#fff" />
                  </div>
                  <h3
                    style={{
                      fontFamily: "Syne, sans-serif",
                      fontSize: 24,
                      fontWeight: 700,
                      color: "#fff",
                      marginBottom: 12,
                    }}
                  >
                    Message Sent!
                  </h3>
                  <p
                    style={{
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: 15,
                      color: "rgba(160, 180, 230, 0.7)",
                      lineHeight: 1.6,
                    }}
                  >
                    Thank you for reaching out. Our team will contact you within 24 hours.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 20,
                      marginBottom: 20,
                    }}
                    className="max-sm:grid-cols-1"
                  >
                    <div>
                      <label style={labelStyle}>Your Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        onFocus={() => setFocused("name")}
                        onBlur={() => setFocused(null)}
                        style={inputStyle("name")}
                        required
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Email Address</label>
                      <input
                        type="email"
                        placeholder="john@company.com"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        onFocus={() => setFocused("email")}
                        onBlur={() => setFocused(null)}
                        style={inputStyle("email")}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Company</label>
                    <input
                      type="text"
                      placeholder="Your company name"
                      value={form.company}
                      onChange={(e) => setForm({ ...form, company: e.target.value })}
                      onFocus={() => setFocused("company")}
                      onBlur={() => setFocused(null)}
                      style={inputStyle("company")}
                    />
                  </div>

                  <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Project Budget</label>
                    <select
                      value={form.budget}
                      onChange={(e) => setForm({ ...form, budget: e.target.value })}
                      onFocus={() => setFocused("budget")}
                      onBlur={() => setFocused(null)}
                      style={{
                        ...inputStyle("budget"),
                        cursor: "pointer",
                      }}
                    >
                      <option value="" style={{ background: "#03040F" }}>Select budget range</option>
                      <option value="50k" style={{ background: "#03040F" }}>$25k – $50k</option>
                      <option value="100k" style={{ background: "#03040F" }}>$50k – $100k</option>
                      <option value="250k" style={{ background: "#03040F" }}>$100k – $250k</option>
                      <option value="500k+" style={{ background: "#03040F" }}>$250k+</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: 32 }}>
                    <label style={labelStyle}>Project Details</label>
                    <textarea
                      placeholder="Tell us about your project, goals, and timeline..."
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      onFocus={() => setFocused("message")}
                      onBlur={() => setFocused(null)}
                      rows={5}
                      style={{
                        ...inputStyle("message"),
                        resize: "vertical",
                        minHeight: 130,
                      }}
                      required
                    />
                  </div>

                  <motion.button
                    type="submit"
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "0 0 40px rgba(0, 102, 255, 0.6), 0 0 80px rgba(123, 47, 190, 0.3)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    disabled={sending}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      background: "linear-gradient(135deg, #0066FF, #7B2FBE)",
                      border: "none",
                      borderRadius: 14,
                      padding: "16px",
                      color: "#fff",
                      fontFamily: "Space Grotesk, sans-serif",
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: sending ? "wait" : "pointer",
                      boxShadow: "0 0 30px rgba(0, 102, 255, 0.3)",
                      opacity: sending ? 0.8 : 1,
                    }}
                  >
                    {sending ? (
                      <>
                        <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                        Sending...
                      </>
                    ) : (
                      <>
                        Send Message
                        <Send size={18} />
                      </>
                    )}
                  </motion.button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : "255, 255, 255";
}
