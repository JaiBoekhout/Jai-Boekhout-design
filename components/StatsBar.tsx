"use client";

import { ArrowRight } from "lucide-react";
import type { CMSStat, CMSEvaluate } from "@/store/contentStore";
import { resolveStatValue } from "@/store/contentStore";
import { STAT_ICON_MAP, DEFAULT_STAT_ICON } from "@/lib/statIcons";

// Column count is always an exact divisor of the stat count, so a row is either completely full
// or the grid is a single column — never a partial row with an orphaned last item (e.g. 4 stats
// showing as 3-then-1). Worked out by hand for every count from 1-6 (Work's own stats selector
// already caps at 6): base is always a single column; md allows 2-up when the count is even;
// lg allows up to 4-up, preferring whatever divides the count evenly (4 stats → 4-up, 6 stats →
// 3-up, since 6 doesn't divide evenly by 4). Literal strings, not built via template
// interpolation, so Tailwind's JIT scanner can actually find them.
const COLS_CLASS: Record<number, { base: string; md: string; lg: string }> = {
  1: { base: "grid-cols-1", md: "md:grid-cols-1", lg: "lg:grid-cols-1" },
  2: { base: "grid-cols-1", md: "md:grid-cols-2", lg: "lg:grid-cols-2" },
  3: { base: "grid-cols-1", md: "md:grid-cols-1", lg: "lg:grid-cols-3" },
  4: { base: "grid-cols-1", md: "md:grid-cols-2", lg: "lg:grid-cols-4" },
  5: { base: "grid-cols-1", md: "md:grid-cols-1", lg: "lg:grid-cols-1" },
  6: { base: "grid-cols-1", md: "md:grid-cols-2", lg: "lg:grid-cols-3" },
};
const FALLBACK_COLS = { base: "grid-cols-1", md: "md:grid-cols-1", lg: "lg:grid-cols-1" };

export interface StatsBarProps {
  stats: CMSStat[];
  evaluate: CMSEvaluate;
  // Which stat ids get the hover/click "View section" treatment, and what happens on
  // activation — e.g. the Work page's bar navigates to /evaluate#<anchor>, while Evaluate's own
  // bar scrolls to a section within the same page.
  isClickable?: (id: string) => boolean;
  onActivate?: (id: string) => void;
}

// Flush divided-strip stats row — full-width top/bottom rule, a divider between every cell, open
// (no closing border) at the very start and end of the row, like a plain table. Shared by the
// Work page's stats bar and the Evaluate page's "At a Glance" row so both stay in one visual
// language rather than two competing "stats" treatments (extracted from ExperienceWork.tsx,
// which had this first).
//
// Dividers are drawn with the "coloured gap" trick: the container's own background is the
// divider colour, each cell repaints the page background over it, and a hairline `gap` between
// cells lets that colour show through only in the seams — which is exactly the cells that are
// actually adjacent, at any column count, including a horizontal line between wrapped rows for
// free. This only stays artifact-free because the column count above is always an exact divisor
// of the stat count — every row is completely full, so there's never an empty trailing grid
// track with nothing to paint over that background (which would otherwise show through as a
// solid block of divider colour).
export function StatsBar({ stats, evaluate, isClickable, onActivate }: StatsBarProps) {
  if (stats.length === 0) return null;
  const cols = COLS_CLASS[stats.length] ?? FALLBACK_COLS;
  return (
    <div
      className={`grid ${cols.base} ${cols.md} ${cols.lg}`}
      style={{
        background: "var(--c-divider)",
        gap: "1px",
        borderTop: "0.5px solid var(--c-divider)",
        borderBottom: "0.5px solid var(--c-divider)",
      }}
    >
      {stats.map((stat) => {
        const { id, unit, label, sub, icon } = stat;
        const value = resolveStatValue(stat, evaluate);
        const clickable = isClickable?.(id) ?? false;
        const handleActivate = () => onActivate?.(id);
        const Icon = (icon && STAT_ICON_MAP[icon]) || DEFAULT_STAT_ICON;
        return (
          <div
            key={id}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? handleActivate : undefined}
            onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleActivate(); } } : undefined}
            className={`relative transition-colors${clickable ? " stats-tile-clickable" : ""}`}
            style={{
              background: "var(--c-bg)",
              // Extra bottom room on clickable tiles reserves space for the "View section" link
              // pinned to the corner below, so it never sits on top of a label that wraps to
              // more than one line.
              padding: clickable ? "26px 22px 40px" : "26px 22px",
              cursor: clickable ? "pointer" : undefined,
            }}
          >
            <div className="flex items-baseline gap-1.5" style={{ marginBottom: 9 }}>
              <div className="flex items-center gap-1.5">
                <Icon size={16} style={{ color: "var(--c-teal)", flexShrink: 0 }} />
                <span style={{ fontFamily: "var(--font-secondary)", fontStyle: "italic", fontSize: "clamp(22px, 2.6vw, 32px)", color: "var(--c-text)", fontWeight: 400, lineHeight: 1 }}>
                  {value}
                </span>
              </div>
              {unit && (
                <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--c-text-muted)", fontWeight: 400 }}>
                  {unit}
                </span>
              )}
            </div>
            <div>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "11.5px", color: "var(--c-text)", fontWeight: 600 }}>
                {label}
              </span>
              {sub && (
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--c-text)", display: "block", marginTop: "4px" }}>
                  {sub}
                </span>
              )}
            </div>
            {clickable && (
              // Arrow-only at rest (already the highlight colour); hover reveals "View section"
              // ahead of it, growing leftward since the arrow itself stays pinned to this corner.
              <span
                className="flex items-center"
                style={{
                  position: "absolute", right: 16, bottom: 14,
                  fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.02em", whiteSpace: "nowrap",
                }}
              >
                <span className="stats-view-text">View section</span>
                <ArrowRight size={11} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
