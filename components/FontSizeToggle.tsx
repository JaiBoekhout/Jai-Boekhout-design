"use client";

import { useEffect, useRef, useState } from "react";
import { useFontScale } from "@/store/fontScaleStore";
import type { FontScale } from "@/store/fontScaleStore";

// First "A" is always the default size and always visible; hovering (or focusing, for
// keyboard/touch users) drops down two progressively larger "A"s beneath it. Clicking any of the
// three applies that scale — see store/fontScaleStore.tsx for how the scale itself is applied.
// Same 1 : 1.25 : 1.5 ratio the original 14.4/18/21.6 trio used, rescaled from a 21px base (up
// from 14.4) so the always-visible trigger matches the nav bar's other icons — otherwise
// "Large" would render smaller than the "Default" trigger sitting above it in the dropdown.
const SIZES: { scale: FontScale; px: number; label: string }[] = [
  { scale: 0, px: 21, label: "Default text size" },
  { scale: 1, px: 26.25, label: "Large text size" },
  { scale: 2, px: 31.5, label: "Larger text size" },
];

function SizeButton({ scale, px, label, active, onSelect }: { scale: FontScale; px: number; label: string; active: boolean; onSelect: (s: FontScale) => void }) {
  // Resting color: the currently-selected size gets a dimmed version of the highlight color (a
  // quiet "this is active" cue, not a bright one — the default size is the common case for most
  // visitors, so it shouldn't read as urgent), everything else stays neutral. Hovering always
  // goes to the full highlight color regardless of active state — a pure interaction affordance.
  const restColor = active ? "rgba(var(--c-teal-rgb), 0.4)" : "var(--c-text-muted)";
  return (
    <button
      type="button"
      onClick={() => onSelect(scale)}
      aria-label={label}
      aria-pressed={active}
      title={label}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: restColor,
        fontFamily: "var(--font-body)",
        transition: "color 0.15s",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--c-teal)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = restColor; }}
    >
      <span style={{ fontSize: px, lineHeight: 1 }}>A</span>
    </button>
  );
}

export function FontSizeToggle() {
  const { fontScale, setFontScale } = useFontScale();
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  function cancelClose() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
  }
  // A brief grace period before actually closing — a momentary slip off the hoverable zone
  // (moving a little too fast, a slightly-off diagonal) no longer collapses the menu right
  // before the user reaches the option they wanted.
  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 300);
  }

  return (
    <div
      onMouseEnter={() => { cancelClose(); setOpen(true); }}
      onMouseLeave={scheduleClose}
      onFocus={() => { cancelClose(); setOpen(true); }}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) scheduleClose(); }}
      style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 28, height: 26, padding: "11px 8px", margin: "-11px -8px" }}
    >
      <SizeButton {...SIZES[0]} active={fontScale === SIZES[0].scale} onSelect={setFontScale} />
      {/* Absolutely positioned so the dropdown overlays whatever's beneath it instead of
          pushing the nav bar taller on hover. */}
      <div
        style={{
          position: "absolute",
          top: "100%",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          minWidth: 28,
          gap: 8,
          paddingTop: 8,
          maxHeight: open ? 98 : 0,
          opacity: open ? 1 : 0,
          overflow: "hidden",
          pointerEvents: open ? "auto" : "none",
          transition: "max-height 0.2s ease, opacity 0.15s ease",
        }}
      >
        {SIZES.slice(1).map((s) => (
          <SizeButton key={s.scale} {...s} active={fontScale === s.scale} onSelect={setFontScale} />
        ))}
      </div>
    </div>
  );
}
