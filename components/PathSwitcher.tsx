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

const HOME_KEY = "home";
type NavKey = PathKey | typeof HOME_KEY;

const EASE = [0.4, 0, 0.2, 1] as const;
const SLIDE = 0.34;

// Every button is this size, always — no button ever grows or shrinks. That's what makes the rest
// of this component simple: the bar's width is constant, nothing ever reflows, and the active
// pill is always exactly one button wide so it only ever translates. A highlight that never
// changes size can't be scaled, and a fixed-px border-radius only deforms under scale — which is
// what used to squash the pill into an egg while it moved. Labels moved out to a hover card
// (below) precisely so they can't push this geometry around.
//
// Kept as constants rather than Tailwind spacing classes because the pill is positioned against
// the bar's own padding — expressing that as `top: BAR_PADDING` keeps the two from drifting
// apart the next time this is resized.
//
// WIDTH is set from how much room the highlight actually leaves at the label's height, not from
// the label's width alone: the corner radius is capped at half the HEIGHT, so the highlight is a
// stadium whose curve pinches inward toward the bottom, where the label sits. Measured, the
// shape is only (WIDTH − 14.5)px wide at the label's bottom edge — so at the old 54px the 43.8px
// "Evaluate" overflowed the curve by ~4.4px. Extra width lands entirely in the flat middle of
// the stadium, which is what gives the label clearance (64 → ~49.5px of room, ~3px either side).
//
// Bar total = 2×PADDING + 5×WIDTH + 5×GAP + 1px divider ≈ 344px, which clears a 360px phone.
// Narrower than that, the media query on .path-nav-btn in globals.css shrinks the buttons back;
// the highlight measures its own width from the DOM, so it follows without needing to know.
const BUTTON_WIDTH = 64;
const BUTTON_HEIGHT = 52;
const ICON_SIZE = 20;
const LABEL_SIZE = 11;
const BAR_PADDING = 4;
const BAR_GAP = 3;

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface PathSwitcherProps {
  selectedPath: string;
}

function NavButton({
  icon: Icon,
  label,
  isActive,
  isHovered,
  onClick,
  onHoverStart,
  onHoverEnd,
  buttonRef,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  isActive: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  const buttonCorner = useButtonCorner();
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      aria-current={isActive ? "page" : undefined}
      className="path-nav-btn relative flex flex-col items-center justify-center"
      style={{
        width: BUTTON_WIDTH,
        height: BUTTON_HEIGHT,
        flexShrink: 0,
        gap: 4,
        borderRadius: buttonCorner,
        color: isActive ? "var(--c-teal)" : isHovered ? "var(--c-text)" : "var(--c-text-muted)",
        background: "transparent",
        cursor: "pointer",
        transition: "color 0.2s ease",
      }}
    >
      <Icon size={ICON_SIZE} />
      {/* Inherits the button's colour so it tracks active/hover with the icon. */}
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: LABEL_SIZE,
          lineHeight: 1.1,
          fontWeight: isActive ? 500 : 400,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </button>
  );
}

