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

// Flush divided-strip stats row — full-width top/bottom rule, a vertical rule between each item.
// Shared by the Work page's stats bar and the Evaluate page's "At a Glance" row so both stay in
// one visual language rather than two competing "stats" treatments (extracted from
// ExperienceWork.tsx, which had this first).
export function StatsBar({ stats, evaluate, isClickable, onActivate }: StatsBarProps) {
  if (stats.length === 0) return null;
  const cols = STATS_LG_COLS[stats.length] ?? STATS_LG_COLS[6];
  return (
    <div
      className={`grid grid-cols-2 ${cols}`}
      style={{ borderTop: "0.5px solid var(--c-divider)", borderBottom: "0.5px solid var(--c-divider)" }}
    >
      {stats.map((stat, i) => {
        const { id, label, sub, icon } = stat;
        const value = resolveStatValue(stat, evaluate);
        const clickable = isClickable?.(id) ?? false;
        const handleActivate = () => onActivate?.(id);
        const isLast = i === stats.length - 1;
        const Icon = (icon && STAT_ICON_MAP[icon]) || DEFAULT_STAT_ICON;
        const labelBlock = (
          <div>
            <span style={{ fontFamily: "var(--font-body)", fontSize: "11.5px", color: "var(--c-text)", fontWeight: 300 }}>
              {label}
            </span>
            {sub && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--c-text)", display: "block", marginTop: "4px" }}>
                {sub}
              </span>
            )}
          </div>
        );
        return (
          <div
            key={id}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={clickable ? handleActivate : undefined}
            onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleActivate(); } } : undefined}
            className="transition-colors"
            style={{
              padding: "26px 22px",
              borderRight: isLast ? "none" : "0.5px solid var(--c-divider)",
              cursor: clickable ? "pointer" : undefined,
            }}
            onMouseEnter={clickable ? (e) => { e.currentTarget.style.background = "rgba(20,173,181,0.05)"; } : undefined}
            onMouseLeave={clickable ? (e) => { e.currentTarget.style.background = "transparent"; } : undefined}
          >
            <div className="flex items-center gap-1.5" style={{ marginBottom: 9 }}>
              <Icon size={16} style={{ color: "var(--c-teal)", flexShrink: 0 }} />
              <div style={{ fontFamily: "var(--font-secondary)", fontStyle: "italic", fontSize: "clamp(22px, 2.6vw, 32px)", color: "var(--c-text)", fontWeight: 400, lineHeight: 1 }}>
                {value}
              </div>
            </div>
            {clickable ? (
              <div className="flex items-end justify-between gap-2">
                {labelBlock}
                <span
                  className="flex items-center gap-1"
                  style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-text)", letterSpacing: "0.02em", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  View section <ArrowRight size={11} />
                </span>
              </div>
            ) : (
              labelBlock
            )}
          </div>
        );
      })}
    </div>
  );
}
