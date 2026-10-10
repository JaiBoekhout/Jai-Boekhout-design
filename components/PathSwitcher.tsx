"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
const NAV_HREFS = ["/", ...PATH_ORDER.map((k) => PATH_URLS[k])];
type NavKey = PathKey | typeof HOME_KEY;

// Every button is this size, always — no button ever grows or shrinks, so the bar's width is
// constant and nothing ever reflows. There's no active highlight any more; the current page is
// shown by the accent colour on its own icon and label, which is what let the whole measure/
// position/animate apparatus that used to sit behind that highlight come out.
//
// Bar total = 2×PADDING + 5×WIDTH + 5×GAP + 1px divider ≈ 344px. That's wider than the narrowest
// phones, so the media query on .path-nav-btn in globals.css narrows the buttons below 768px —
// the labels only need to clear themselves, so there's room to give back there.
const BUTTON_WIDTH = 64;
const BUTTON_HEIGHT = 52;
const ICON_SIZE = 20;
const LABEL_SIZE = 11;
const BAR_PADDING = 4;
const BAR_GAP = 3;

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
  onPointerDown,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  isActive: boolean;
  isHovered: boolean;
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onPointerDown: () => void;
}) {
  const buttonCorner = useButtonCorner();
  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={onPointerDown}
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

// Always-visible row of the 4 paths plus Home, each an icon over its page name. Clicking any of
// them navigates straight there, replacing the old "Current Path" pill + "Switch Path" round trip
// via home. The current page is shown by the accent colour on its own icon and label — there's no
// separate highlight element behind them.
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
  const [pendingKey, setPendingKey] = useState<NavKey | null>(null);
  useEffect(() => {
    if (pendingKey && selectedPath === pendingKey) setPendingKey(null);
  }, [selectedPath, pendingKey]);
  const effectivePath = pendingKey ?? selectedPath;

  // Every destination in this bar is a statically-prerendered route, so router.prefetch() pulls
  // the whole thing and the later click is a cache hit with no network wait at all. Without it
  // each first visit to a path paid 400-800ms of pure waiting on a throttled connection — the
  // route payload was only requested once the button was clicked, and measurements showed the
  // page painted the instant it arrived, so the delay was entirely fetch, not render.
  //
  // <Link> would do this automatically, but these are buttons (they drive an optimistic active
  // state and a hover colour), so the prefetch has to be explicit. Deduped because prefetch is
  // called from hover, focus, touch AND the idle sweep below, and would otherwise refire on
  // every pointer movement across the bar.
  const prefetched = useRef(new Set<string>());
  const prefetch = useCallback(
    (href: string) => {
      if (prefetched.current.has(href)) return;
      prefetched.current.add(href);
      router.prefetch(href);
    },
    [router]
  );

  // Warm all five once the browser is idle, so even a first click is instant. Skipped entirely on
  // Save-Data or a 2G-class connection: five route payloads is real bandwidth, and on exactly
  // those connections the hover/focus/touch prefetches above still cover the route the visitor is
  // actually heading for.
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? "")) return;

    let cancelled = false;
    const run = () => { if (!cancelled) NAV_HREFS.forEach(prefetch); };
    const idle = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (h: number) => void;
    };
    const handle = idle.requestIdleCallback
      ? idle.requestIdleCallback(run, { timeout: 3000 })
      : window.setTimeout(run, 1500);
    return () => {
      cancelled = true;
      if (idle.cancelIdleCallback) idle.cancelIdleCallback(handle);
      else clearTimeout(handle);
    };
  }, [prefetch]);

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
          aria-label="Switch path"
          className="flex items-center"
          style={{
            position: "relative",
            padding: BAR_PADDING,
            gap: BAR_GAP,
            background: "var(--c-bg-glass)",
            // Accent outline + a soft halo of the same colour. The previous hairline in
            // --c-border-med sat close enough to the page background that reviewers reported
            // overlooking the nav entirely — which matters more here than on most chrome, since
            // this bar IS the site's navigation. Both tones derive from --c-teal (the live theme
            // accent) via color-mix, so every theme gets its own outline rather than a hardcoded
            // colour, and the halo stays soft enough not to be confused with the solid 2px accent
            // ring the hamburger's nudge throws (staticHighlight below).
            border: "2.25px solid color-mix(in srgb, var(--c-teal) 55%, transparent)",
            borderRadius: buttonCorner,
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 4.5px color-mix(in srgb, var(--c-teal) 14%, transparent)",
          }}
        >
          {/* Home — not a PathKey (it isn't one of the 4 CMS-driven experience paths), so it's
              rendered standalone rather than folded into PATH_ORDER. It CAN be the active entry:
              the bar renders on the homepage now as well, which is where visitors kept missing
              that site navigation existed at all. */}
          <NavButton
            icon={Home}
            label="Home"
            isActive={effectivePath === HOME_KEY}
            isHovered={hoveredKey === HOME_KEY}
            onClick={() => {
              setPendingKey(HOME_KEY);
              router.push("/");
            }}
            onHoverStart={() => { setHoveredKey(HOME_KEY); prefetch("/"); }}
            onPointerDown={() => prefetch("/")}
            onHoverEnd={() => setHoveredKey((cur) => (cur === HOME_KEY ? null : cur))}
          />
          <div style={{ width: 1, alignSelf: "stretch", background: "var(--c-border-med)" }} />

          {PATH_ORDER.map((key) => (
            <NavButton
              key={key}
              icon={PATH_ICONS[key]}
              label={PATH_DISPLAY_NAMES[key]}
              isActive={effectivePath === key}
              isHovered={hoveredKey === key}
              onClick={() => {
                setPendingKey(key);
                router.push(PATH_URLS[key]);
              }}
              onHoverStart={() => { setHoveredKey(key); prefetch(PATH_URLS[key]); }}
              onPointerDown={() => prefetch(PATH_URLS[key])}
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
