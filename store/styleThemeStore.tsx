"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useContentStore, THEME_PRESETS } from "@/store/contentStore";
import { useTheme, THEME_STORAGE_KEY } from "@/store/themeStore";

const STORAGE_KEY = "portfolio_style_theme";

interface StyleThemeContextValue {
  /** null = "Original" — the site's live/default look, no data-style-theme attribute set. */
  styleTheme: string | null;
  /** Every THEME_PRESETS entry in visiblePresetIds, plus every savedThemes entry flagged
   *  visitor-visible — combined, in that order. */
  availableThemes: { id: string; name: string; defaultMode?: "dark" | "light"; lockMode?: boolean }[];
  setStyleTheme: (id: string | null) => void;
  /** True when the currently active style theme has lockMode set — ThemeDropdown hides the
   *  Dark/Light switch entirely while this is true, since the theme was only ever designed for
   *  one mode. */
  modeLocked: boolean;
}

const StyleThemeContext = createContext<StyleThemeContextValue>({
  styleTheme: null,
  availableThemes: [],
  setStyleTheme: () => {},
  modeLocked: false,
});

// Deliberately separate from ThemeProvider (dark/light) rather than folding into it — day/night
// and "which style theme" are orthogonal (every theme's colors already have their own dark+light
// pair, see buildAllThemesCss in store/contentStore.ts), so one control shouldn't have to mean
// two unrelated things. Same mechanical pattern as ThemeProvider otherwise: a data-* attribute on
// <html>, persisted to its own localStorage key, applied via a blocking inline script in
// layout.tsx before hydration (see the second InlineScript there) so there's no flash of the
// wrong style theme on load, same as day/night already avoids.
export function StyleThemeProvider({ children }: { children: React.ReactNode }) {
  const { content } = useContentStore();
  const { setThemeDirect } = useTheme();
  const visiblePresetIds = content.designSystem.visiblePresetIds ?? [];
  const nameOverrides = content.designSystem.presetNameOverrides ?? {};
  const presetOverrides = content.designSystem.presetOverrides ?? {};
  const visiblePresets = THEME_PRESETS.filter((t) => visiblePresetIds.includes(t.id))
    .map((t) => ({ id: t.id, name: nameOverrides[t.id] ?? t.name, defaultMode: presetOverrides[t.id]?.defaultMode, lockMode: presetOverrides[t.id]?.lockMode }));
  const visibleSaved = (content.designSystem.savedThemes ?? [])
    .filter((t) => t.visible)
    .map((t) => ({ id: t.id, name: t.name, defaultMode: t.defaultMode, lockMode: t.lockMode }));
  const availableThemes = [...visiblePresets, ...visibleSaved];
  const defaultThemeId = content.designSystem.defaultVisitorThemeId ?? null;

  const [styleTheme, setStyleThemeState] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial = stored || defaultThemeId;
    setStyleThemeState(initial);
    if (initial) document.documentElement.setAttribute("data-style-theme", initial);
    else document.documentElement.removeAttribute("data-style-theme");

    // A first-time visitor (no explicit mode choice saved yet) lands on whichever mode the
    // resolved theme is configured to default to, if any. This runs as ThemeProvider's own mount
    // effect's *child* effect (StyleThemeProvider is always nested inside ThemeProvider), so it
    // commits first — ThemeProvider's effect then reads the localStorage value this just wrote,
    // rather than clobbering it back to "dark". A visitor who already picked a mode is never
    // overridden here — unless the resolved theme is mode-locked, in which case it always wins,
    // even over a mode the visitor picked on some earlier, different theme.
    const info = availableThemes.find((t) => t.id === initial);
    if (initial && info?.defaultMode && (info.lockMode || !localStorage.getItem(THEME_STORAGE_KEY))) {
      setThemeDirect(info.defaultMode);
    }
    // Only ever meant to run once per page load (matches ThemeProvider's mount-only effect) —
    // defaultThemeId changing later (a live CMS edit) shouldn't yank a visitor who already chose
    // something out of their own pick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setStyleTheme(id: string | null) {
    setStyleThemeState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
      document.documentElement.setAttribute("data-style-theme", id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      document.documentElement.removeAttribute("data-style-theme");
    }
    // Explicitly picking a theme in the switcher applies its configured default mode too, same as
    // landing on it as a first-time visitor — but here it always wins, since choosing a theme is
    // itself an explicit action.
    const mode = id ? availableThemes.find((t) => t.id === id)?.defaultMode : undefined;
    if (mode) setThemeDirect(mode);
  }

  const modeLocked = !!availableThemes.find((t) => t.id === styleTheme)?.lockMode;

  return (
    <StyleThemeContext.Provider value={{ styleTheme, availableThemes, setStyleTheme, modeLocked }}>
      {children}
    </StyleThemeContext.Provider>
  );
}

export function useStyleTheme() {
  return useContext(StyleThemeContext);
}
