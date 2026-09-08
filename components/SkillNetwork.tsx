"use client";

import { useEffect, useRef, useState } from "react";
import type { CMSSkillGroup } from "@/store/contentStore";

// Design-reference container width — node/font sizes below are authored in px against this and
// then scaled by the container's own measured width (see `scale` below). Without this, a phone-
// width container (~350px) still gets full-size 118px node circles since only the percentage-
// based radii shrink with the container, not these fixed px values — adjacent nodes end up
// overlapping heavily instead of shrinking together as one proportional diagram.
const REFERENCE_WIDTH = 720;

// Interactive visualization of the same cms.skills groups the Core Strengths list above already
// renders — no separate content to maintain. Main nodes sit on a circle around a center "JAI"
// node, fully interconnected (every main node to every other, plus the center) rather than just
// spokes, matching the reference design's dense crossing web. All connecting lines are visible
// at rest (not just on interaction) so the web itself reads clearly before anyone touches it.
// Hovering (or, on touch, tapping) a main node highlights every line touching it in the site's
// teal, dims everything else, and reveals its own satellite dots' labels — no zoom/scale effect,
// so labels stay legible at the diagram's normal size rather than needing to enlarge to be read.
interface SkillNetworkProps {
  groups: CMSSkillGroup[];
}

const CENTER = { x: 50, y: 50 };
// Kept well clear of the 0-100% container edge (main + satellite radius alone already reaches
// 41%) — the satellite LABELS extend further still beyond their dot, and the container clips
// anything past its bounds (see the wrapper's overflow: hidden below), so a node sitting near
// the top/bottom/side needs real margin left over or its outermost label gets cut off.
const MAIN_RADIUS_PCT = 27;
const SATELLITE_RADIUS_PCT = 14;

function polar(cx: number, cy: number, radiusPct: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + radiusPct * Math.cos(rad), y: cy + radiusPct * Math.sin(rad) };
}

// Wider fan for groups with more skills — a fixed 36° fan crammed 5-6 labels into a sliver
// directly above/below the node with no room to breathe. Capped at 160° so satellites never
// wrap far enough around to point back through their own parent node.
function fanDegrees(count: number): number {
  return Math.min(160, 40 + (count - 1) * 22);
}

function satelliteAngle(parentAngle: number, index: number, count: number): number {
  if (count <= 1) return parentAngle;
  const fan = fanDegrees(count);
  return parentAngle - fan / 2 + (fan * index) / (count - 1);
}

