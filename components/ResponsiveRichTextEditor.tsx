"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { RichTextEditor, RICH_TEXT_EDITOR_WIDTH } from "@/components/RichTextEditor";

const ACCENT = "#14ADB5";

interface Props {
  label: string;
  value: string;
  onChange: (html: string) => void;
  /** Optional per-field override rendered below 768px on the public site — undefined means
   *  "no override, Desktop renders everywhere," matching CMSTypeScale's `mobile?` field. */
  mobileValue?: string;
  /** Called with `undefined` by the Reset action to clear the override, same as any other
   *  deepMerge patch — see store/contentStore.ts's deepMerge() for why undefined explicitly
   *  wins there rather than being dropped. */
  onMobileChange: (html: string | undefined) => void;
  previewStyle?: string;
  /** True when either the desktop or mobile value differs from what's actually saved — draws
   *  the same amber ring CMSFields.tsx uses for its own dirty inputs (see DIRTY_GLOW there)
   *  around the whole editor block, since there's no single <input> border to recolor here. */
  dirty?: boolean;
}

// Wraps a single RichTextEditor with an independent Desktop/Mobile device toggle, so one field
// can have different content/styling per breakpoint — same interaction model as
// DesignSystemSection.tsx's TypeScaleEditor device toggle: switching to Mobile with no override
// yet shows a *copy* of the Desktop content as a starting point, and nothing is persisted until
// the admin actually edits it (a strict opt-in — mobileValue stays undefined otherwise).
// Relies entirely on RichTextEditor's own value-sync effect (it already calls
// editor.commands.setContent() whenever the external `value` prop changes) to swap the editor's
// content when `device` toggles — no changes needed inside RichTextEditor itself beyond letting
// its own label be suppressed (label="" below) so this component can render its own label +
// toggle row instead of double-labeling the field.
export function ResponsiveRichTextEditor({ label, value, onChange, mobileValue, onMobileChange, previewStyle, dirty }: Props) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const hasMobileOverride = !!mobileValue;
  const activeValue = device === "mobile" ? (mobileValue ?? value) : value;

  function handleChange(html: string) {
    if (device === "desktop") onChange(html);
    else onMobileChange(html);
  }

  return (
    // No mb-4 here — RichTextEditor's own outer div already applies it, avoiding a doubled gap.
    <div
      style={{
        maxWidth: RICH_TEXT_EDITOR_WIDTH,
        boxShadow: dirty ? "0 0 0 3px rgba(245,158,11,0.12)" : undefined,
        outline: dirty ? "1px solid rgba(245,158,11,0.6)" : undefined,
        outlineOffset: dirty ? 4 : undefined,
        borderRadius: dirty ? 8 : undefined,
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginBottom: 6 }}>
        <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: ACCENT, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          {label}
        </label>
        <div className="flex items-center gap-3">
          {device === "mobile" && hasMobileOverride && (
            <button
              type="button"
              onClick={() => onMobileChange(undefined)}
              title="Remove the mobile-specific version — Desktop renders on mobile again"
              className="flex items-center gap-1 hover:opacity-70 transition-opacity"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#6B7E8A", fontFamily: "'DM Mono', monospace", fontSize: 9.5, letterSpacing: "0.04em" }}
            >
              <RotateCcw size={10} /> Reset to Desktop
            </button>
          )}
          <div className="flex items-center gap-1" style={{ background: "rgba(237,232,223,0.04)", borderRadius: 6, padding: 2 }}>
            {(["desktop", "mobile"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDevice(d)}
                className="flex items-center gap-1"
                style={{
                  padding: "3px 10px", borderRadius: 5, border: "none", cursor: "pointer",
                  fontFamily: "'DM Mono', monospace", fontSize: 9.5, letterSpacing: "0.04em", textTransform: "uppercase",
                  background: device === d ? "rgba(20,173,181,0.15)" : "transparent",
                  color: device === d ? ACCENT : "#6B7E8A",
                }}
              >
                {d === "mobile" && hasMobileOverride && (
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: ACCENT, display: "inline-block" }} />
                )}
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>
      {device === "mobile" && !hasMobileOverride && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, color: "#6B7E8A", marginBottom: 8, lineHeight: 1.5 }}>
          Starts as a copy of Desktop — change something below to create a mobile-specific
          version (applies below 768px).
        </p>
      )}
      <RichTextEditor label="" value={activeValue} onChange={handleChange} previewStyle={previewStyle} />
    </div>
  );
}
