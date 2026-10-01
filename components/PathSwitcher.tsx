"use client";

import { useEffect, useRef, useState } from "react";
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

// Reserved width for whichever path is currently active, sized for the longest label ("Evaluate")
// plus headroom — fixed rather than auto-sized so the bar's total width doesn't shift when a
// shorter/longer label (e.g. "Story" vs "Evaluate") becomes the active one. Hover-only previews
// on an inactive button still size to their own content, since those are transient, not the
// resting state.
const ACTIVE_LABEL_WIDTH = 80;

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
}

// Shared rendering for every button in the bar (the 4 paths, plus the standalone Home button
// below) — icon-only at rest, label expands on hover or while active, same treatment for both
// so Home doesn't read as a visually distinct bolt-on.
//
// motion.button + layout (also on the <nav> wrapper below) rather than a plain <button>: any
// button's width changing reflows every button after it in the row (normal flex behavior), and
// without `layout` that reflow just snaps instantly — only the button whose own width/gap was
// explicitly animated moved smoothly, while its neighbors visibly jumped to their new position
// in one frame. `layout` makes Framer Motion animate that repositioning too, for every button,
// not just the one being directly expanded/collapsed.
function NavButton({ icon: Icon, label, isActive, isExpanded, onClick, onHoverStart, onHoverEnd }: NavButtonProps) {
  const buttonCorner = useButtonCorner();
  return (
    <motion.button
      layout
      type="button"
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      aria-current={isActive ? "page" : undefined}
      aria-label={label}
      className="relative flex items-center transition-colors"
      transition={{ layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
      style={{
        borderRadius: buttonCorner,
        color: isActive ? "var(--c-teal)" : "var(--c-text-muted)",
        padding: "9px 11px",
        gap: isExpanded ? 9 : 0,
        cursor: "pointer",
        transition: "color 0.25s ease, gap 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Shared layoutId — rather than each button fading its own background in/out, this one
          element is what actually exists, and Framer Motion animates its position/size as it
          moves from the previously-active button to this one, producing a sliding highlight
          instead of a cross-fade. Icon/label below need position:relative to paint above it —
          an absolutely-positioned sibling always paints over non-positioned flex children
          regardless of DOM order, so without that they'd be covered by this on the active tab. */}
      {isActive && (
        <motion.span
          layoutId="nav-active-pill"
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            borderRadius: buttonCorner,
            border: "1px solid var(--c-teal)",
            background: "color-mix(in srgb, var(--c-teal) 12%, transparent)",
          }}
          transition={{ type: "spring", stiffness: 500, damping: 34 }}
        />
      )}
      <span className="relative flex" style={{ lineHeight: 0 }}>
        <Icon size={16} />
      </span>
      <motion.span
        className="relative flex items-center overflow-hidden whitespace-nowrap"
        initial={false}
        animate={{ width: isActive ? ACTIVE_LABEL_WIDTH : isExpanded ? "auto" : 0, opacity: isExpanded ? 1 : 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <span style={{ fontSize: 13, fontFamily: "var(--font-body)" }}>{label}</span>
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
        <motion.nav
          layout
          transition={{ layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }}
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
