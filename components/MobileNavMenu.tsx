"use client";

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useFontScale } from "@/store/fontScaleStore";
import type { FontScale } from "@/store/fontScaleStore";

const SIZES: { scale: FontScale; label: string }[] = [
  { scale: 0, label: "Default" },
  { scale: 1, label: "Large" },
  { scale: 2, label: "Larger" },
];

// Mobile replacement for the desktop nav bar's separate ThemeToggle/FontSizeToggle icons —
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
            background: "var(--c-bg-card)",
            border: "1px solid var(--c-border-soft)",
            borderRadius: 14,
            boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {/* Dark Mode */}
          <div className="flex items-center justify-between" style={{ padding: "10px 12px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--c-text)", letterSpacing: "0.04em" }}>
              Dark Mode
            </span>
            <ThemeToggle />
          </div>

          <div style={{ height: 1, background: "var(--c-border-soft)", margin: "2px 8px" }} />

          {/* Accessibility (font size) */}
          <div style={{ padding: "10px 12px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--c-text)", letterSpacing: "0.04em", display: "block", marginBottom: "10px" }}>
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
                      color: active ? "var(--c-teal)" : "var(--c-text-muted)",
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
