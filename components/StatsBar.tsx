"use client";

import { ArrowRight } from "lucide-react";
import type { CMSStat, CMSEvaluate } from "@/store/contentStore";
import { resolveStatValue } from "@/store/contentStore";
import { STAT_ICON_MAP, DEFAULT_STAT_ICON } from "@/lib/statIcons";

// Literal Tailwind class strings (not built via template interpolation) so the JIT scanner picks
// them up — the stat count selects how many columns fit on one row at lg: and up, so every stat
// sits on a single row rather than wrapping into a 2-column grid. Capped at 6 (Work's own stats
// selector already caps at 6); more than 6 stats simply wraps onto a second row.
const STATS_LG_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};

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
  const cols = STATS_LG_COLS[stats.length] ?? STATS_LG_COLS[6];
  return (
    <div
      className={`grid grid-cols-2 md:grid-cols-3 ${cols}`}
      style={{
        background: "var(--c-divider)",
        gap: "0.5px",
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
            className="relative transition-colors"
            style={{
              background: "var(--c-bg)",
              // Extra bottom room on clickable tiles reserves space for the "View section" link
              // pinned to the corner below, so it never sits on top of a label that wraps to
              // more than one line.
              padding: clickable ? "26px 22px 40px" : "26px 22px",
              cursor: clickable ? "pointer" : undefined,
            }}
            onMouseEnter={clickable ? (e) => { e.currentTarget.style.background = "#1A2127"; } : undefined}
            onMouseLeave={clickable ? (e) => { e.currentTarget.style.background = "var(--c-bg)"; } : undefined}
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
              <span
                className="flex items-center gap-1"
                style={{
                  position: "absolute", right: 16, bottom: 14,
                  fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-text)", letterSpacing: "0.02em", whiteSpace: "nowrap",
                }}
              >
                View section <ArrowRight size={11} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
