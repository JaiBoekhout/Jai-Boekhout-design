"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "motion/react";
import { track } from "@vercel/analytics";
import { ArrowLeft, X } from "lucide-react";
import type { CMSProject } from "@/store/contentStore";
import { useButtonCorner } from "@/components/SiteKit";

const TEAL = "var(--c-teal)";

interface ProjectDetailChromeProps {
  project: CMSProject;
  mode: "modal" | "page";
  onClose: () => void;
  /** Modal only — fires once the open/reveal animation finishes. */
  onAnimationComplete?: () => void;
  children: ReactNode;
}

// The popup panel — a plain scale+fade reveal rather than a shared-element morph from the grid
// card. That morph relied on Motion's automatic layoutId crossfade, whose opacity timing isn't
// exposed for tuning and reliably finished fading before the shape/size animation did, reading
// as an abrupt cut rather than a smooth close. This is a much smaller, fully self-contained
// animation with nothing else to race against.
//
// mode="modal" owns dialog chrome (fixed panel shell, mobile back/close bar, focus trap) — the
// backdrop stays with the caller since it persists across project switches (a "View More" click
// while the popup is already open swaps this panel via its per-project key without the backdrop
// re-animating). mode="page" is a plain in-flow page for a real /work/[slug] hard navigation —
// no fixed positioning, no focus trap (there's nothing behind it to trap focus away from), no
// backdrop, just a real link back to the grid.
export function ProjectDetailChrome({ project, mode, onClose, onAnimationComplete, children }: ProjectDetailChromeProps) {
  // Dialog semantics for the expanded project popup: move focus in on open, trap Tab within
  // it, and return focus to whatever triggered it on close. Modal-only — Vercel Analytics'
  // automatic pageview tracking already covers mode="page" views, so project_viewed only fires
  // for the modal (a real page navigation was never separately instrumented before this).
  const popupRef = useRef<HTMLDivElement>(null);
  const popupTriggerRef = useRef<HTMLElement | null>(null);
  const buttonCorner = useButtonCorner();
  useEffect(() => {
    if (mode !== "modal") return;
    track("project_viewed", { project: project.name });
    popupTriggerRef.current = document.activeElement as HTMLElement | null;

    function visibleFocusables(): HTMLElement[] {
      const all = popupRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      return all ? [...all].filter((el) => el.offsetParent !== null) : [];
    }

    visibleFocusables().find((el) => el.hasAttribute("data-popup-close"))?.focus();

    function onKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusables = visibleFocusables();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      popupTriggerRef.current?.focus();
    };
  }, [mode, project.id, project.name]);

  if (mode === "page") {
    // No "Back to Work" row above this flex row — that would sit between the persistent top
    // bar and the sticky hero column, pushing the hero's natural (pre-stick) offset past the
    // lg:top-16 threshold it needs to land on. It would then only actually stick — and the
    // scroll-hint pinned to its bottom edge would only become visible — once the visitor
    // scrolled the page down by roughly that row's own height first. ProjectDetailBody renders
    // the back link itself instead, absolutely positioned inside the hero panel so it adds no
    // flow height above it.
    return (
      <div style={{ minHeight: "100vh", background: "var(--c-bg-deep)" }}>
        {/* A real position:fixed close button (this branch has no transformed ancestor, unlike
            the modal's motion.div, so fixed here is genuinely viewport-relative) — the page's
            own "Back to Work" link lives inside the scrolling hero banner below and scrolls out
            of view, so this is the one way to close the page from anywhere in the scroll. */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="hover:opacity-70 transition-opacity flex items-center justify-center"
          style={{
            position: "fixed", top: 14, right: 14, zIndex: 60,
            width: 34, height: 34, borderRadius: "50%",
            border: "0.5px solid rgba(245,241,234,0.3)", background: "rgba(15,21,25,0.55)",
            color: "#F5F1EA", cursor: "pointer",
          }}
        >
          <X size={14} />
        </button>
        <div className="flex flex-col lg:flex-row">{children}</div>
      </div>
    );
  }

  return (
    <motion.div
      ref={popupRef}
      role="dialog"
      aria-modal="true"
      aria-label={project.name}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      style={{
        position: "fixed",
        inset: "24px",
        zIndex: 50,
        borderRadius: 20,
        background: "var(--c-bg-deep)",
        boxShadow: "0 40px 120px rgba(0,0,0,0.7)",
      }}
      transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      onAnimationComplete={onAnimationComplete}
    >
      {/* Close button — a sibling of the scrolling content below, positioned against this
          panel's own (fixed, non-scrolling) box rather than inside it, so it stays put at a
          constant spot on screen as the visitor scrolls through a project, instead of scrolling
          away with the hero banner it used to be absolutely-positioned inside of. Fixed light
          colors (not theme vars) since it always sits on top of whatever's currently scrolled
          underneath it — a photo hero, or a plain themed background — same treatment the old
          hero-overlaid close button used, now just applying everywhere instead of only there. */}
      <button
        onClick={onClose}
        aria-label="Close"
        data-popup-close
        className="hover:opacity-70 transition-opacity flex items-center justify-center"
        style={{
          position: "absolute", top: 14, right: 14, zIndex: 10,
          width: 34, height: 34, borderRadius: "50%",
          border: "0.5px solid rgba(245,241,234,0.3)", background: "rgba(15,21,25,0.55)",
          color: "#F5F1EA", cursor: "pointer",
        }}
      >
        <X size={14} />
      </button>

      {/* overscrollBehavior: contain stops a scroll gesture that hands off from the tall-hero-image
          box (inside the body) from leaking past this popup into the page underneath, which is
          otherwise still independently scrollable behind this fixed-position overlay. */}
      <div className="flex flex-col lg:flex-row h-full overflow-y-auto lg:overflow-hidden" style={{ borderRadius: "inherit", overscrollBehavior: "contain" }}>
        {/* Top actions — top of the page on mobile/tablet, above everything including the hero image.
            The close X itself now lives in the persistent button above; this bar just keeps the
            "Back to Projects" affordance. Right padding clears that persistent circle (34px wide,
            sitting 14px from the panel's edge) so the two never overlap. */}
        <div className="flex lg:hidden items-center justify-end gap-2 py-3 pl-3" style={{ paddingRight: 62 }}>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", color: "#0C1117", background: TEAL, border: "none", borderRadius: buttonCorner, padding: "7px 12px", cursor: "pointer" }}
          >
            <ArrowLeft size={11} /> Back to Projects
          </button>
        </div>

        {children}
      </div>
    </motion.div>
  );
}
