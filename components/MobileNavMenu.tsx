"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ThemeSwitcherOptions, SWATCH_BG, SWATCH_TEXT, SWATCH_ACTIVE, SWATCH_DIVIDER } from "@/components/ThemeDropdown";
import { HamburgerMenuReference } from "@/components/HamburgerEasterEgg";
import { useFontScale } from "@/store/fontScaleStore";
import type { FontScale } from "@/store/fontScaleStore";

const SIZES: { scale: FontScale; label: string }[] = [
  { scale: 0, label: "Default" },
  { scale: 1, label: "Large" },
  { scale: 2, label: "Larger" },
];

// The one hamburger on small screens — the desktop header's ThemeDropdown/FontSizeToggle/
// HamburgerEasterEgg trio collapses into this single button, since those rely on hover
// (FontSizeToggle's dropdown) or sit too close together to tap comfortably.
//
// It opens a sheet that slides in from the right rather than the small anchored dropdown it used
// to be, because it now carries the desktop easter egg's glyph reference as well: the controls a
// visitor came for (Theme, Accessibility) sit at the top where they're reachable without
// scrolling, and the joke follows underneath. A dropdown couldn't hold both without running off
// the bottom of a phone screen.
export function MobileNavMenu() {
  const [open, setOpen] = useState(false);
  const { fontScale, setFontScale } = useFontScale();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const headingId = useId();
  const reduceMotion = useReducedMotion();
  // document.body doesn't exist during the server render, so the portal only mounts client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;

    sheetRef.current?.querySelector<HTMLButtonElement>("[data-close]")?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      // Same focus trap as the desktop popup's (HamburgerEasterEgg) — this sheet covers the page,
      // so tabbing out of it would land on controls the visitor can't see.
      if (e.key === "Tab" && sheetRef.current) {
        const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
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
    }

    // The sheet scrolls internally; locking the body stops the page behind it scrolling too when
    // a swipe runs past the sheet's own end.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
    } else if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
      // The "your actual navigation is waiting down below" line points at the floating nav, which
      // this sheet is sitting on top of — so the nudge fires as the sheet leaves rather than on
      // open (where the desktop popup fires it, since there the nav stays in view the whole time).
      window.dispatchEvent(new Event("nudge-bottom-nav"));
    }
  }, [open]);

  const sheetContent = (
    <>
      <button type="button" data-close aria-label="Close menu" onClick={() => setOpen(false)} style={closeButtonStyle}>
        <X size={18} />
      </button>

      {/* Theme — options + mode toggle shown directly, no nested popup to expand */}
      <div style={{ padding: "2px 2px 2px" }}>
        <span style={sectionLabelStyle}>Theme</span>
      </div>
      <ThemeSwitcherOptions />

      <div style={{ height: 1, background: SWATCH_DIVIDER, margin: "12px 2px" }} />

      {/* Accessibility (font size) */}
      <div style={{ padding: "0 2px" }}>
        <span style={{ ...sectionLabelStyle, marginBottom: 10 }}>Accessibility</span>
        <div className="flex items-center gap-5">
          {SIZES.map(({ scale, label }) => {
            const active = fontScale === scale;
            return (
              <button
                key={scale}
                type="button"
                onClick={() => setFontScale(scale)}
                aria-label={`${label} text size`}
                aria-pressed={active}
                title={label}
                style={{
                  background: "none",
                  border: "none",
                  padding: "6px 0",
                  cursor: "pointer",
                  color: active ? SWATCH_ACTIVE : SWATCH_TEXT,
                  fontFamily: "var(--font-body)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                <span style={{ fontSize: 14 + scale * 5, lineHeight: 1 }}>A</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: 1, background: SWATCH_DIVIDER, margin: "16px 2px" }} />

      <HamburgerMenuReference headingId={headingId} compact />
    </>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "11px",
          margin: "-11px",
          color: "var(--c-text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {open ? <X size={21} /> : <Menu size={21} />}
      </button>

      {/* Portalled to <body>. The header this button lives in is both position:sticky with a
          transform (its hide-on-scroll slide) and z-40 — a transform makes an element the
          containing block for fixed-position descendants AND opens a stacking context, so an
          in-place sheet would be positioned against the header's own box and capped at z-40,
          painting underneath the floating nav's z-50 no matter how high its own z-index went.
          The homepage's animated root wrapper does the same thing. */}
      {mounted && createPortal(
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              aria-hidden="true"
              onClick={() => setOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              style={{ position: "fixed", inset: 0, zIndex: 70, background: "rgba(0,0,0,0.5)" }}
            />
            <motion.div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={headingId}
              initial={reduceMotion ? { opacity: 0 } : { x: "100%" }}
              animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { x: "100%" }}
              transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={sheetStyle}
            >
              {sheetContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>,
      document.body
      )}
    </>
  );
}

const sheetStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  right: 0,
  zIndex: 71,
  width: "min(340px, 88vw)",
  // Hugs its content and stops short of the floating nav instead of running the full height —
  // the sheet's own closing line points at that nav, so covering it was the one thing this panel
  // shouldn't do. 120px clears the bar (32px up from the bottom, ~65px tall, plus its halo) with
  // a little breathing room. dvh rather than vh so collapsing browser chrome doesn't strand the
  // end of the sheet under the address bar; it still scrolls internally if a screen is short
  // enough that even the compact content doesn't fit.
  maxHeight: "calc(100dvh - 120px)",
  overflowY: "auto",
  overscrollBehavior: "contain",
  WebkitOverflowScrolling: "touch",
  background: SWATCH_BG,
  borderLeft: `1px solid ${SWATCH_DIVIDER}`,
  boxShadow: "-16px 0 40px rgba(0,0,0,0.45)",
  padding: "52px 20px 28px",
};

const sectionLabelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: SWATCH_TEXT,
  letterSpacing: "0.04em",
  display: "block",
  marginBottom: 6,
};

const closeButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: 14,
  right: 14,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 8,
  margin: -8,
  display: "flex",
  color: SWATCH_TEXT,
  opacity: 0.7,
};
