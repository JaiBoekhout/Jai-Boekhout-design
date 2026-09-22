"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

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
    const stored = localStorage.getItem("portfolio_theme") as Theme | null;
    const initial = stored ?? "dark";
    setTheme(initial);
    document.documentElement.setAttribute("data-theme", initial);
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    localStorage.setItem("portfolio_theme", next);
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
