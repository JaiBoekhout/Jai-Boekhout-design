"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Hides (returns true) once the page has scrolled down continuously past a small
// threshold — the accumulation is what gives the "delay" feel, rather than hiding
// on the very first pixel of downward movement. Any upward scroll shows it again
// immediately. Multiple components can call this independently and stay in sync,
// since it's a pure function of scroll history — no shared state needed.
//
// "The page" deliberately means whatever is actually scrolling, not just the window. The project
// popup (ProjectDetailChrome) is a position:fixed panel whose content scrolls in its own
// overflow-y-auto box on mobile, so a window-only listener never heard a thing: open a project
// with the bottom nav showing and it sat pinned over the content for the entire read. Scroll
// events don't bubble, but they DO propagate through the capture phase, so one capture listener
// on the document hears every scroller on the page, nested ones included.
//
// Each scroller keeps its own last-position/accumulator entry rather than sharing one, because
// their scroll offsets are unrelated numbers: comparing the popup's scrollTop against the page's
// scrollY would read as a huge jump in whichever direction the two happened to differ. Keeping
// them separate also means an incidental scroll elsewhere (the Work page's horizontally-scrolling
// filter row, say) can't wipe out the progress the real scroller had accumulated — and since a
// horizontal-only container's scrollTop never moves, it reports a zero delta and is ignored.
export function useHideOnScroll(hideAfterPx = 60, armAfterPx = 80) {
  const [hidden, setHidden] = useState(false);
  // WeakMap so a scroller that unmounts (every project popup the visitor opens) doesn't keep its
  // entry alive here.
  const scrollers = useRef(new WeakMap<object, { lastY: number; downAccum: number }>());
  const pathname = usePathname();

  // Show again on every navigation, and re-baseline the document against wherever the new route
  // starts. Without this the nav could strand itself: hiding is driven by the popup's own
  // scroller, but once the popup closes that scroller is gone, so nothing can ever report the
  // upward movement that would bring the nav back — and if the page underneath was never
  // scrolled (opening a project straight from the top of /work, the common case) there's no
  // window scrolling left to do either. The nav simply stayed hidden for good. Resetting per
  // route also matches what the chrome should do on any normal page change.
  useEffect(() => {
    setHidden(false);
    scrollers.current.set(document, { lastY: window.scrollY, downAccum: 0 });
  }, [pathname]);

  useEffect(() => {
    // Seed the document's entry up front so its very first scroll event already has a baseline to
    // measure against, exactly as the old window-only version did. Every other scroller gets
    // seeded lazily on its first event instead, since it may not exist yet (or ever).
    scrollers.current.set(document, { lastY: window.scrollY, downAccum: 0 });

    // The document scrolls via window.scrollY, but reports its scroll event with a target of
    // `document` (or the scrolling element) — neither of which carries a useful scrollTop.
    function offsetOf(target: EventTarget | null): number | null {
      if (!target) return null;
      if (target === document || target === window || target === document.scrollingElement) {
        return window.scrollY;
      }
      if (!(target instanceof HTMLElement)) return null;
      return target.scrollTop;
    }

    function handleScroll(e: Event) {
      const target = e.target;
      const y = offsetOf(target);
      if (y === null) return;

      const key = (target === document || target === window ? document : target) as object;
      let state = scrollers.current.get(key);
      if (!state) {
        // First event from this scroller — record where it started rather than treating its
        // current offset as one giant delta from zero.
        state = { lastY: y, downAccum: 0 };
        scrollers.current.set(key, state);
        return;
      }

      const delta = y - state.lastY;
      state.lastY = y;

      if (delta > 0) {
        state.downAccum += delta;
        if (y > armAfterPx && state.downAccum > hideAfterPx) setHidden(true);
      } else if (delta < 0) {
        state.downAccum = 0;
        setHidden(false);
      }
    }

    document.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    return () => document.removeEventListener("scroll", handleScroll, { capture: true });
  }, [hideAfterPx, armAfterPx]);

  return hidden;
}
