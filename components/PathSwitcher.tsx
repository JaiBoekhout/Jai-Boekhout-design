"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useAnimation, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { Home, Briefcase, UserCheck, Workflow, BookOpen } from "lucide-react";
import { PATH_URLS, PATH_DISPLAY_NAMES, type PathKey } from "@/lib/paths";
import { useHideOnScroll } from "@/store/useHideOnScroll";
import { useButtonCorner } from "@/components/SiteKit";

const PATH_ORDER: PathKey[] = ["work", "recruit", "process", "story"];
const PATH_ICONS: Record<PathKey, React.ComponentType<{ size?: number }>> = {
  work: Briefcase,
  recruit: UserCheck,
  process: Workflow,
  story: BookOpen,
};

const EASE = [0.4, 0, 0.2, 1] as const;
const DURATION = 0.4;

// Reserved min-width for whichever button is currently active — covers icon + gap + the longest
// label ("Evaluate") + padding, with headroom. Fixed rather than content-sized for two reasons:
// the bar's width doesn't shift when a shorter/longer label becomes active, and (because the
// active width is therefore always identical) switching paths grows one button by exactly as
// much as it shrinks the other, leaving the bar's total width unchanged mid-transition.
const ACTIVE_BUTTON_MIN_WIDTH = 116;

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface PathSwitcherProps {
  selectedPath: string;
}

interface NavButtonProps {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  isActive: boolean;
  isExpanded: boolean;
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}

// Shared rendering for every button in the bar (the 4 paths, plus the standalone Home button
// below) — icon-only at rest, label expands on hover or while active, same treatment for both
// so Home doesn't read as a visually distinct bolt-on.
//
// Two things here are deliberate and load-bearing:
//
// 1. The label's width is set as a plain style (auto / 0), NOT animated via Framer. `layout`
//    below smooths the resulting size change visually using a transform, which means the real
//    CSS layout is already final on the very first frame — so PathSwitcher can measure a
//    button's true final offsetLeft/offsetWidth immediately rather than reading a half-animated
//    box. Animating the width directly instead would make every measurement stale.
//
// 2. `layout` scales this button during that smoothing, and a scale applies to descendants too.
//    The icon and the label text get layout="position" so Framer counter-scales them and they
//    translate instead of squashing. (This is also exactly why the active-state pill is NOT
//    rendered in here — see PathSwitcher: a fixed-px border-radius inside a horizontally
//    scaling box renders as an ellipse, which is what made the pill look egg-shaped mid-slide.)
function NavButton({ icon: Icon, label, isActive, isExpanded, onClick, onHoverStart, onHoverEnd, buttonRef }: NavButtonProps) {
  const buttonCorner = useButtonCorner();
  return (
    <motion.button
      ref={buttonRef}
      layout
      type="button"
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      aria-current={isActive ? "page" : undefined}
      aria-label={label}
      className="relative flex items-center justify-center"
      transition={{ layout: { duration: DURATION, ease: EASE } }}
      style={{
        borderRadius: buttonCorner,
        color: isActive ? "var(--c-teal)" : "var(--c-text-muted)",
        padding: "9px 11px",
        gap: isExpanded ? 9 : 0,
        minWidth: isActive ? ACTIVE_BUTTON_MIN_WIDTH : undefined,
        background: "transparent",
        cursor: "pointer",
        transition: "color 0.25s ease",
      }}
    >
      <motion.span layout="position" className="flex" style={{ lineHeight: 0 }}>
        <Icon size={16} />
      </motion.span>
      <motion.span
        layout
        className="flex items-center overflow-hidden whitespace-nowrap"
        animate={{ opacity: isExpanded ? 1 : 0 }}
        transition={{ opacity: { duration: 0.25, ease: EASE }, layout: { duration: DURATION, ease: EASE } }}
        style={{ width: isExpanded ? "auto" : 0 }}
      >
        <motion.span layout="position" style={{ fontSize: 13, fontFamily: "var(--font-body)" }}>
          {label}
        </motion.span>
      </motion.span>
    </motion.button>
  );
}

// Always-visible row of the 4 paths (icon-only at rest, label expands on hover — or, on touch,
// only for whichever path is currently active, since there's no hover state to expand the
// others) — clicking any of them navigates straight there. Replaces the old "Current Path" pill
// + a "Switch Path" button that only ever routed home to re-choose from the path cards there;
// this collapses that extra hop into a single click, same as any other icon nav bar.
const HOME_HOVER_KEY = "home";

interface PillBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function PathSwitcher({ selectedPath }: PathSwitcherProps) {
  const router = useRouter();
  const hidden = useHideOnScroll();
  const buttonCorner = useButtonCorner();
  const reduceMotion = useReducedMotion();
  const [hoveredKey, setHoveredKey] = useState<PathKey | typeof HOME_HOVER_KEY | null>(null);
  const nudgeControls = useAnimation();
  const [staticHighlight, setStaticHighlight] = useState(false);
  const highlightTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // selectedPath comes from usePathname() in the shared layout, which only updates once Next.js
  // actually commits the new route — so waiting on it made the slide start only after the page
  // had already loaded. pendingKey flips the highlight the instant a path is clicked instead;
  // once the real navigation lands and selectedPath catches up to match, it clears itself.
  const [pendingKey, setPendingKey] = useState<PathKey | null>(null);
  useEffect(() => {
    if (pendingKey && selectedPath === pendingKey) setPendingKey(null);
  }, [selectedPath, pendingKey]);
  const effectivePath = pendingKey ?? selectedPath;

