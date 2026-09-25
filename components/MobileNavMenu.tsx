"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeSwitcherOptions, SWATCH_BG, SWATCH_TEXT, SWATCH_ACTIVE, SWATCH_DIVIDER } from "@/components/ThemeDropdown";
import { useFontScale } from "@/store/fontScaleStore";
import type { FontScale } from "@/store/fontScaleStore";

const SIZES: { scale: FontScale; label: string }[] = [
  { scale: 0, label: "Default" },
  { scale: 1, label: "Large" },
  { scale: 2, label: "Larger" },
];

// Mobile replacement for the desktop nav bar's separate ThemeDropdown/FontSizeToggle icons —
// those rely on hover (FontSizeToggle's size dropdown) or sit too close together for a
// comfortable tap target, so on small screens they're collapsed into one hamburger button that
// opens a proper tap-friendly menu instead.
export function MobileNavMenu() {
  const [open, setOpen] = useState(false);
  const { fontScale, setFontScale } = useFontScale();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
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

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 14px)",
            right: 0,
            minWidth: 230,
            zIndex: 60,
            // Fixed blue, not theme-driven — same brand palette as the desktop ThemeDropdown
            // popup (see ThemeDropdown.tsx's SWATCH_* comment), applied to the whole menu here
            // rather than just a nested theme sub-panel, so there's one consistent look and no
            // second tap needed to reach the theme options.
            background: SWATCH_BG,
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 14,
            boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {/* Theme — options + mode toggle shown directly, no nested popup to expand */}
          <div style={{ padding: "10px 12px 2px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: SWATCH_TEXT, letterSpacing: "0.04em", display: "block", marginBottom: 4 }}>
              Theme
            </span>
          </div>
          <ThemeSwitcherOptions />

          <div style={{ height: 1, background: SWATCH_DIVIDER, margin: "2px 8px" }} />

          {/* Accessibility (font size) */}
          <div style={{ padding: "10px 12px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: SWATCH_TEXT, letterSpacing: "0.04em", display: "block", marginBottom: "10px" }}>
              Accessibility
            </span>
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
        </div>
      )}
    </div>
  );
}
