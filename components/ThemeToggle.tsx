"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/store/themeStore";

// Track width/height/thumb size/padding — whole pixels only (not fractional), same reasoning
// as before: a fractional CSS size lands the thumb on a sub-pixel position that only
// anti-aliases cleanly at high device pixel ratios. Confirmed live at viewport 1920×1080:
// dpr:1 (a typical external monitor, no HiDPI) blurred softly; dpr:2 (a Retina panel) stayed
// crisp — same CSS, only the fractional sub-pixel rounding differed.
const TRACK_W = 46;
const TRACK_H = 26;
const THUMB = 20;
const PAD = 3;

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    // Outer button is the real tap target (WCAG touch-target minimum); the visible switch
    // itself stays compact so this doesn't dominate the nav bar. Moon/sun now sit fixed outside
    // the track (not riding inside the thumb) — the thumb is just a plain dot that slides
    // between them, always the site's own highlight color regardless of which mode is active;
    // only its position says which mode that is.
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggle}
      aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
      className="flex items-center gap-2"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "11px 7px",
        margin: "-11px -7px",
        flexShrink: 0,
      }}
    >
      <Moon size={13} strokeWidth={2.75} style={{ color: "var(--c-text-muted)", flexShrink: 0 }} />
      <span style={{ position: "relative", width: TRACK_W, height: TRACK_H, borderRadius: 100, background: "var(--c-border-med)", flexShrink: 0 }}>
        <span
          style={{
            position: "absolute",
            top: PAD,
            left: isDark ? PAD : TRACK_W - PAD - THUMB,
            width: THUMB,
            height: THUMB,
            borderRadius: "50%",
            background: "var(--c-teal)",
            transition: "left 0.2s ease",
          }}
        />
      </span>
      <Sun size={13} strokeWidth={2.75} style={{ color: "var(--c-text-muted)", flexShrink: 0 }} />
    </button>
  );
}
