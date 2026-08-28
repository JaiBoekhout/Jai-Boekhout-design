"use client";

import { createContext, useContext, useEffect, useState } from "react";

// 0 = default (100%), 1 = large (112.5%), 2 = larger (125%) — mirrors the Design System's own
// Minor Third / Major Third / Perfect Fourth type-scale labels in spirit, but deliberately
// doesn't reuse those ratios: that field only stretches heading sizes apart from body text (see
// computeTypeScaleSizes in store/contentStore.ts) and would leave paragraph copy unchanged while
// shrinking small print. This is a true uniform zoom instead, so it actually helps readability.
export type FontScale = 0 | 1 | 2;

export const FONT_SCALE_PERCENT: Record<FontScale, number> = { 0: 100, 1: 112.5, 2: 125 };
const STORAGE_KEY = "portfolio_font_scale";

interface FontScaleContextValue {
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
}

const FontScaleContext = createContext<FontScaleContextValue>({ fontScale: 0, setFontScale: () => {} });

function applyFontScale(scale: FontScale) {
  // A true visual zoom rather than a root font-size percentage: this codebase styles text with
  // literal px values throughout (not rem), so scaling the rem base would do nothing — zoom
  // scales everything (text, spacing, icons) together regardless of unit, the same way browser
  // pinch-zoom does, and — applied at the document root rather than some inner wrapper — doesn't
  // break position:fixed/sticky elements the way wrapping a div in `transform: scale` would.
  document.documentElement.style.zoom = `${FONT_SCALE_PERCENT[scale]}%`;
}

export function FontScaleProvider({ children }: { children: React.ReactNode }) {
  const [fontScale, setFontScaleState] = useState<FontScale>(0);

  useEffect(() => {
    const stored = parseInt(localStorage.getItem(STORAGE_KEY) ?? "0", 10);
    const initial: FontScale = stored === 1 || stored === 2 ? stored : 0;
    setFontScaleState(initial);
    applyFontScale(initial);
  }, []);

  function setFontScale(next: FontScale) {
    setFontScaleState(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    applyFontScale(next);
  }

  return (
    <FontScaleContext.Provider value={{ fontScale, setFontScale }}>
      {children}
    </FontScaleContext.Provider>
  );
}

export function useFontScale() {
  return useContext(FontScaleContext);
}
