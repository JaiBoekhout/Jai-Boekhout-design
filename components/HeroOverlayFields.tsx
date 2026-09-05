"use client";

import { ImagePicker } from "@/components/ImagePicker";

// Shared shape for every "path" page's optional full-bleed hero photo + colour-overlay gradient
// (Work/Evaluate/Story/Process all structurally satisfy this once their CMS interfaces carry
// these fields). A 2-stop gradient runs along heroOverlayDirection: heroOverlayColor1 at the 0%
// end, giving way to either heroOverlayColor2 or full transparency (heroOverlayColor2Transparent)
// by heroOverlayRatio% along the gradient. heroOverlayMidpoint (0-100, default 50) biases where
// the 50/50 blend between the two falls within that 0%→ratio% span — mirrors Photoshop's gradient
// midpoint diamond; 50 is the plain arithmetic middle (a linear transition).
export interface HeroOverlayData {
  heroImageUrl?: string;
  heroImagePosition?: string;
  heroImageScale?: number;
  heroOverlayColor1?: string;
  heroOverlayColor2?: string;
  heroOverlayColor2Transparent?: boolean;
  heroOverlayRatio?: number;
  heroOverlayDirection?: "to-bottom" | "to-top" | "to-right" | "to-left";
  heroOverlayMidpoint?: number;
}

// Story's hero photo shipped before these fields existed, with a hardcoded 4-stop dark-fade
// gradient (dark at the bottom, transparent at top). This 2-stop-plus-midpoint approximation
// (a plain linear fade bottom→top) lands within ~1% of the original curve's actual 50%-opacity
// crossover point, so existing Story content that hasn't set these fields yet renders visually
// unchanged. Shared by StorySection.tsx (admin sliders) and ExperienceStory.tsx (public render)
// so both always agree on what "unset" currently looks like.
export const STORY_HERO_OVERLAY_DEFAULTS: Partial<HeroOverlayData> = {
  heroOverlayColor1: "#06090C",
  heroOverlayColor2Transparent: true,
  heroOverlayRatio: 100,
  heroOverlayDirection: "to-top",
  heroOverlayMidpoint: 50,
};

const DIRECTION_OPTIONS = [
  { id: "to-bottom", label: "Top → Bottom" },
  { id: "to-top", label: "Bottom → Top" },
  { id: "to-right", label: "Left → Right" },
  { id: "to-left", label: "Right → Left" },
] as const;

const CSS_DIRECTION: Record<NonNullable<HeroOverlayData["heroOverlayDirection"]>, string> = {
  "to-bottom": "to bottom",
  "to-top": "to top",
  "to-right": "to right",
  "to-left": "to left",
};

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
  const int = parseInt(m?.[1] ?? "000000", 16);
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
}

// Resolves every field against an optional per-page baseline before falling back to the
// hard-coded defaults below — lets a page migrating an existing hardcoded gradient (e.g. Story)
// keep its current look for content saved before these fields existed, without a DB migration.
function resolve(data: HeroOverlayData, defaults: Partial<HeroOverlayData>) {
  return {
    color1: data.heroOverlayColor1 ?? defaults.heroOverlayColor1 ?? "#000000",
    color2: data.heroOverlayColor2 ?? defaults.heroOverlayColor2 ?? "#000000",
    color2Transparent: data.heroOverlayColor2Transparent ?? defaults.heroOverlayColor2Transparent ?? false,
    ratio: data.heroOverlayRatio ?? defaults.heroOverlayRatio ?? 60,
    midpoint: data.heroOverlayMidpoint ?? defaults.heroOverlayMidpoint ?? 50,
    direction: data.heroOverlayDirection ?? defaults.heroOverlayDirection ?? "to-bottom",
  };
}

export function buildHeroOverlayGradient(data: HeroOverlayData, defaults: Partial<HeroOverlayData> = {}): string {
  const { color1, color2, color2Transparent, ratio, midpoint, direction } = resolve(data, defaults);
  const color2Stop = color2Transparent ? "transparent" : color2;
  const [r, g, b] = hexToRgb(color1);
  const midColor = color2Transparent
    ? `rgba(${r}, ${g}, ${b}, 0.5)`
    : (() => {
        const [r2, g2, b2] = hexToRgb(color2Stop);
        return `rgb(${Math.round((r + r2) / 2)}, ${Math.round((g + g2) / 2)}, ${Math.round((b + b2) / 2)})`;
      })();
  const midPos = (ratio * midpoint) / 100;
  return `linear-gradient(${CSS_DIRECTION[direction]}, ${color1} 0%, ${midColor} ${midPos}%, ${color2Stop} ${ratio}%)`;
}

