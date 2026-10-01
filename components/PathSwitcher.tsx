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
const BUTTON_SIZE = 48;
const ICON_SIZE = 20;
const BAR_PADDING = 8;
const BAR_GAP = 8;

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

interface PathSwitcherProps {
  selectedPath: string;
}

function NavButton({
  icon: Icon,
  label,
  isActive,
  onClick,
  onHoverStart,
  onHoverEnd,
  buttonRef,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  isActive: boolean;
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
      aria-label={label}
      className="relative flex items-center justify-center"
      style={{
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        flexShrink: 0,
        borderRadius: buttonCorner,
        color: isActive ? "var(--c-teal)" : "var(--c-text-muted)",
        background: "transparent",
        cursor: "pointer",
        transition: "color 0.2s ease",
      }}
    >
      <Icon size={ICON_SIZE} />
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
  const [pillX, setPillX] = useState<number | null>(null);
  // Held separately from hoveredKey so the card keeps rendering its last label while fading out,
  // rather than blanking the text mid-fade.
  const [tip, setTip] = useState<{ x: number; label: string } | null>(null);

  const measure = useCallback(() => {
    const active = btnRefs.current.get(effectivePath);
    setPillX(active ? active.offsetLeft : null);
    if (hoveredKey) {
      const el = btnRefs.current.get(hoveredKey);
      const label = hoveredKey === HOME_KEY ? "Home" : PATH_DISPLAY_NAMES[hoveredKey as PathKey];
      if (el) setTip({ x: el.offsetLeft + el.offsetWidth / 2, label });
    }
  }, [effectivePath, hoveredKey]);

  useIsoLayoutEffect(() => {
    measure();
  }, [measure, buttonCorner]);

  // The bar's geometry is fixed, so this only matters for the rare case of it changing underneath
  // us — a Design System corner/size edit landing, or a late font swap shifting the card's width.
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
        {/* Hover card. Absolutely positioned so it never affects the bar's layout, and it slides
            along as you move across the icons rather than popping per button. The outer element
            owns the horizontal position; the inner one centres itself on that point and handles
            the fade, so the two transforms don't fight over the same property. */}
        {tip && (
          <motion.div
            aria-hidden="true"
            initial={false}
            animate={{ x: tip.x }}
            transition={{ duration: slide, ease: EASE }}
            style={{ position: "absolute", left: 0, bottom: "100%", marginBottom: 12, pointerEvents: "none" }}
          >
            <motion.div
              initial={false}
              animate={{ opacity: hoveredKey ? 1 : 0, y: hoveredKey ? 0 : 4 }}
              transition={{ duration: reduceMotion ? 0 : 0.18, ease: EASE }}
              style={{
                x: "-50%",
                padding: "6px 14px",
                borderRadius: buttonCorner,
                background: "var(--c-bg-glass)",
                border: "1px solid var(--c-border-med)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 6px 20px rgba(0,0,0,0.45)",
                fontFamily: "var(--font-body)",
                fontSize: 14,
                fontWeight: 500,
                lineHeight: 1.3,
                color: "var(--c-teal)",
                whiteSpace: "nowrap",
              }}
            >
              {tip.label}
            </motion.div>
          </motion.div>
        )}

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
              (position: relative) paint over it. */}
          {pillX !== null && (
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ x: pillX }}
              transition={{ duration: slide, ease: EASE }}
              style={{
                position: "absolute",
                left: 0,
                top: BAR_PADDING,
                width: BUTTON_SIZE,
                height: BUTTON_SIZE,
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
