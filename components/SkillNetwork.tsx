"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { CMSSkillGroup } from "@/store/contentStore";

// Interactive visualization of the same cms.skills groups the Core Strengths list above already
// renders — no separate content to maintain. Main nodes sit on a circle around a center "JAI"
// node, fully interconnected (every main node to every other, plus the center) rather than just
// spokes, matching the reference design's dense crossing web. Clicking a main node zooms the
// whole layer in on it (a single CSS transform-origin + scale on the wrapping div — everything
// inside, including label font sizes, scales together, which is what makes the newly-revealed
// skill labels read at a legible size once zoomed), highlights every line touching it, and
// reveals its own satellite dots (one per `skills` entry) with labels. Clicking the same node
// again (or the close button) zooms back out.
interface SkillNetworkProps {
  groups: CMSSkillGroup[];
}

const CENTER = { x: 50, y: 50 };
const MAIN_RADIUS_PCT = 32;
const SATELLITE_RADIUS_PCT = 15;
const SATELLITE_FAN_DEGREES = 36;
const ZOOM_SCALE = 2.15;
const ZOOM_TRANSITION = "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform-origin 0.6s cubic-bezier(0.22, 1, 0.36, 1)";

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
      <div
        className="absolute inset-0"
        style={{
          transform: `scale(${active ? ZOOM_SCALE : 1})`,
          transformOrigin: active ? `${active.x}% ${active.y}%` : "50% 50%",
          transition: ZOOM_TRANSITION,
        }}
      >
        {/* Lines layer */}
        <svg className="absolute inset-0" width="100%" height="100%" style={{ overflow: "visible" }}>
          {/* Center to each main node */}
          {mainNodes.map((n, i) => (
            <line
              key={`c-${i}`}
              x1={`${CENTER.x}%`} y1={`${CENTER.y}%`} x2={`${n.x}%`} y2={`${n.y}%`}
              stroke={activeIndex === i ? "var(--c-teal)" : "var(--c-border-soft)"}
              strokeWidth={activeIndex === i ? 1.5 : 0.75}
              opacity={active && activeIndex !== i ? 0.3 : 1}
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
                  stroke={touchesActive ? "var(--c-teal)" : "var(--c-border-soft)"}
                  strokeWidth={touchesActive ? 1.5 : 0.5}
                  opacity={active ? (touchesActive ? 0.9 : 0.2) : 0.45}
                  style={{ transition: "all 0.4s ease" }}
                />
              );
            })
          )}
          {/* Each main node to its own satellite dots */}
          {mainNodes.map((n, i) =>
            n.skills.map((_, si) => {
              const dotPos = polar(n.x, n.y, SATELLITE_RADIUS_PCT, satelliteAngle(n.angle, si, n.skills.length));
              return (
                <line
                  key={`s-${i}-${si}`}
                  x1={`${n.x}%`} y1={`${n.y}%`} x2={`${dotPos.x}%`} y2={`${dotPos.y}%`}
                  stroke="var(--c-border-soft)"
                  strokeWidth={0.5}
                  opacity={activeIndex === i ? 0.7 : 0.3}
                  style={{ transition: "opacity 0.4s ease" }}
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
            width: 60, height: 60,
            background: "var(--c-bg-card)", border: "1px solid var(--c-border-soft)",
          }}
        >
          <span style={{ fontFamily: "var(--font-heading)", fontSize: 12, color: "var(--c-text)", letterSpacing: "0.04em" }}>JAI</span>
        </div>

        {/* Main nodes */}
        {mainNodes.map((n, i) => {
          const isActive = activeIndex === i;
          const isDimmed = active !== null && !isActive;
          return (
            <button
              key={i}
              type="button"
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

      {active && (
        <button
          type="button"
          onClick={() => setActiveIndex(null)}
          aria-label="Close"
          className="absolute top-3 right-3 flex items-center justify-center transition-opacity hover:opacity-70"
          style={{
            width: 30, height: 30, borderRadius: "50%",
            background: "var(--c-bg-card)", border: "1px solid var(--c-border-soft)",
            color: "var(--c-text-muted)", cursor: "pointer",
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
