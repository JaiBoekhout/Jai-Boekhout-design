"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Lock } from "lucide-react";
import type { CMSProject } from "@/store/contentStore";
import { useContentStore } from "@/store/contentStore";

const TEAL = "var(--c-teal)";

export interface CaseStudyLockGateProps {
  project: CMSProject;
  onClose: () => void;
  /** Password matched — caller reveals the case study (and closes anything else it needs to). */
  onUnlocked: () => void;
}

// Password modal for a `fullCaseStudyLocked` project. lockInput/lockError are local (not lifted
// to the caller) since this component fully unmounts when dismissed — the caller only needs to
// stop rendering it, no separate reset call is needed for the next time it opens.
export function CaseStudyLockGate({ project, onClose, onUnlocked }: CaseStudyLockGateProps) {
  const { content } = useContentStore();
  const [lockInput, setLockInput] = useState("");
  const [lockError, setLockError] = useState(false);

  function attemptUnlock() {
    if (lockInput === project.fullCaseStudyPassword) {
      onUnlocked();
    } else {
      setLockError(true);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(6,9,12,0.85)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
        onClick={(e) => e.stopPropagation()}
        style={{ background: "var(--c-bg-deep)", border: "1px solid color-mix(in srgb, var(--c-teal) 20%, transparent)", borderRadius: 20, padding: "40px 36px", maxWidth: 420, width: "100%", boxShadow: "0 40px 120px rgba(0,0,0,0.8)" }}
      >
        {/* Icon */}
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: "color-mix(in srgb, var(--c-teal) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--c-teal) 25%, transparent)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Lock size={22} style={{ color: TEAL }} />
        </div>

        {/* Heading */}
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: 22, fontWeight: 400, color: "var(--c-text)", textAlign: "center", marginBottom: 8, lineHeight: 1.2 }}>
          Private Project
        </h3>
        <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--c-text)", textAlign: "center", lineHeight: 1.7, fontWeight: 300, marginBottom: 28 }}>
          This project is protected. Enter the access code below, or get in touch with me directly to request access.
        </p>

        {/* Password input */}
        <div style={{ marginBottom: 12 }}>
          <input
            autoFocus
            type="password"
            value={lockInput}
            onChange={(e) => { setLockInput(e.target.value); setLockError(false); }}
            onKeyDown={(e) => { if (e.key === "Enter") attemptUnlock(); }}
            placeholder="Enter access code…"
            style={{ width: "100%", background: "var(--c-surface-4)", border: `1px solid ${lockError ? "color-mix(in srgb, var(--destructive) 60%, transparent)" : "var(--c-border-med)"}`, borderRadius: 10, padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--c-text)", outline: "none", letterSpacing: "0.06em" }}
          />
          {lockError && (
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--destructive)", marginTop: 6, letterSpacing: "0.04em" }}>
              Incorrect access code — try again
            </p>
          )}
        </div>

        {/* Unlock button */}
        <button
          onClick={attemptUnlock}
          style={{ width: "100%", background: TEAL, border: "none", borderRadius: 10, padding: "12px 0", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 12, color: "#0C1117", letterSpacing: "0.08em", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
          className="hover:opacity-80 transition-opacity"
        >
          <Lock size={12} /> Unlock project
        </button>

        {/* Divider */}
        <div style={{ height: "0.5px", background: "var(--c-border)", marginBottom: 20 }} />

        {/* Contact CTA */}
        <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--c-text)", textAlign: "center", lineHeight: 1.6, fontWeight: 300 }}>
          Don&apos;t have the code?{" "}
          <a
            href={`mailto:${content.global.email}`}
            style={{ color: TEAL, textDecoration: "none" }}
            className="hover:opacity-70 transition-opacity"
          >
            Contact me
          </a>
          {" "}to request access.
        </p>
      </motion.div>
    </motion.div>
  );
}
