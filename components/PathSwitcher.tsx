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

interface PathSwitcherProps {
  selectedPath: string;
}

interface NavButtonProps {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  isActive: boolean;
  isExpanded: boolean;
  eyebrow?: string;
  onClick: () => void;
  onHoverStart: () => void;
  onHoverEnd: () => void;
}

// Shared rendering for every button in the bar (the 4 paths, plus the standalone Home button
// below) — icon-only at rest, label expands on hover or while active, same treatment for both
// so Home doesn't read as a visually distinct bolt-on.
function NavButton({ icon: Icon, label, isActive, isExpanded, eyebrow, onClick, onHoverStart, onHoverEnd }: NavButtonProps) {
  const buttonCorner = useButtonCorner();
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      aria-current={isActive ? "page" : undefined}
      aria-label={label}
      className="flex items-center transition-colors"
      style={{
        borderRadius: buttonCorner,
        border: isActive ? "1px solid var(--c-teal)" : "1px solid transparent",
        background: isActive ? "color-mix(in srgb, var(--c-teal) 12%, transparent)" : "transparent",
        color: isActive ? "var(--c-teal)" : "var(--c-text-muted)",
        padding: "9px 11px",
        gap: isExpanded ? 9 : 0,
        cursor: "pointer",
        transition: "background 0.25s ease, border-color 0.25s ease, color 0.25s ease, gap 0.35s ease-out",
      }}
    >
      <Icon size={16} />
      <span
        className="flex flex-col items-start overflow-hidden whitespace-nowrap"
        style={{
          maxWidth: isExpanded ? 160 : 0,
          opacity: isExpanded ? 1 : 0,
          lineHeight: 1.15,
          // max-width and opacity used to run on different durations (0.25s vs 0.2s) — opacity
          // reached full visibility before the container finished widening, so for that last
          // ~50ms the already-solid text was still being uncovered by the shrinking clip window,
          // reading as a stutter rather than a reveal. Now both run the same duration/easing, and
          // opacity gets a short delay so the label doesn't fade in until the container has
          // actually started opening up for it.
          transition: "max-width 0.35s ease-out, opacity 0.35s ease-out 0.05s",
        }}
      >
        {eyebrow && (
          <span
            className="uppercase"
            style={{ fontSize: 8, letterSpacing: "0.08em", fontFamily: "var(--font-mono)", color: "var(--c-text-muted)" }}
          >
            {eyebrow}
          </span>
        )}
        <span style={{ fontSize: 13, fontFamily: "var(--font-body)" }}>{label}</span>
      </span>
    </button>
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
            const isActive = selectedPath === key;
            const isExpanded = isActive || hoveredKey === key;
            return (
              <NavButton
                key={key}
                icon={PATH_ICONS[key]}
                label={PATH_DISPLAY_NAMES[key]}
                isActive={isActive}
                isExpanded={isExpanded}
                eyebrow={isActive ? "Current Path" : undefined}
                onClick={() => router.push(PATH_URLS[key])}
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
        </nav>
      </motion.div>
    </motion.div>
  );
}