export function SkillNetwork({ groups }: SkillNetworkProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(REFERENCE_WIDTH);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const scale = width / REFERENCE_WIDTH;

  if (groups.length === 0) return null;

  const mainNodes = groups.map((g, i) => {
    const angle = -90 + (360 / groups.length) * i; // start at top (12 o'clock), go clockwise
    const pos = polar(CENTER.x, CENTER.y, MAIN_RADIUS_PCT, angle);
    return { ...g, angle, x: pos.x, y: pos.y };
  });
  const active = activeIndex !== null ? mainNodes[activeIndex] : null;

  // overflow left visible, not hidden — a long skill label on a node near the edge (e.g.
  // "Progressive Web Apps" off the rightmost node) needs room to spill past the diagram's own
  // square bounds into the surrounding whitespace; clipping it silently hid the text entirely
  // instead of just looking a little wide.
  return (
    <div ref={containerRef} className="relative w-full mx-auto" style={{ maxWidth: REFERENCE_WIDTH, aspectRatio: "1", overflow: "visible" }}>
      <div className="absolute inset-0">
        {/* Lines layer — visible by default (not just while a node is active), so the web itself
            reads clearly at rest; the active node's own lines brighten to teal and everything
            else dims, rather than lines appearing from nothing. */}
        <svg className="absolute inset-0" width="100%" height="100%" style={{ overflow: "visible" }}>
          {/* Center to each main node */}
          {mainNodes.map((n, i) => (
            <line
              key={`c-${i}`}
              x1={`${CENTER.x}%`} y1={`${CENTER.y}%`} x2={`${n.x}%`} y2={`${n.y}%`}
              stroke={activeIndex === i ? "var(--c-teal)" : "var(--c-border-med)"}
              strokeWidth={activeIndex === i ? 1.5 : 1}
              opacity={active && activeIndex !== i ? 0.35 : 1}
              style={{ transition: "all 0.4s ease" }}
            />
          ))}
          {/* Full mesh — every main node to every other main node */}
          {mainNodes.flatMap((n, i) =>
            mainNodes.slice(i + 1).map((m, offset) => {
              const j = i + 1 + offset;
              const touchesActive = activeIndex === i || activeIndex === j;
              return (
                <line
                  key={`m-${i}-${j}`}
                  x1={`${n.x}%`} y1={`${n.y}%`} x2={`${m.x}%`} y2={`${m.y}%`}
                  stroke={touchesActive ? "var(--c-teal)" : "var(--c-border-med)"}
                  strokeWidth={touchesActive ? 1.5 : 0.75}
                  opacity={active ? (touchesActive ? 0.9 : 0.25) : 0.7}
                  style={{ transition: "all 0.4s ease" }}
                />
              );
            })
          )}
          {/* Each main node to its own satellite dots */}
          {mainNodes.map((n, i) =>
            n.skills.map((_, si) => {
              const dotPos = polar(n.x, n.y, SATELLITE_RADIUS_PCT, satelliteAngle(n.angle, si, n.skills.length));
              const isActiveGroup = activeIndex === i;
              return (
                <line
                  key={`s-${i}-${si}`}
                  x1={`${n.x}%`} y1={`${n.y}%`} x2={`${dotPos.x}%`} y2={`${dotPos.y}%`}
                  stroke={isActiveGroup ? "var(--c-teal)" : "var(--c-border-med)"}
                  strokeWidth={isActiveGroup ? 1 : 0.75}
                  opacity={active ? (isActiveGroup ? 0.9 : 0.25) : 0.6}
                  style={{ transition: "all 0.4s ease" }}
                />
              );
            })
          )}
        </svg>

        {/* Center node — deliberately smaller than the main category nodes (118px) so the
            hierarchy still reads (JAI is the anchor, not another category), but large enough
            to hold its own visually rather than looking like an afterthought. */}
        <div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            left: `${CENTER.x}%`, top: `${CENTER.y}%`, transform: "translate(-50%, -50%)",
            width: 108 * scale, height: 108 * scale,
            background: "var(--c-bg-card)",
            border: active ? "1.5px solid var(--c-teal)" : "1px solid var(--c-border-soft)",
            transition: "border-color 0.4s ease",
          }}
        >
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 21 * scale, color: active ? "var(--c-teal)" : "var(--c-text)", letterSpacing: "0.04em", transition: "color 0.4s ease" }}>JAI</span>
        </div>

        {/* Main nodes — hover highlights (desktop); click/tap toggles too, since touch devices
            have no hover state to highlight-then-release with. */}
        {mainNodes.map((n, i) => {
          const isActive = activeIndex === i;
          const isDimmed = active !== null && !isActive;
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex((cur) => (cur === i ? null : cur))}
              onClick={() => setActiveIndex(isActive ? null : i)}
              aria-pressed={isActive}
              className="absolute rounded-full flex items-center justify-center text-center"
              style={{
                left: `${n.x}%`, top: `${n.y}%`, transform: "translate(-50%, -50%)",
                width: 118 * scale, height: 118 * scale, padding: 10 * scale,
                background: "var(--c-bg-card)",
                border: isActive ? "1.5px solid var(--c-teal)" : "1px solid var(--c-border-soft)",
                opacity: isDimmed ? 0.35 : 1,
                cursor: "pointer",
                transition: "opacity 0.4s ease, border-color 0.4s ease",
              }}
            >
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 12.5 * scale, color: "var(--c-text)", fontWeight: 500, lineHeight: 1.25, wordBreak: "break-word" }}>
                {n.title}
              </span>
            </button>
          );
        })}

        {/* Satellite dots — always teal-filled; larger/opaque + labeled only for the active group.
            Each label anchors AWAY from the diagram center (above for an upward-pointing dot,
            below for a downward one, left/right-aligned off the dot rather than always centered)
            — a label that always rendered "above" regardless of direction would grow back toward
            the center node for any dot in the bottom half of the diagram, overlapping it instead
            of reading outward. */}
        {mainNodes.map((n, i) =>
          n.skills.map((skill, si) => {
            const angle = satelliteAngle(n.angle, si, n.skills.length);
            const dotPos = polar(n.x, n.y, SATELLITE_RADIUS_PCT, angle);
            const rad = (angle * Math.PI) / 180;
            const dx = Math.cos(rad);
            const dy = Math.sin(rad);
            const isActiveGroup = activeIndex === i;
            // A narrow deadzone (not the ±0.3 this started with) — two satellites 20-30° apart
            // can easily both land within a wide "basically vertical" band and then both render
            // dead-centered on nearly the same x, overlapping regardless of how far apart their
            // dots actually are. Past this much narrower threshold they instead extend away from
            // each other (left one grows left, right one grows right), which is what actually
            // keeps adjacent labels apart on a crowded (5-6 skill) fan.
            const horizontal: React.CSSProperties =
              dx > 0.08
                ? { left: 0, textAlign: "left" }
                : dx < -0.08
                ? { right: 0, textAlign: "right" }
                : { left: 0, transform: "translateX(-50%)", textAlign: "center" };
            const vertical: React.CSSProperties = dy > 0 ? { top: `calc(100% + ${4 * scale}px)` } : { bottom: `calc(100% + ${4 * scale}px)` };
            return (
              <div
                key={`${i}-${si}`}
                className="absolute"
                style={{ left: `${dotPos.x}%`, top: `${dotPos.y}%`, width: 0, height: 0 }}
              >
                {isActiveGroup && (
                  <span
                    className="absolute whitespace-nowrap"
                    style={{ ...vertical, ...horizontal, fontFamily: "var(--font-mono)", fontSize: 9.5 * scale, color: "var(--c-text-muted)" }}
                  >
                    {skill}
                  </span>
                )}
                <div
                  style={{
                    position: "absolute", left: 0, top: 0, transform: "translate(-50%, -50%)",
                    width: (isActiveGroup ? 7 : 5) * scale, height: (isActiveGroup ? 7 : 5) * scale, borderRadius: "50%",
                    background: "var(--c-teal)", opacity: isActiveGroup ? 1 : 0.5,
                    transition: "width 0.4s ease, height 0.4s ease, opacity 0.4s ease",
                  }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
