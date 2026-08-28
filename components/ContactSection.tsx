"use client";

import { useActionState, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Phone, MessageCircle, Send, X, CheckCircle, AlertCircle } from "lucide-react";
import { submitEnquiry } from "@/app/actions/contact";

const PHONE = "+61 0458 941 417";
const PHONE_RAW = "+610458941417";

export function ContactSection() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(submitEnquiry, null);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "rgba(237,232,223,0.04)",
    border: "1px solid rgba(237,232,223,0.1)",
    borderRadius: "10px",
    padding: "12px 16px",
    fontFamily: "var(--font-body)",
    fontSize: "14px",
    color: "#EDE8DF",
    fontWeight: 300,
    outline: "none",
    transition: "border-color 0.2s",
  };

  return (
    <div>
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="cta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            onClick={() => setOpen(true)}
            className="flex items-center gap-3 px-6 py-3 rounded-xl transition-opacity hover:opacity-80"
            style={{
              background: "#14ADB5",
              fontFamily: "var(--font-heading)",
              fontSize: "15px",
              color: "#0F1519",
              fontWeight: 400,
              border: "none",
              cursor: "pointer",
            }}
          >
            Get in touch
            <Send size={14} />
          </motion.button>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="rounded-2xl p-6 md:p-8"
            style={{
              background: "#141D24",
              border: "1px solid rgba(20,173,181,0.2)",
              maxWidth: "600px",
            }}
          >
            {/* Heading */}
            <div className="flex items-start justify-between mb-6">
              <motion.h3
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(22px, 3vw, 30px)",
                  color: "#EDE8DF",
                  fontWeight: 400,
                  lineHeight: 1.15,
                }}
              >
                Get in touch
              </motion.h3>
              <button
                onClick={() => setOpen(false)}
                className="transition-opacity hover:opacity-60 mt-1"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Success state */}
            {state?.ok ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-6 text-center"
              >
                <CheckCircle size={36} style={{ color: "#14ADB5" }} />
                <p style={{ fontFamily: "var(--font-body)", fontSize: "15px", color: "#EDE8DF" }}>
                  Message sent! I'll get back to you soon.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  className="text-sm transition-opacity hover:opacity-70"
                  style={{ color: "#EDE8DF", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.06em" }}
                >
                  Close
                </button>
              </motion.div>
            ) : (
              <motion.form
                action={action}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="flex flex-col gap-3"
              >
                {state?.error && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)" }}>
                    <AlertCircle size={14} style={{ color: "#C0392B", flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#EDE8DF" }}>{state.error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    required
                    type="text"
                    name="name"
                    placeholder="Your name"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.5)")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.1)")}
                  />
                  <input
                    required
                    type="email"
                    name="email"
                    placeholder="Your email"
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.5)")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.1)")}
                  />
                </div>
                <textarea
                  required
                  name="message"
                  placeholder="Tell me about the opportunity or project…"
                  rows={4}
                  style={{ ...inputStyle, resize: "none" }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.5)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.1)")}
                />

                <div className="flex flex-col md:flex-row gap-3 mt-1 items-start md:items-center">
                  <button
                    type="submit"
                    disabled={pending}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl transition-opacity hover:opacity-80 disabled:opacity-50"
                    style={{
                      background: "#14ADB5",
                      fontFamily: "var(--font-mono)",
                      fontSize: "12px",
                      color: "#0F1519",
                      border: "none",
                      cursor: pending ? "default" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <Send size={12} />
                    {pending ? "Sending…" : "Send message"}
                  </button>

                  <div
                    className="hidden md:block"
                    style={{ width: "1px", height: "28px", background: "rgba(237,232,223,0.08)" }}
                  />

                  <div className="flex items-center gap-3">
                    <a
                      href={`tel:${PHONE_RAW}`}
                      className="flex items-center gap-2 transition-opacity hover:opacity-70"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: "#EDE8DF",
                        textDecoration: "none",
                      }}
                    >
                      <Phone size={12} style={{ color: "#14ADB5" }} />
                      {PHONE}
                    </a>
                    <span style={{ color: "rgba(237,232,223,0.15)", fontSize: "12px" }}>·</span>
                    <a
                      href={`https://wa.me/${PHONE_RAW.replace("+", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 transition-opacity hover:opacity-70"
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        color: "#EDE8DF",
                        textDecoration: "none",
                      }}
                    >
                      <MessageCircle size={12} style={{ color: "#14ADB5" }} />
                      WhatsApp
                    </a>
                  </div>
                </div>
              </motion.form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
