"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useContentStore, THEME_PRESETS } from "@/store/contentStore";

const STORAGE_KEY = "portfolio_style_theme";

interface StyleThemeContextValue {
  /** null = "Original" — the site's live/default look, no data-style-theme attribute set. */
  styleTheme: string | null;
  /** Every THEME_PRESETS entry in visiblePresetIds, plus every savedThemes entry flagged
   *  visitor-visible — combined, in that order. */
  availableThemes: { id: string; name: string }[];
  setStyleTheme: (id: string | null) => void;
}

const StyleThemeContext = createContext<StyleThemeContextValue>({
  styleTheme: null,
  availableThemes: [],
  setStyleTheme: () => {},
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
  const visiblePresetIds = content.designSystem.visiblePresetIds ?? [];
  const nameOverrides = content.designSystem.presetNameOverrides ?? {};
  const visiblePresets = THEME_PRESETS.filter((t) => visiblePresetIds.includes(t.id))
    .map((t) => ({ id: t.id, name: nameOverrides[t.id] ?? t.name }));
  const visibleSaved = (content.designSystem.savedThemes ?? [])
    .filter((t) => t.visible)
    .map((t) => ({ id: t.id, name: t.name }));
  const availableThemes = [...visiblePresets, ...visibleSaved];
  const defaultThemeId = content.designSystem.defaultVisitorThemeId ?? null;

  const [styleTheme, setStyleThemeState] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const initial = stored || defaultThemeId;
    setStyleThemeState(initial);
    if (initial) document.documentElement.setAttribute("data-style-theme", initial);
    else document.documentElement.removeAttribute("data-style-theme");
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
  }

  return (
    <StyleThemeContext.Provider value={{ styleTheme, availableThemes, setStyleTheme }}>
      {children}
    </StyleThemeContext.Provider>
  );
}

export function useStyleTheme() {
  return useContext(StyleThemeContext);
}
