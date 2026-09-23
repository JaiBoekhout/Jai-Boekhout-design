"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

// Exported so styleThemeStore.tsx can check/write the same key when a theme's own configured
// defaultMode needs to apply (first-time visitor, or an explicit style switch) without duplicating
// the literal and risking the two drifting apart.
export const THEME_STORAGE_KEY = "portfolio_theme";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
  /** Sets the mode directly rather than flipping it — needed by ThemeDropdown's 3-option control,
   *  where picking "Dark" or "Light" must land on that exact mode regardless of the current one. */
  setThemeDirect: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({ theme: "dark", toggle: () => {}, setThemeDirect: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
    const initial = stored ?? "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    document.documentElement.setAttribute("data-theme", next);
  }

  function toggle() {
    apply(theme === "dark" ? "light" : "dark");
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle, setThemeDirect: apply }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