// Public-render layer: the full-bleed background photo + colour-overlay gradient, absolutely
// positioned to fill the nearest `position: relative` ancestor's padding box. Render this FIRST,
// before any hero text siblings/wrappers, and give every text element (or a wrapping div around
// them) that follows it a `position: relative` (z-index: auto is enough) so normal CSS stacking
// paints it above these two layers — extracted from the pattern ExperienceStory.tsx used first.
export function HeroOverlayLayer({ data, defaults }: { data: HeroOverlayData; defaults?: Partial<HeroOverlayData> }) {
  if (!data.heroImageUrl) return null;
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${data.heroImageUrl})`,
          backgroundSize: "cover",
          backgroundPosition: data.heroImagePosition || "center",
          transform: `scale(${data.heroImageScale ?? 1})`,
          transformOrigin: data.heroImagePosition || "center",
        }}
      />
      <div className="absolute inset-0" style={{ background: buildHeroOverlayGradient(data, defaults) }} />
    </>
  );
}

// Plain hex swatch + text input — same shape as DesignSystemSection.tsx's own ColorInput; kept as
// a local copy (a third one, alongside EvaluateSection.tsx's pre-existing copy) rather than a
// shared export, since none of these admin-only files otherwise need to depend on each other.
function ColorInput({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="flex items-center gap-2" style={{ flex: 1, opacity: disabled ? 0.4 : 1 }}>
      <input
        type="color"
        value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(237,232,223,0.15)", padding: 2, background: "none", cursor: disabled ? "default" : "pointer", flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6B7E8A", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 3 }}>{label}</p>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{ width: "100%", background: "rgba(237,232,223,0.04)", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 6, padding: "5px 8px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EDE8DF", outline: "none" }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.1)")}
        />
      </div>
    </div>
  );
}

// Admin editor: Hero Image picker + Colour Overlay panel (direction, two colours, ratio,
// midpoint). Generic over any CMS section shape that carries HeroOverlayData, so the same editor
// drives Work/Evaluate/Story/Process's hero image without duplicating this UI four times.
// `defaults` should mirror whatever is passed to that page's <HeroOverlayLayer> so the sliders
// always reflect what's actually rendering when a field is still unset in saved content.
export function HeroImageOverlayEditor<T extends HeroOverlayData>({
  data,
  onChange,
  imageLabel = "Hero Image · full-bleed photo, optional — sits behind the hero copy",
  defaults = {},
}: {
  data: T;
  onChange: (data: T) => void;
  imageLabel?: string;
  defaults?: Partial<HeroOverlayData>;
}) {
  const { color1, color2, color2Transparent, ratio, midpoint, direction } = resolve(data, defaults);
  return (
    <>
      <ImagePicker
        label={imageLabel}
        previewRatio="21/9"
        value={data.heroImageUrl}
        position={data.heroImagePosition}
        scale={data.heroImageScale}
        onChange={(url) => onChange({ ...data, heroImageUrl: url })}
        onPositionChange={(pos) => onChange({ ...data, heroImagePosition: pos })}
        onScaleChange={(s) => onChange({ ...data, heroImageScale: s })}
      />
      {data.heroImageUrl && (
        <div className="flex flex-col mb-6 p-4 rounded-xl" style={{ background: "#0C1117", border: "1px solid rgba(237,232,223,0.06)" }}>
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "12px" }}>
            Colour Overlay
          </label>

          {/* Direction — which edge Colour 1 anchors to; flipping this is how you move the solid
              colour off one edge (e.g. Bottom → Top anchors Colour 1 at the bottom instead). */}
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px" }}>
            Direction
          </label>
          <div className="flex gap-2 mb-4 flex-wrap">
            {DIRECTION_OPTIONS.map((opt) => {
              const active = direction === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChange({ ...data, heroOverlayDirection: opt.id })}
                  style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 10.5, letterSpacing: "0.03em",
                    padding: "7px 12px", borderRadius: 6, cursor: "pointer",
                    background: active ? "#14ADB5" : "transparent",
                    color: active ? "#06090C" : "#EDE8DF",
                    border: active ? "1px solid transparent" : "1px solid rgba(237,232,223,0.16)",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-3 mb-3">
            <ColorInput label="Colour 1" value={color1} onChange={(v) => onChange({ ...data, heroOverlayColor1: v })} />
            <ColorInput label="Colour 2" value={color2} onChange={(v) => onChange({ ...data, heroOverlayColor2: v })} disabled={color2Transparent} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, cursor: "pointer", userSelect: "none" }}>
            <input
              type="checkbox"
              checked={color2Transparent}
              onChange={(e) => onChange({ ...data, heroOverlayColor2Transparent: e.target.checked })}
              style={{ width: 14, height: 14, accentColor: "#14ADB5", cursor: "pointer", flexShrink: 0 }}
            />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "var(--c-text-muted)", letterSpacing: "0.04em" }}>
              Fade Colour 2 to transparent instead
            </span>
          </label>

          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "10px" }}>
            Gradient Ratio — Colour 1 fully gives way to Colour 2 at {ratio}% along the gradient
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={ratio}
            onChange={(e) => onChange({ ...data, heroOverlayRatio: Number(e.target.value) })}
            style={{ width: "100%", accentColor: "#14ADB5" }}
          />
          <div className="flex justify-between mt-1 mb-4">
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF" }}>0% (start)</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF" }}>100% (end)</span>
          </div>

          {/* Midpoint — Photoshop-style: biases where the 50/50 blend between Colour 1 and
              Colour 2 sits within the active 0%→ratio% transition, rather than always sitting at
              its arithmetic middle. Range is deliberately scoped to "within the active part" (the
              transition zone itself), not the full 0-100% of the image. */}
          <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#14ADB5", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "10px" }}>
            Midpoint — the 50/50 blend sits {midpoint}% of the way through that transition
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={midpoint}
            onChange={(e) => onChange({ ...data, heroOverlayMidpoint: Number(e.target.value) })}
            style={{ width: "100%", accentColor: "#14ADB5" }}
          />
          <div className="flex justify-between mt-1">
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF" }}>Sooner</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF" }}>Later</span>
          </div>
        </div>
      )}
    </>
  );
}
