"use client";

import { Palette } from "lucide-react";
import { useStyleTheme } from "@/store/styleThemeStore";

// Sits adjacent to ThemeToggle (day/night) rather than folded into it — see styleThemeStore.tsx
// for why they're kept orthogonal. Renders nothing until at least one theme besides the site's
// own live/default look is marked visitor-visible in the CMS, so this stays completely inert
// (and invisible) until "Playful & Rounded" (or any future theme) is actually published for
// visitors to pick.
export function StyleThemeToggle() {
  const { styleTheme, availableThemes, setStyleTheme } = useStyleTheme();

  if (availableThemes.length === 0) return null;

  const options: { id: string | null; name: string }[] = [{ id: null, name: "Original" }, ...availableThemes];

  return (
    <div className="flex items-center gap-1.5" style={{ flexShrink: 0 }}>
      <Palette size={13} strokeWidth={2.75} style={{ color: "var(--c-text-muted)", flexShrink: 0 }} />
      <div className="flex items-center gap-2">
        {options.map((opt) => {
          const active = styleTheme === opt.id;
          return (
            <button
              key={opt.id ?? "original"}
              type="button"
              aria-pressed={active}
              onClick={() => setStyleTheme(opt.id)}
              title={opt.name}
              style={{
                background: "none",
                border: "none",
                padding: "11px 2px",
                margin: "-11px -2px",
                cursor: "pointer",
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                letterSpacing: "0.04em",
                color: active ? "var(--c-teal)" : "var(--c-text-muted)",
                fontWeight: active ? 600 : 400,
              }}
            >
              {opt.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
