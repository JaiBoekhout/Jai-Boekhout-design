"use client";

import { useEffect, useRef, useState } from "react";
import { PaintRoller, Moon, Sun } from "lucide-react";
import { useTheme } from "@/store/themeStore";
import { useStyleTheme } from "@/store/styleThemeStore";

// Fixed, deliberately NOT var(--tag-corner)/var(--card-corner) — this is the switcher's own UI
// chrome, not content being switched. Tying the panel's shape to the active theme's own corner
// setting made it balloon into a near-circle the moment "Rounded" (pill = 999px) was selected,
// since a tall narrow box at that radius reads as a stadium/circle rather than a subtly rounded
// rectangle. "Soft" here matches the same value BUTTON_CORNER_RADIUS's "soft" option already
// uses elsewhere (store/contentStore.ts), just as a fixed literal instead of a theme-driven var.
const PANEL_CORNER = 8;
const OPTION_CORNER = 6;

const TRACK_W = 40;
const TRACK_H = 22;
const THUMB = 16;
const PAD = 3;

// Style (Square/Rounded — which CSS block applies, see buildAllThemesCss) and mode (Dark/Light —
// unrelated, every color already has its own dark+light pair) are two independent axes living
// under one trigger button/panel for a single, uncluttered nav-bar entry point — but rendered as
// two distinct controls inside, not flattened into one list of 3 interchangeable options. Picking
// a style leaves mode exactly as it was; the mode switch leaves style exactly as it was.
export function ThemeDropdown() {
  const { theme, setThemeDirect } = useTheme();
  const { styleTheme, availableThemes, setStyleTheme } = useStyleTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const isDark = theme === "dark";
  const styleOptions = [{ id: null as string | null, label: "Original" }, ...availableThemes.map((t) => ({ id: t.id as string | null, label: t.name }))];
  const currentStyleLabel = styleOptions.find((o) => o.id === styleTheme)?.label ?? "Original";

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
    <div ref={rootRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={`Theme settings — currently ${currentStyleLabel}, ${isDark ? "Dark" : "Light"}`}
        title="Theme settings"
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "var(--c-bg-card)",
          border: "0.5px solid var(--c-border-soft)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          flexShrink: 0,
          padding: 0,
          transition: "opacity 0.15s ease, transform 0.15s ease",
        }}
        className="hover:opacity-80"
      >
        <PaintRoller size={15} strokeWidth={2} style={{ color: "var(--c-text)" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 168,
            zIndex: 60,
            background: "var(--c-bg-card)",
            border: "1px solid var(--c-border-soft)",
            borderRadius: PANEL_CORNER,
            boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {/* Style — which CSS block applies (Original, or any theme the CMS has marked
              visitor-visible; see the Theme Gallery's eye-icon toggle) */}
          {styleOptions.map((opt) => {
            const active = styleTheme === opt.id;
            return (
              <button
                key={opt.id ?? "original"}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => setStyleTheme(opt.id)}
                style={{
                  background: active ? "color-mix(in srgb, var(--c-teal) 12%, transparent)" : "none",
                  border: "none",
                  borderRadius: OPTION_CORNER,
                  cursor: "pointer",
                  padding: "8px 10px",
                  textAlign: "left",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  letterSpacing: "0.04em",
                  color: active ? "var(--c-teal)" : "var(--c-text)",
                }}
              >
                {opt.label}
              </button>
            );
          })}

          <div style={{ height: 1, background: "var(--c-border-soft)", margin: "5px 4px" }} />

          {/* Mode — Dark/Light, independent of the style choice above */}
          <div className="flex items-center justify-between" style={{ padding: "6px 10px 2px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--c-text-muted)", letterSpacing: "0.04em" }}>
              {isDark ? "Dark" : "Light"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={isDark}
              onClick={() => setThemeDirect(isDark ? "light" : "dark")}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="flex items-center"
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, margin: -4 }}
            >
              <Moon size={11} strokeWidth={2.75} style={{ color: "var(--c-text-muted)", marginRight: 6, flexShrink: 0 }} />
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
              <Sun size={11} strokeWidth={2.75} style={{ color: "var(--c-text-muted)", marginLeft: 6, flexShrink: 0 }} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