  // ── Active-state pill ───────────────────────────────────────────────────────
  // Rendered here as one overlay owned by the bar, rather than as a child of whichever button
  // is active. That placement is the whole point: a button shrinking from its active width back
  // to icon-only is a ~3x horizontal scale, and anything inside it scales too — a fixed-px
  // border-radius under a horizontal-only scale draws as an ellipse, so the pill visibly
  // deformed into an egg every time it moved. Out here it animates its own real x/y/width/height
  // instead, so the browser renders a genuinely correct rounded box on every frame.
  //
  // Measuring (rather than hardcoding the row's geometry) keeps this honest if padding, gaps,
  // icon size or the font scale ever change. offsetLeft/offsetWidth report the settled layout
  // and ignore the in-flight `layout` transforms, so one measurement per state change is exact.
  const navRef = useRef<HTMLElement | null>(null);
  const btnRefs = useRef(new Map<string, HTMLButtonElement>());
  const [pill, setPill] = useState<PillBox | null>(null);

  const measurePill = useCallback(() => {
    const el = btnRefs.current.get(effectivePath);
    if (!el) {
      setPill(null);
      return;
    }
    const next: PillBox = { x: el.offsetLeft, y: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
    setPill((prev) =>
      prev && prev.x === next.x && prev.y === next.y && prev.width === next.width && prev.height === next.height
        ? prev
        : next
    );
  }, [effectivePath]);

  useIsoLayoutEffect(() => {
    measurePill();
  }, [measurePill, hoveredKey, buttonCorner]);

  // Catch-all for size changes that aren't driven by this component's own state — font-scale
  // changes, a Design System edit landing, late webfont swap.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measurePill());
    ro.observe(nav);
    return () => ro.disconnect();
  }, [measurePill]);

  // HamburgerEasterEgg (app/(public)/(experience)/layout.tsx's header, a sibling of this
  // component — not an ancestor/descendant) dispatches this on open, pointing the joke at the
  // real nav. Reduced motion gets a brief static ring instead of the scale bounce, per the brief.
  useEffect(() => {
    function onNudge() {
      if (reduceMotion) {
        setStaticHighlight(true);
        if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
        highlightTimeout.current = setTimeout(() => setStaticHighlight(false), 1200);
      } else {
        nudgeControls.start({ scale: [1, 1.09, 1, 1.09, 1, 1.09, 1], transition: { duration: 1.5, ease: "easeInOut" } });
      }
    }
    window.addEventListener("nudge-bottom-nav", onNudge);
    return () => {
      window.removeEventListener("nudge-bottom-nav", onNudge);
      if (highlightTimeout.current) clearTimeout(highlightTimeout.current);
    };
  }, [reduceMotion, nudgeControls]);

  function registerButton(key: string) {
    return (el: HTMLButtonElement | null) => {
      if (el) btnRefs.current.set(key, el);
      else btnRefs.current.delete(key);
    };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: "-50%" }}
      animate={{ opacity: hidden ? 0 : 1, y: hidden ? 40 : 0, x: "-50%" }}
      exit={{ opacity: 0, y: 20, x: "-50%" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ pointerEvents: hidden ? "none" : "auto" }}
      className="fixed bottom-8 left-1/2 z-50"
    >
      <motion.div animate={nudgeControls} style={{ display: "inline-block", position: "relative" }}>
        <motion.nav
          ref={navRef}
          layout
          transition={{ layout: { duration: DURATION, ease: EASE } }}
          aria-label="Switch path"
          className="flex items-center gap-1.5 p-1.5"
          style={{
            position: "relative",
            background: "var(--c-bg-glass)",
            border: "1px solid var(--c-border-med)",
            borderRadius: buttonCorner,
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {/* Sits first in the DOM so the buttons (position: relative) paint over it. */}
          {pill && (
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ x: pill.x, y: pill.y, width: pill.width, height: pill.height }}
              transition={{ duration: DURATION, ease: EASE }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                borderRadius: buttonCorner,
                border: "1px solid var(--c-teal)",
                background: "color-mix(in srgb, var(--c-teal) 12%, transparent)",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Home — not a PathKey (it isn't one of the 4 CMS-driven experience paths), so it's
              rendered standalone rather than folded into PATH_ORDER; it's also never "active"
              since this bar only ever renders on an experience page, never on the homepage
              itself. */}
          <NavButton
            icon={Home}
            label="Home"
            isActive={false}
            isExpanded={hoveredKey === HOME_HOVER_KEY}
            onClick={() => router.push("/")}
            onHoverStart={() => setHoveredKey(HOME_HOVER_KEY)}
            onHoverEnd={() => setHoveredKey((cur) => (cur === HOME_HOVER_KEY ? null : cur))}
          />
          <div style={{ width: 1, alignSelf: "stretch", background: "var(--c-border-med)" }} />

          {PATH_ORDER.map((key) => {
            const isActive = effectivePath === key;
            const isExpanded = isActive || hoveredKey === key;
            return (
              <NavButton
                key={key}
                buttonRef={registerButton(key)}
                icon={PATH_ICONS[key]}
                label={PATH_DISPLAY_NAMES[key]}
                isActive={isActive}
                isExpanded={isExpanded}
                onClick={() => {
                  setPendingKey(key);
                  router.push(PATH_URLS[key]);
                }}
                onHoverStart={() => setHoveredKey(key)}
                onHoverEnd={() => setHoveredKey((cur) => (cur === key ? null : cur))}
              />
            );
          })}

          {staticHighlight && (
            <span
              aria-hidden="true"
              style={{ position: "absolute", inset: -3, borderRadius: buttonCorner, boxShadow: "0 0 0 2px var(--c-teal)", pointerEvents: "none" }}
            />
          )}
        </motion.nav>
      </motion.div>
    </motion.div>
  );
}
