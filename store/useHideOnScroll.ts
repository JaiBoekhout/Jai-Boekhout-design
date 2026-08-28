"use client";

import { useEffect, useRef, useState } from "react";

// Hides (returns true) once the page has scrolled down continuously past a small
// threshold — the accumulation is what gives the "delay" feel, rather than hiding
// on the very first pixel of downward movement. Any upward scroll shows it again
// immediately. Multiple components can call this independently and stay in sync,
// since it's a pure function of window.scrollY history — no shared state needed.
export function useHideOnScroll(hideAfterPx = 60, armAfterPx = 80) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const downAccum = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;

    function handleScroll() {
      const y = window.scrollY;
      const delta = y - lastY.current;

      if (delta > 0) {
        downAccum.current += delta;
        if (y > armAfterPx && downAccum.current > hideAfterPx) setHidden(true);
      } else if (delta < 0) {
        downAccum.current = 0;
        setHidden(false);
      }
      lastY.current = y;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hideAfterPx, armAfterPx]);

  return hidden;
}
