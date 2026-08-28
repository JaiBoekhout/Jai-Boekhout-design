"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/store/themeStore";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === "dark";

  return (
    // Outer button is the real tap target (WCAG touch-target minimum); the visible switch
    // itself stays compact so this doesn't dominate the nav bar. Track/thumb reuse the same
    // --switch-* tokens as the site's own Switch component (SiteKit.tsx) for visual
    // consistency, extended here with a sun/moon icon riding inside the thumb.
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      onClick={toggle}
      aria-label={isDark ? "Switch to day mode" : "Switch to night mode"}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "11px 7px",
        margin: "-11px -7px",
        display: "flex",
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      {/* Whole-pixel dimensions only (not the SiteKit Switch's 38/22/16/3 scaled up ×1.2, which
          is where the old 45.6/26.4/19.2/3.6 fractions came from) — a fractional CSS size lands
          the icon on a sub-pixel position that only anti-aliases cleanly at high device pixel
          ratios. Confirmed live at viewport 1920×1080: dpr:1 (a typical external monitor, no
          HiDPI) rendered the moon icon as a soft blur; dpr:2 (a Retina laptop panel) rendered it
          crisp — same CSS, only the fractional sub-pixel rounding differed. */}
      <span
        style={{
          width: 46,
          height: 26,
          borderRadius: 100,
          padding: 3,
          background: isDark ? "var(--switch-color)" : "var(--switch-track-off)",
          display: "flex",
          justifyContent: isDark ? "flex-end" : "flex-start",
          transition: "background 0.2s ease",
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "var(--switch-thumb)",
            color: "var(--c-heading)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.2s ease",
          }}
        >
          {isDark ? <Moon size={13} strokeWidth={2.75} /> : <Sun size={13} strokeWidth={2.75} />}
        </span>
      </span>
    </button>
  );
}
