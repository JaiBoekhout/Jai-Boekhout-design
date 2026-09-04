"use client";

import { useFontScale } from "@/store/fontScaleStore";
import type { FontScale } from "@/store/fontScaleStore";

// One button, three levels — clicking always advances to the next one, wrapping back to
// Default after Larger. Same 1 : 1.25 : 1.5 ratio the old hover-dropdown version used, rescaled
// from a 21px base so the button doesn't visually jump size against the nav bar's other icons.
const LEVELS: { scale: FontScale; text: string; px: number; label: string }[] = [
  { scale: 0, text: "A", px: 21, label: "Default text size" },
  { scale: 1, text: "A+", px: 26.25, label: "Large text size" },
  { scale: 2, text: "A++", px: 31.5, label: "Larger text size" },
];

export function FontSizeToggle() {
  const { fontScale, setFontScale } = useFontScale();
  const current = LEVELS[fontScale];
  const next = LEVELS[(fontScale + 1) % LEVELS.length];
  // Default is the common resting state for most visitors, so it stays neutral rather than
  // looking "selected" — only Large/Larger get the quiet dimmed-teal cue that something's been
  // changed from default. Hovering always goes to the full highlight color regardless.
  const restColor = fontScale === 0 ? "var(--c-text-muted)" : "rgba(var(--c-teal-rgb), 0.4)";

  return (
    <button
      type="button"
      onClick={() => setFontScale(next.scale)}
      aria-label={`Text size: ${current.label}. Click to change to ${next.label.toLowerCase()}.`}
      title={`${current.label} — click for ${next.label.toLowerCase()}`}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "11px 8px",
        margin: "-11px -8px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 28,
        flexShrink: 0,
        color: restColor,
        fontFamily: "var(--font-body)",
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--c-teal)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = restColor; }}
    >
      <span style={{ fontSize: current.px, lineHeight: 1 }}>{current.text}</span>
    </button>
  );
}