// Always-visible row of the 4 paths plus Home — icons only; the page name shows in a small card
// above the bar while a button is hovered or keyboard-focused. Clicking any of them navigates
// straight there, replacing the old "Current Path" pill + "Switch Path" round trip via home.
export function PathSwitcher({ selectedPath }: PathSwitcherProps) {
  const router = useRouter();
  const hidden = useHideOnScroll();
  const buttonCorner = useButtonCorner();
  const reduceMotion = useReducedMotion();
  const [hoveredKey, setHoveredKey] = useState<NavKey | null>(null);
  const nudgeControls = useAnimation();
  const [staticHighlight, setStaticHighlight] = useState(false);
  const highlightTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // selectedPath comes from usePathname() in the shared layout, which only updates once Next.js
  // actually commits the new route — so waiting on it made the highlight start moving only after
  // the page had already loaded. pendingKey moves it the instant a path is clicked instead; once
  // the real navigation lands and selectedPath catches up to match, it clears itself.
  const [pendingKey, setPendingKey] = useState<PathKey | null>(null);
  useEffect(() => {
    if (pendingKey && selectedPath === pendingKey) setPendingKey(null);
  }, [selectedPath, pendingKey]);
  const effectivePath = pendingKey ?? selectedPath;

  const navRef = useRef<HTMLElement | null>(null);
  const btnRefs = useRef(new Map<string, HTMLButtonElement>());
  // Width is measured rather than read from BUTTON_WIDTH so the pill can't silently desync from
  // the buttons if they're ever resized (in CSS, or by a Design System change). Every button is
  // the same width, so in practice this value never changes between states — which is what keeps
  // the pill a pure translation, and therefore never scaled or deformed.
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);

  const measure = useCallback(() => {
    const active = btnRefs.current.get(effectivePath);
    setPill(active ? { x: active.offsetLeft, w: active.offsetWidth } : null);
  }, [effectivePath]);

  useIsoLayoutEffect(() => {
    measure();
  }, [measure, buttonCorner]);

  // The bar's geometry is fixed, so this only matters for the rare case of it changing underneath
  // us — a Design System corner/size edit landing, or a late font swap shifting a label's width.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(nav);
    return () => ro.disconnect();
  }, [measure]);

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

  function registerButton(key: NavKey) {
    return (el: HTMLButtonElement | null) => {
      if (el) btnRefs.current.set(key, el);
      else btnRefs.current.delete(key);
    };
  }

  const slide = reduceMotion ? 0 : SLIDE;

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
        <nav
          ref={navRef}
          aria-label="Switch path"
          className="flex items-center"
          style={{
            position: "relative",
            padding: BAR_PADDING,
            gap: BAR_GAP,
            background: "var(--c-bg-glass)",
            border: "1px solid var(--c-border-med)",
            borderRadius: buttonCorner,
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          {/* Active highlight. One element owned by the bar rather than a child of the active
              button, animating only its x — every button is the same size, so it never needs to
              resize and therefore never gets scaled. Sits first in the DOM so the buttons
              (position: relative) paint over it. Hidden on phones (see .path-nav-pill in
              globals.css), where the active icon/label's accent colour carries the state on its
              own and dropping the highlight lets the buttons be narrower. */}
          {pill && (
            <motion.span
              aria-hidden="true"
              className="path-nav-pill"
              initial={false}
              animate={{ x: pill.x, width: pill.w }}
              transition={{ duration: slide, ease: EASE }}
              style={{
                position: "absolute",
                left: 0,
                top: BAR_PADDING,
                height: BUTTON_HEIGHT,
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
            buttonRef={registerButton(HOME_KEY)}
            icon={Home}
            label="Home"
            isActive={false}
            isHovered={hoveredKey === HOME_KEY}
            onClick={() => router.push("/")}
            onHoverStart={() => setHoveredKey(HOME_KEY)}
            onHoverEnd={() => setHoveredKey((cur) => (cur === HOME_KEY ? null : cur))}
          />
          <div style={{ width: 1, alignSelf: "stretch", background: "var(--c-border-med)" }} />

          {PATH_ORDER.map((key) => (
            <NavButton
              key={key}
              buttonRef={registerButton(key)}
              icon={PATH_ICONS[key]}
              label={PATH_DISPLAY_NAMES[key]}
              isActive={effectivePath === key}
              isHovered={hoveredKey === key}
              onClick={() => {
                setPendingKey(key);
                router.push(PATH_URLS[key]);
              }}
              onHoverStart={() => setHoveredKey(key)}
              onHoverEnd={() => setHoveredKey((cur) => (cur === key ? null : cur))}
            />
          ))}

          {staticHighlight && (
            <span
              aria-hidden="true"
              style={{ position: "absolute", inset: -3, borderRadius: buttonCorner, boxShadow: "0 0 0 2px var(--c-teal)", pointerEvents: "none" }}
            />
          )}
        </nav>
      </motion.div>
    </motion.div>
  );
}
