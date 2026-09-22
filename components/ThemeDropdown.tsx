"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTheme } from "@/store/themeStore";
import { useStyleTheme } from "@/store/styleThemeStore";

const ROUNDED_ID = "playful-rounded";

type Option = "dark" | "light" | "rounded";

// Replaces the old binary day/night switch (ThemeToggle) and the separate style-theme switcher
// (the previous StyleThemeToggle) with one control. "Dark"/"Light" set the mode directly and
// reset style to Original; "Rounded" applies the Playful & Rounded style on top of whatever mode
// is currently active (it has its own light+dark CSS, so it doesn't need to fix one) — see
// buildAllThemesCss() in store/contentStore.ts for why this specific preset always ships,
// unlike a genuinely custom saved theme which stays behind the CMS's publish flow.
export function ThemeDropdown() {
  const { theme, setThemeDirect } = useTheme();
  const { styleTheme, setStyleTheme } = useStyleTheme();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current: Option = styleTheme === ROUNDED_ID ? "rounded" : theme === "light" ? "light" : "dark";

  const options: { id: Option; label: string }[] = [
    { id: "dark", label: "Dark" },
    { id: "light", label: "Light" },
    { id: "rounded", label: "Rounded" },
  ];

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

  function select(id: Option) {
    if (id === "dark") { setThemeDirect("dark"); setStyleTheme(null); }
    else if (id === "light") { setThemeDirect("light"); setStyleTheme(null); }
    else { setStyleTheme(ROUNDED_ID); }
    setOpen(false);
  }

  return (
    <div ref={rootRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Theme"
        className="flex items-center gap-1.5"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "11px 7px",
          margin: "-11px -7px",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: "0.04em",
          color: "var(--c-text-muted)",
        }}
      >
        {options.find((o) => o.id === current)?.label}
        <ChevronDown size={12} strokeWidth={2.5} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            minWidth: 120,
            zIndex: 60,
            background: "var(--c-bg-card)",
            border: "1px solid var(--c-border-soft)",
            borderRadius: "var(--tag-corner)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
            padding: 4,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {options.map((o) => {
            const active = o.id === current;
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => select(o.id)}
                style={{
                  background: active ? "color-mix(in srgb, var(--c-teal) 12%, transparent)" : "none",
                  border: "none",
                  borderRadius: "calc(var(--tag-corner) * 0.6)",
                  cursor: "pointer",
                  padding: "8px 12px",
                  textAlign: "left",
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  letterSpacing: "0.04em",
                  color: active ? "var(--c-teal)" : "var(--c-text)",
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
