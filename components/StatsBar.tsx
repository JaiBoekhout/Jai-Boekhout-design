"use client";

import { ArrowRight } from "lucide-react";
import type { CMSStat, CMSEvaluate } from "@/store/contentStore";
import { resolveStatValue } from "@/store/contentStore";
import { STAT_ICON_MAP, DEFAULT_STAT_ICON } from "@/lib/statIcons";

// Literal Tailwind class strings (not built via template interpolation) so the JIT scanner picks
// them up. Column count is always 1, 2, or 4 — never 3, which reads as an awkward, unbalanced
// row (and, worse, orphans a lone 4th item alone on its own line). 2 items stay 2-wide, 3 also
// stay 2-wide (a normal partial last row), 4+ go to 4-wide (also a partial last row once there
// are 5 or 6). Mobile caps at 2-wide regardless, since 4 columns is too cramped on a phone.
function colsFor(n: number, maxCols: 2 | 4): 1 | 2 | 4 {
  if (n <= 1) return 1;
  if (maxCols === 4 && n >= 4) return 4;
  return 2;
}
const BASE_COLS_CLASS: Record<1 | 2 | 4, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 4: "grid-cols-2" };
const MD_COLS_CLASS: Record<1 | 2 | 4, string> = { 1: "md:grid-cols-1", 2: "md:grid-cols-2", 4: "md:grid-cols-4" };

export interface StatsBarProps {
  stats: CMSStat[];
  evaluate: CMSEvaluate;
  // Which stat ids get the hover/click "View section" treatment, and what happens on
  // activation — e.g. the Work page's bar navigates to /evaluate#<anchor>, while Evaluate's own
  // bar scrolls to a section within the same page.
  isClickable?: (id: string) => boolean;
  onActivate?: (id: string) => void;
}

// Flush divided-strip stats row — full-width top/bottom rule, a divider between every cell.
// Shared by the Work page's stats bar and the Evaluate page's "At a Glance" row so both stay in
// one visual language rather than two competing "stats" treatments (extracted from
// ExperienceWork.tsx, which had this first).
//
// Dividers are drawn with the "coloured gap" trick (container background = divider colour, each
// cell repaints the page background, a 1px `gap` between cells lets that colour show through)
// instead of a `borderRight` on every-item-but-the-last. A last-child border only draws a
// correct line when every stat fits on one row — the moment stats wrap (2 columns on mobile, 3 on
// tablet), whichever cell happens to be last overall is no longer necessarily last in ITS row, so
// a stray divider shows up mid-row or a real one goes missing depending on the count. The gap
// trick draws a divider only between cells that are actually adjacent, at any column count,
// including a horizontal line between wrapped rows for free.
export function StatsBar({ stats, evaluate, isClickable, onActivate }: StatsBarProps) {
  if (stats.length === 0) return null;
  const mdCols = colsFor(stats.length, 4);
  const mobileCols = colsFor(stats.length, 2);
  // Pads out an incomplete last row with invisible filler cells (page-background, no border/
  // content) rather than leaving those grid tracks empty — an empty track has no child to paint
  // over the container's divider-coloured background (the "coloured gap" trick below), which
  // would otherwise show up as a solid block of divider colour instead of blank space.
  const paddedLength = Math.ceil(stats.length / mdCols) * mdCols;
  const fillerCount = paddedLength - stats.length;
  return (
    <div
      className={`grid ${BASE_COLS_CLASS[mobileCols]} ${MD_COLS_CLASS[mdCols]}`}
      style={{
        background: "var(--c-divider)",
        gap: "0.5px",
        borderTop: "0.5px solid var(--c-divider)",
        borderBottom: "0.5px solid var(--c-divider)",
        // Closes off the right edge of whichever cell(s) land last in their row — without this,
        // only the gaps *between* cells get a divider, so the rightmost column looks like it's
        // missing its closing line compared to every other cell, which does get one on its right
        // (its neighbour's gap) or left.
        borderRight: "0.5px solid var(--c-divider)",
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
      {Array.from({ length: fillerCount }, (_, i) => (
        <div key={`filler-${i}`} aria-hidden="true" style={{ background: "var(--c-bg)" }} />
      ))}
    </div>
  );
}
