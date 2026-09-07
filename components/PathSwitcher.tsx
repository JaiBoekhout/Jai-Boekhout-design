"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { Briefcase, UserCheck, Workflow, BookOpen } from "lucide-react";
import { PATH_URLS, PATH_DISPLAY_NAMES, type PathKey } from "@/lib/paths";
import { useHideOnScroll } from "@/store/useHideOnScroll";

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

// Always-visible row of the 4 paths (icon-only at rest, label expands on hover — or, on touch,
// only for whichever path is currently active, since there's no hover state to expand the
// others) — clicking any of them navigates straight there. Replaces the old "Current Path" pill
// + a "Switch Path" button that only ever routed home to re-choose from the path cards there;
// this collapses that extra hop into a single click, same as any other icon nav bar.
export function PathSwitcher({ selectedPath }: PathSwitcherProps) {
  const router = useRouter();
  const hidden = useHideOnScroll();
  const [hoveredKey, setHoveredKey] = useState<PathKey | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: "-50%" }}
      animate={{ opacity: hidden ? 0 : 1, y: hidden ? 40 : 0, x: "-50%" }}
      exit={{ opacity: 0, y: 20, x: "-50%" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ pointerEvents: hidden ? "none" : "auto" }}
      className="fixed bottom-8 left-1/2 z-50"
    >
      <nav
        aria-label="Switch path"
        className="flex items-center gap-1.5 p-1.5"
        style={{
          background: "var(--c-bg-glass)",
          border: "1px solid var(--c-border-med)",
          borderRadius: 0,
          backdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        {PATH_ORDER.map((key) => {
          const isActive = selectedPath === key;
          const isExpanded = isActive || hoveredKey === key;
          const Icon = PATH_ICONS[key];
          return (
            <button
              key={key}
              type="button"
              onClick={() => router.push(PATH_URLS[key])}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey((cur) => (cur === key ? null : cur))}
              aria-current={isActive ? "page" : undefined}
              aria-label={PATH_DISPLAY_NAMES[key]}
              className="flex items-center transition-colors"
              style={{
                borderRadius: 0,
                border: isActive ? "1px solid var(--c-teal)" : "1px solid transparent",
                background: isActive ? "rgba(20,173,181,0.12)" : "transparent",
                color: isActive ? "var(--c-teal)" : "var(--c-text-muted)",
                padding: "9px 11px",
                gap: isExpanded ? 9 : 0,
                cursor: "pointer",
                transition: "background 0.25s ease, border-color 0.25s ease, color 0.25s ease, gap 0.25s ease",
              }}
            >
              <Icon size={16} />
              <span
                className="flex flex-col items-start overflow-hidden whitespace-nowrap"
                style={{
                  maxWidth: isExpanded ? 160 : 0,
                  opacity: isExpanded ? 1 : 0,
                  lineHeight: 1.15,
                  transition: "max-width 0.25s ease, opacity 0.2s ease",
                }}
              >
                {isActive && (
                  <span
                    className="uppercase"
                    style={{ fontSize: 8, letterSpacing: "0.08em", fontFamily: "var(--font-mono)", color: "var(--c-text-muted)" }}
                  >
                    Current Path
                  </span>
                )}
                <span style={{ fontSize: 13, fontFamily: "var(--font-body)" }}>{PATH_DISPLAY_NAMES[key]}</span>
              </span>
            </button>
          );
        })}
      </nav>
    </motion.div>
  );
}
