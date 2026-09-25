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

// Fixed brand palette for the whole theme-switcher widget — the button, its desktop popup, and
// the mobile hamburger menu's inline copy of the same options (see MobileNavMenu.tsx) all share
// these literal colors rather than any --c-*/theme-driven variable. This widget switches between
// themes, so its own appearance can't depend on whichever theme happens to be active without risk
// of an unreadable combination (Going Dutch!'s light mode made both the trigger icon and this
// panel's text disappear against their own backgrounds at different points). A fixed blue panel
// with white default copy and orange for whatever's currently selected always reads, everywhere.
export const SWATCH_BG = "linear-gradient(160deg, #2F5FD6, #17225C)";
export const SWATCH_TEXT = "#FFFFFF";
export const SWATCH_ACTIVE = "#F36C21";
export const SWATCH_DIVIDER = "rgba(255,255,255,0.15)";
export const SWATCH_TRACK_OFF = "rgba(255,255,255,0.25)";

// The options list + mode toggle, with no button/popup wrapper of its own — ThemeDropdown below
// renders this inside its popup for the desktop nav bar; MobileNavMenu renders it directly inline
// in the hamburger menu instead, since a second tap to expand a nested popup on top of an already-
// open menu is an extra, awkward step mobile doesn't need.
export function ThemeSwitcherOptions() {
  const { theme, setThemeDirect } = useTheme();
  const { styleTheme, availableThemes, setStyleTheme, modeLocked } = useStyleTheme();
  const isDark = theme === "dark";
  const styleOptions = availableThemes.map((t) => ({ id: t.id as string | null, label: t.name }));

  return (
    <>
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
              background: active ? "rgba(255,255,255,0.12)" : "none",
              border: "none",
              borderRadius: OPTION_CORNER,
              cursor: "pointer",
              padding: "8px 10px",
              textAlign: "left",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              letterSpacing: "0.04em",
              color: active ? SWATCH_ACTIVE : SWATCH_TEXT,
            }}
          >
            {opt.label}
          </button>
        );
      })}

      {/* Mode — Dark/Light, independent of the style choice above. Hidden entirely while the
          active theme is mode-locked (see the Theme Gallery's lock icon) — it was only ever
          designed for one mode, so there's nothing to toggle to. */}
      {!modeLocked && (
        <>
          <div style={{ height: 1, background: SWATCH_DIVIDER, margin: "5px 4px" }} />
          <div className="flex items-center justify-between" style={{ padding: "6px 10px 2px" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: SWATCH_TEXT, letterSpacing: "0.04em" }}>
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
              <Moon size={11} strokeWidth={2.75} style={{ color: SWATCH_TEXT, marginRight: 6, flexShrink: 0 }} />
              <span style={{ position: "relative", width: TRACK_W, height: TRACK_H, borderRadius: 100, background: SWATCH_TRACK_OFF, flexShrink: 0 }}>
                <span
                  style={{
                    position: "absolute",
                    top: PAD,
                    left: isDark ? PAD : TRACK_W - PAD - THUMB,
                    width: THUMB,
                    height: THUMB,
                    borderRadius: "50%",
                    background: SWATCH_ACTIVE,
                    transition: "left 0.2s ease",
                  }}
                />
              </span>
              <Sun size={11} strokeWidth={2.75} style={{ color: SWATCH_TEXT, marginLeft: 6, flexShrink: 0 }} />
            </button>
          </div>
        </>
      )}
    </>
  );
}

// Style (Square/Rounded — which CSS block applies, see buildAllThemesCss) and mode (Dark/Light —
// unrelated, every color already has its own dark+light pair) are two independent axes living
// under one trigger button/panel for a single, uncluttered nav-bar entry point — but rendered as
// two distinct controls inside, not flattened into one list of 3 interchangeable options. Picking
// a style leaves mode exactly as it was; the mode switch leaves style exactly as it was.
export function ThemeDropdown() {
  const { theme } = useTheme();
  const { styleTheme, availableThemes } = useStyleTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const isDark = theme === "dark";
  // No "Original" entry — the switcher only ever offers named, curated themes now. A visitor who
  // somehow still has styleTheme === null (an old localStorage value, or no CMS default set) just
  // sees the live/default look with nothing highlighted in this list, same as before this existed.
  const currentStyleLabel = availableThemes.find((o) => o.id === styleTheme)?.name ?? "Original";

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
          // Fixed, not theme-driven — see the SWATCH_* comment above for why.
          background: "linear-gradient(135deg, #4F8EF7, #1D4ED8)",
          border: "0.5px solid rgba(237,232,223,0.12)",
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
        <PaintRoller size={15} strokeWidth={2} style={{ color: "#FFFFFF" }} />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 168,
            zIndex: 60,
            background: SWATCH_BG,
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: PANEL_CORNER,
            boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            padding: 6,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <ThemeSwitcherOptions />
        </div>
      )}
    </div>
  );
}
