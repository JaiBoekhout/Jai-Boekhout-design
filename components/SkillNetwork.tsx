"use client";

import { useState } from "react";
import type { CMSSkillGroup } from "@/store/contentStore";

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
const MAIN_RADIUS_PCT = 32;
const SATELLITE_RADIUS_PCT = 15;
const SATELLITE_FAN_DEGREES = 36;

function polar(cx: number, cy: number, radiusPct: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + radiusPct * Math.cos(rad), y: cy + radiusPct * Math.sin(rad) };
}

function satelliteAngle(parentAngle: number, index: number, count: number): number {
  if (count <= 1) return parentAngle;
  return parentAngle - SATELLITE_FAN_DEGREES / 2 + (SATELLITE_FAN_DEGREES * index) / (count - 1);
}

export function SkillNetwork({ groups }: SkillNetworkProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  if (groups.length === 0) return null;

  const mainNodes = groups.map((g, i) => {
    const angle = -90 + (360 / groups.length) * i; // start at top (12 o'clock), go clockwise
    const pos = polar(CENTER.x, CENTER.y, MAIN_RADIUS_PCT, angle);
    return { ...g, angle, x: pos.x, y: pos.y };
  });
  const active = activeIndex !== null ? mainNodes[activeIndex] : null;

  return (
    <div className="relative w-full mx-auto" style={{ maxWidth: 720, aspectRatio: "1", overflow: "hidden" }}>
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

        {/* Center node */}
        <div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            left: `${CENTER.x}%`, top: `${CENTER.y}%`, transform: "translate(-50%, -50%)",
            width: 88, height: 88,
            background: "var(--c-bg-card)", border: "1px solid var(--c-border-soft)",
          }}
        >
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 17, color: "var(--c-text)", letterSpacing: "0.04em" }}>JAI</span>
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
                width: 118, height: 118, padding: 10,
                background: "var(--c-bg-card)",
                border: isActive ? "1.5px solid var(--c-teal)" : "1px solid var(--c-border-soft)",
                opacity: isDimmed ? 0.35 : 1,
                cursor: "pointer",
                transition: "opacity 0.4s ease, border-color 0.4s ease",
              }}
            >
              <span style={{ fontFamily: "var(--font-heading)", fontSize: 12.5, color: "var(--c-text)", fontWeight: 500, lineHeight: 1.25, wordBreak: "break-word" }}>
                {n.title}
              </span>
            </button>
          );
        })}

        {/* Satellite dots — always teal-filled; larger/opaque + labeled only for the active group */}
        {mainNodes.map((n, i) =>
          n.skills.map((skill, si) => {
            const dotPos = polar(n.x, n.y, SATELLITE_RADIUS_PCT, satelliteAngle(n.angle, si, n.skills.length));
            const isActiveGroup = activeIndex === i;
            return (
              <div
                key={`${i}-${si}`}
                className="absolute flex flex-col items-center"
                style={{ left: `${dotPos.x}%`, top: `${dotPos.y}%`, transform: "translate(-50%, -50%)" }}
              >
                {isActiveGroup && (
                  <span
                    className="absolute whitespace-nowrap"
                    style={{ bottom: "calc(100% + 4px)", fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--c-text-muted)" }}
                  >
                    {skill}
                  </span>
                )}
                <div
                  style={{
                    width: isActiveGroup ? 7 : 5, height: isActiveGroup ? 7 : 5, borderRadius: "50%",
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
