"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Lock } from "lucide-react";
import { loginForCms } from "@/app/actions/auth";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminLogin({ isOpen, onClose, onSuccess }: Props) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
      setPassword("");
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { ok, error: errorMessage } = await loginForCms(password);
    if (ok) {
      // Deliberately not also calling onClose() here — the caller's own isOpen prop (driven by
      // whatever state onSuccess flips) is what actually hides this form; onClose is a separate,
      // user-initiated "cancel/dismiss" action (the × button), not something success should
      // trigger too.
      onSuccess();
    } else {
      setError(errorMessage || "Incorrect password — try again");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPassword("");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#141D24",
    border: `1px solid ${error ? "#c0392b" : "rgba(237,232,223,0.1)"}`,
    borderRadius: "10px",
    padding: "12px 16px",
    fontFamily: "'DM Sans', sans-serif",
    fontSize: "15px",
    color: "#EDE8DF",
    outline: "none",
    transition: "border-color 0.2s",
    letterSpacing: "0.1em",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(10, 14, 18, 0.88)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: shake ? [1, 1] : 1, scale: 1, y: 0, x: shake ? [-8, 8, -6, 6, 0] : 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: shake ? 0.4 : 0.25, ease: "easeOut" }}
            className="rounded-2xl p-8 w-full max-w-sm"
            style={{
              background: "#0C1117",
              border: "1px solid rgba(237,232,223,0.08)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: "36px", height: "36px", background: "rgba(20,173,181,0.12)" }}
                >
                  <Lock size={16} style={{ color: "#14ADB5" }} />
                </div>
                <div>
                  <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: "16px", color: "#EDE8DF", fontWeight: 400 }}>
                    Admin Access
                  </p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF", letterSpacing: "0.08em" }}>
                    Jai Boekhout · Portfolio CMS
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="transition-opacity hover:opacity-60"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: "10px",
                    color: error ? "#c0392b" : "#EDE8DF",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    display: "block",
                    marginBottom: "8px",
                  }}
                >
                  {error || "Password"}
                </label>
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="Enter password"
                  style={inputStyle}
                  onFocus={(e) => { if (!error) e.target.style.borderColor = "rgba(20,173,181,0.5)"; }}
                  onBlur={(e) => { if (!error) e.target.style.borderColor = "rgba(237,232,223,0.1)"; }}
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl transition-opacity hover:opacity-80"
                style={{
                  background: "#14ADB5",
                  fontFamily: "'DM Mono', monospace",
                  fontSize: "12px",
                  color: "#0C1117",
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "0.06em",
                  fontWeight: 500,
                }}
              >
                ACCESS CMS
              </button>
            </form>

            <p
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                color: "#EDE8DF",
                textAlign: "center",
                marginTop: "20px",
                letterSpacing: "0.06em",
              }}
            >
              Admin access only
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
