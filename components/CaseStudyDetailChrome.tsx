"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, X } from "lucide-react";

const TEAL = "var(--c-teal)";

interface CaseStudyDetailChromeProps {
  mode: "modal" | "page";
  onClose: () => void;
  children: ReactNode;
}

// Shell for the "Full Case Study" view — sticky back/close bar plus the scrollable content
// underneath. No focus-trap of its own (unlike ProjectDetailChrome): this overlay never
// coexists with the project popup (opening it closes the popup first), so there's nothing
// behind it to trap focus away from — true in both modal and page mode.
export function CaseStudyDetailChrome({ mode, onClose, children }: CaseStudyDetailChromeProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={mode === "modal"
        ? { position: "fixed", inset: 0, zIndex: 70, background: "#0F1519", overflowY: "auto" }
        : { minHeight: "100vh", background: "#0F1519" }}
    >
      {/* Back bar */}
      <div style={{ position: "sticky", top: 0, zIndex: 2, background: "rgba(15,21,25,0.92)", backdropFilter: "blur(10px)", borderBottom: "0.5px solid rgba(237,232,223,0.06)", padding: "14px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {mode === "modal" ? (
          <button
            onClick={onClose}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", color: "#0C1117", background: TEAL, border: "none", borderRadius: 999, padding: "7px 12px", cursor: "pointer" }}
            className="hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={11} /> Back to projects
          </button>
        ) : (
          <Link
            href="/work"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em", color: "#0C1117", background: TEAL, borderRadius: 999, padding: "7px 13px", textDecoration: "none" }}
            className="hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={12} /> Back to projects
          </Link>
        )}
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: TEAL, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Case Study
        </span>
        {mode === "modal" ? (
          <button
            onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: "50%", border: "0.5px solid var(--c-border-med)", background: "var(--c-surface-4)", color: "var(--c-text)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            className="hover:opacity-60 transition-opacity"
          >
            <X size={14} />
          </button>
        ) : (
          <span style={{ width: 32, height: 32 }} aria-hidden="true" />
        )}
      </div>

      {children}
    </motion.div>
  );
}
