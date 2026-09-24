"use client";

import { useState } from "react";
import { RotateCcw, Send, ChevronDown, Check, Plus, X, ArrowUp, ArrowDown, Trash2, Eye, EyeOff, Pencil, Moon, Sun, Lock, Unlock } from "lucide-react";
import { CMSSectionHeading, CMSInput, CMSUrlInput, CMSTextarea, selectArrowStyle, useDragReorder, DragHandle } from "@/components/CMSFields";
import { FaLinkedin, FaGithub, FaDribbble, FaBehance, FaInstagram, FaXTwitter, FaYoutube, FaFacebook } from "react-icons/fa6";
import { ImagePicker } from "@/components/ImagePicker";
import { contrastRatio } from "@/lib/contrast";
import { ResponsiveRichTextEditor } from "@/components/ResponsiveRichTextEditor";
import {
  FONT_PAIRINGS, DEFAULT_DESIGN_SYSTEM, DEFAULT_LOGO_URL, DEFAULT_FAVICON_URL,
  DEFAULT_FAVICON_PNG_URL, DEFAULT_FAVICON_SVG_URL, DEFAULT_APPLE_TOUCH_ICON_URL,
  BUTTON_CORNER_RADIUS, BUTTON_SIZE_STYLE, TYPE_SCALE_RATIOS, CUSTOM_HEADING_FONTS,
  CUSTOM_BODY_FONTS, CUSTOM_MONO_FONTS, FONT_WEIGHTS, computeTypeScaleSizes, THEME_PRESETS,
  DEFAULT_COMPANY_CREDIT_COPY,
} from "@/store/contentStore";
import type {
  CMSDesignSystem, CMSDesignColors, CMSBranding, CMSComponentColors, CMSCompany, CMSSocials, CMSNotFound,
  CMSButtonVariantStyle, ButtonVariantId, LinkUnderline, CMSTypeScale,
  MenuHoverEffect, TabBarFill, ButtonCorner, AccentFollow, CMSSavedTheme,
} from "@/store/contentStore";

const SOCIAL_PLATFORMS: { key: keyof CMSSocials; label: string; Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }> }[] = [
  { key: "linkedin", label: "LinkedIn", Icon: FaLinkedin },
  { key: "github", label: "GitHub", Icon: FaGithub },
  { key: "dribbble", label: "Dribbble", Icon: FaDribbble },
  { key: "behance", label: "Behance", Icon: FaBehance },
  { key: "instagram", label: "Instagram", Icon: FaInstagram },
  { key: "x", label: "X (Twitter)", Icon: FaXTwitter },
  { key: "youtube", label: "YouTube", Icon: FaYoutube },
  { key: "facebook", label: "Facebook", Icon: FaFacebook },
];

interface Props {
  data: CMSDesignSystem;
  branding: CMSBranding;
  socials: CMSSocials;
  notFound: CMSNotFound;
  companies: CMSCompany[];
  companyCreditCopy?: string;
  onChange: (data: CMSDesignSystem) => void;
  onBrandingChange: (branding: CMSBranding) => void;
  onSocialsChange: (socials: CMSSocials) => void;
  onNotFoundChange: (notFound: CMSNotFound) => void;
  onCompaniesChange: (companies: CMSCompany[]) => void;
  onCompanyCreditCopyChange: (copy: string) => void;
}

interface TokenDef {
  key: keyof Pick<
    CMSDesignColors,
    "accentDark" | "headingDark" | "textDark" | "mutedDark" | "bodyDark" | "bgDark" | "cardDark" | "dividerDark"
  >;
  label: string;
  description: string;
}

// Each token's dark-mode key implies its light-mode counterpart by replacing the "Dark" suffix
// with "Light" — keeps the token list itself short instead of repeating every field twice.
const TOKENS: TokenDef[] = [
  { key: "accentDark", label: "Accent", description: "Primary interactive color — links, buttons, highlights" },
  { key: "headingDark", label: "Heading", description: "Large headings and titles" },
  { key: "textDark", label: "Text", description: "Primary UI text" },
  { key: "mutedDark", label: "Muted Text", description: "Labels, captions, secondary text" },
  { key: "bodyDark", label: "Body / Paragraph Text", description: "Long-form reading text — bios, case study copy" },
  { key: "bgDark", label: "Background", description: "Page background" },
  { key: "cardDark", label: "Card / Panel Background", description: "Cards, panels and raised surfaces" },
  { key: "dividerDark", label: "Divider", description: "Lines between list items and sections" },
];

// Which tokens actually render as text sitting on top of another color — Accent/Background/Card/
// Divider are either the surface itself or too situational (a small dot, a hairline) for a
// contrast warning to be meaningful the way it is for body copy people are meant to read.
const TEXT_TOKEN_KEYS = new Set<TokenDef["key"]>(["headingDark", "textDark", "mutedDark", "bodyDark"]);

// Below this ratio, text is outright hard to read (WCAG AA's 4.5:1 for normal text); below 2:1
// it's practically invisible — distinguishes "worth a look" from "this is almost certainly a
// mistake" without drowning every slightly-off pairing in the same alarm color.
const CONTRAST_AA = 4.5;
const CONTRAST_POOR = 2;

function ContrastBadge({ ratio, label }: { ratio: number; label: string }) {
  const ok = ratio >= CONTRAST_AA;
  const poor = ratio < CONTRAST_POOR;
  return (
    <span
      title={`${label}: contrast ratio ${ratio.toFixed(1)}:1${ok ? " — readable" : " — WCAG AA wants at least 4.5:1 for text"}`}
      style={{
        fontFamily: "'DM Mono', monospace", fontSize: 8.5, padding: "2px 6px", borderRadius: 4, whiteSpace: "nowrap",
        background: ok ? "rgba(237,232,223,0.04)" : poor ? "rgba(224,90,90,0.15)" : "rgba(217,164,65,0.15)",
        color: ok ? "#6B7E8A" : poor ? "#E85A5A" : "#D9A441",
      }}
    >
      {label} {ratio.toFixed(1)}:1{!ok ? " ⚠" : ""}
    </span>
  );
}

export const DESIGN_SYSTEM_SECTIONS: { id: string; label: string }[] = [
  { id: "ds-colors", label: "Color Palette" },
  { id: "ds-fonts", label: "Font Pairing" },
  { id: "ds-preview", label: "Preview" },
  { id: "ds-buttons", label: "Buttons" },
  { id: "ds-links", label: "Links" },
  { id: "ds-labels", label: "Labels" },
  { id: "ds-fields", label: "Input Fields" },
  { id: "ds-textareas", label: "Text Areas" },
  { id: "ds-checkboxes", label: "Checkboxes" },
  { id: "ds-radio", label: "Radio Buttons" },
  { id: "ds-switches", label: "Switches" },
  { id: "ds-menus", label: "Menus" },
  { id: "ds-tabbar", label: "Tab Bar" },
  { id: "ds-branding", label: "Branding" },
  { id: "ds-socials", label: "Socials" },
  { id: "ds-companies", label: "Companies" },
  { id: "ds-404", label: "404 Page" },
];

function lightKeyFor(darkKey: string): keyof CMSDesignColors {
  return darkKey.replace(/Dark$/, "Light") as keyof CMSDesignColors;
}

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2" style={{ flex: 1 }}>
      <input
        type="color"
        value={/^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000"}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid rgba(237,232,223,0.15)", padding: 2, background: "none", cursor: "pointer", flexShrink: 0 }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6B7E8A", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 3 }}>{label}</p>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", background: "rgba(237,232,223,0.04)", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 6, padding: "5px 8px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EDE8DF", outline: "none" }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.1)")}
        />
      </div>
    </div>
  );
}

function SelectField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6B7E8A", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        style={{ width: "100%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 6, padding: "7px 8px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EDE8DF", outline: "none", cursor: "pointer", ...selectArrowStyle }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: "#0C1117" }}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function NumberField({ label, value, onChange, step = 1, suffix }: { label: string; value: number; onChange: (v: number) => void; step?: number; suffix?: string }) {
  return (
    <div>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6B7E8A", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>{label}{suffix ? ` (${suffix})` : ""}</p>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        style={{ width: "100%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 6, padding: "7px 8px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EDE8DF", outline: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.1)")}
      />
    </div>
  );
}

function TextInputField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6B7E8A", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: "100%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 6, padding: "7px 10px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#EDE8DF", outline: "none" }}
        onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.1)")}
      />
    </div>
  );
}

// One tile in the Color Palette's Theme Gallery — a curated preset or a user-saved snapshot.
// Swatch dots preview accent/card/heading so a theme is recognizable before applying it.
function ThemeSwatch({
  name, colors, active, onClick, onDelete, visible, onToggleVisible, isDefault, onSetDefault, onRename,
  defaultMode, onSetDefaultMode, lockMode, onToggleLockMode,
}: {
  name: string;
  colors: CMSDesignColors;
  active?: boolean;
  onClick: () => void;
  onDelete?: () => void;
  /** Whether this theme is selectable in the visitor-facing style switcher — works the same way
   *  for a THEME_PRESETS entry (backed by CMSDesignSystem.visiblePresetIds, since the preset
   *  itself is a source-level constant with nowhere of its own to persist this) and a saved theme
   *  (backed by that theme's own `visible` field). */
  visible?: boolean;
  onToggleVisible?: () => void;
  isDefault?: boolean;
  onSetDefault?: () => void;
  /** Renaming a preset writes to presetNameOverrides (keyed by the preset's fixed id) rather than
   *  the preset object itself, which is a source-level constant; a saved theme's name field is
   *  just updated directly. Either way this component doesn't need to know which. */
  onRename?: (newName: string) => void;
  /** Which color mode this theme switches to when selected — undefined leaves the mode as-is. */
  defaultMode?: "dark" | "light";
  onSetDefaultMode?: (mode: "dark" | "light" | undefined) => void;
  /** When true, hides the visitor-facing Dark/Light switch entirely while this theme is active,
   *  forcing defaultMode instead — for a theme only ever designed for one mode. Only meaningful
   *  once defaultMode is set; toggling this on with no mode picked yet defaults to dark. */
  lockMode?: boolean;
  onToggleLockMode?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  function commitRename() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename?.(trimmed);
    setEditing(false);
  }

  const dots = (
    <div className="flex gap-1" style={{ marginBottom: 6 }}>
      <span style={{ width: 14, height: 14, borderRadius: "50%", background: colors.accentDark, border: "1px solid rgba(0,0,0,0.15)" }} />
      <span style={{ width: 14, height: 14, borderRadius: "50%", background: colors.cardDark, border: "1px solid rgba(255,255,255,0.1)" }} />
      <span style={{ width: 14, height: 14, borderRadius: "50%", background: colors.headingDark, border: "1px solid rgba(0,0,0,0.15)" }} />
    </div>
  );

  return (
    <div style={{ position: "relative" }}>
      {editing ? (
        // A plain div, not a <button> — an <input> isn't valid content inside a <button> element.
        <div style={{ width: 92, background: colors.bgDark, border: "1.5px solid #14ADB5", borderRadius: 10, padding: 8 }}>
          {dots}
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={(e) => e.target.select()}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commitRename(); }
              if (e.key === "Escape") { setDraft(name); setEditing(false); }
            }}
            style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: "none", borderRadius: 4, fontFamily: "'DM Mono', monospace", fontSize: 9, color: colors.textDark, letterSpacing: "0.02em", padding: "2px 3px", outline: "none" }}
          />
        </div>
      ) : (
        <button
          onClick={onClick}
          style={{
            width: 92, background: colors.bgDark, border: `${active ? 2 : 1.5}px solid ${active ? "#14ADB5" : "rgba(237,232,223,0.12)"}`,
            borderRadius: 10, padding: active ? 7 : 8, cursor: "pointer", textAlign: "left", display: "block",
            boxShadow: active ? "0 0 0 3px rgba(20,173,181,0.22)" : "none",
          }}
        >
          {dots}
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: colors.textDark, letterSpacing: "0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
            {name}
          </p>
          {active && (
            <p className="flex items-center gap-1" style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#14ADB5", letterSpacing: "0.06em", textTransform: "uppercase", margin: "4px 0 0" }}>
              <Check size={8} strokeWidth={3} /> Editing
            </p>
          )}
        </button>
      )}
      {onRename && !editing && (
        <button
          onClick={(e) => { e.stopPropagation(); setDraft(name); setEditing(true); }}
          title="Rename theme"
          style={{ position: "absolute", top: -6, left: -6, width: 16, height: 16, borderRadius: "50%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.2)", color: "#EDE8DF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
        >
          <Pencil size={8} />
        </button>
      )}
      {onDelete && !editing && (
        <button
          onClick={onDelete}
          title="Remove theme"
          style={{ position: "absolute", top: -6, right: -6, width: 16, height: 16, borderRadius: "50%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.2)", color: "#EDE8DF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}
        >
          <X size={9} />
        </button>
      )}
      {onToggleVisible && !editing && (
        <div className="flex items-center justify-between" style={{ marginTop: 4, padding: "0 1px" }}>
          <button
            onClick={onToggleVisible}
            title={visible ? "Visible to visitors in the style switcher — click to hide" : "Not shown to visitors — click to publish to the style switcher"}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: visible ? "#14ADB5" : "#8C9AA3" }}
          >
            {visible ? <Eye size={11} /> : <EyeOff size={11} />}
          </button>
          {visible && (
            <button
              onClick={onSetDefault}
              disabled={isDefault}
              title={isDefault ? "Default theme for new visitors" : "Set as default theme for new visitors"}
              style={{
                background: "none", border: "none", padding: "1px 3px", cursor: isDefault ? "default" : "pointer",
                fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: "0.04em", textTransform: "uppercase",
                color: isDefault ? "#14ADB5" : "#8C9AA3",
              }}
            >
              {isDefault ? "★ Default" : "Set default"}
            </button>
          )}
        </div>
      )}
      {onSetDefaultMode && !editing && (
        <div className="flex items-center justify-end gap-1" style={{ marginTop: 3, padding: "0 1px" }}>
          <button
            onClick={() => onSetDefaultMode(defaultMode === "dark" ? undefined : "dark")}
            title={defaultMode === "dark" ? "Defaults to dark mode — click to unset" : "Default to dark mode when selected"}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: defaultMode === "dark" ? "#14ADB5" : "#8C9AA3" }}
          >
            <Moon size={10} />
          </button>
          <button
            onClick={() => onSetDefaultMode(defaultMode === "light" ? undefined : "light")}
            title={defaultMode === "light" ? "Defaults to light mode — click to unset" : "Default to light mode when selected"}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: defaultMode === "light" ? "#14ADB5" : "#8C9AA3" }}
          >
            <Sun size={10} />
          </button>
          {onToggleLockMode && (
            <button
              onClick={() => onToggleLockMode()}
              title={
                lockMode
                  ? "Only this mode is shown to visitors — click to allow switching again"
                  : `Lock visitors to ${defaultMode ?? "dark"} mode only, hiding the switch (picks dark if no mode is set yet)`
              }
              style={{ background: "none", border: "none", cursor: "pointer", padding: 2, display: "flex", color: lockMode ? "#14ADB5" : "#8C9AA3" }}
            >
              {lockMode ? <Lock size={10} /> : <Unlock size={10} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Standalone dark/light color pair that is NOT accent-following — used for colors that have
// their own sensible fixed default (a panel background, a switch thumb) rather than tracking
// Accent. "Reset to Default" restores the two values passed in via `defaultDark`/`defaultLight`.
function PlainColorPairControl({
  label, darkValue, lightValue, defaultDark, defaultLight, onDarkChange, onLightChange,
}: {
  label: string;
  darkValue: string;
  lightValue: string;
  defaultDark: string;
  defaultLight: string;
  onDarkChange: (v: string) => void;
  onLightChange: (v: string) => void;
}) {
  const isDefault = darkValue === defaultDark && lightValue === defaultLight;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#EDE8DF", fontWeight: 500 }}>{label}</p>
        {!isDefault && (
          <button
            onClick={() => { onDarkChange(defaultDark); onLightChange(defaultLight); }}
            className="flex items-center gap-1.5 hover:opacity-70 transition-opacity"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#8C9AA3", fontFamily: "'DM Mono', monospace", fontSize: 10 }}
          >
            <RotateCcw size={10} /> Reset to Default
          </button>
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <ColorInput label="Dark mode" value={darkValue} onChange={onDarkChange} />
        <ColorInput label="Light mode" value={lightValue} onChange={onLightChange} />
      </div>
    </div>
  );
}

function ToggleField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6B7E8A", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>{label}</p>
      <button
        type="button"
        onClick={() => onChange(!value)}
        style={{
          width: "100%", background: value ? "rgba(20,173,181,0.15)" : "#0C1117",
          border: `1px solid ${value ? "#14ADB5" : "rgba(237,232,223,0.1)"}`, borderRadius: 6, padding: "7px 8px",
          cursor: "pointer", color: value ? "#14ADB5" : "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: 11,
        }}
      >
        {value ? "On" : "Off"}
      </button>
    </div>
  );
}

const FOLLOW_LABELS: Record<AccentFollow, string> = { accent: "Accent", accent2: "Accent 2", accent3: "Accent 3" };

// Dark/light color override for one component category, defaulting to (and previewing as) one
// of the Accent swatches — Accent, or Accent 2 / Accent 3 when those exist — when no literal
// override is set. "Reset to Accent" deletes the override and resets the follow choice back to
// the primary Accent.
type ComponentColorKey = Exclude<keyof CMSComponentColors, "followAccent">;

function ComponentColorControl({
  label, darkKey, lightKey, componentColors, colors, onChange,
}: {
  label: string;
  darkKey: ComponentColorKey;
  lightKey: ComponentColorKey;
  componentColors: CMSComponentColors;
  colors: CMSDesignColors;
  onChange: (patch: Partial<CMSComponentColors>) => void;
}) {
  const role = darkKey.replace(/Dark$/, "");
  const hasAccent2 = colors.accent2Dark !== undefined;
  const hasAccent3 = colors.accent3Dark !== undefined;
  const follow: AccentFollow = componentColors.followAccent?.[role] ?? "accent";
  const isOverridden = !!(componentColors[darkKey] || componentColors[lightKey]);

  function accentValue(f: AccentFollow, mode: "Dark" | "Light"): string {
    if (f === "accent2") return (mode === "Dark" ? colors.accent2Dark : colors.accent2Light) ?? colors.accentDark;
    if (f === "accent3") return (mode === "Dark" ? colors.accent3Dark : colors.accent3Light) ?? colors.accentDark;
    return mode === "Dark" ? colors.accentDark : colors.accentLight;
  }

  const darkValue = componentColors[darkKey] ?? accentValue(follow, "Dark");
  const lightValue = componentColors[lightKey] ?? accentValue(follow, "Light");

  function setFollow(next: AccentFollow) {
    onChange({ [darkKey]: undefined, [lightKey]: undefined, followAccent: { ...componentColors.followAccent, [role]: next } });
  }

  function resetToAccent() {
    onChange({ [darkKey]: undefined, [lightKey]: undefined, followAccent: { ...componentColors.followAccent, [role]: "accent" } });
  }

  const followOptions: AccentFollow[] = ["accent", ...(hasAccent2 ? (["accent2", ...(hasAccent3 ? ["accent3"] : [])] as AccentFollow[]) : [])];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#EDE8DF", fontWeight: 500 }}>{label} Color</p>
      </div>
      {hasAccent2 && !isOverridden && (
        <div className="flex items-center gap-1.5 mb-2">
          {followOptions.map((f) => (
            <button
              key={f}
              onClick={() => setFollow(f)}
              style={{
                padding: "4px 10px", borderRadius: 999, border: `1px solid ${follow === f ? "#14ADB5" : "rgba(237,232,223,0.12)"}`,
                background: follow === f ? "rgba(20,173,181,0.12)" : "transparent", cursor: "pointer",
                fontFamily: "'DM Mono', monospace", fontSize: 9.5, letterSpacing: "0.04em",
                color: follow === f ? "#14ADB5" : "#8C9AA3",
              }}
            >
              {FOLLOW_LABELS[f]}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <ColorInput label="Dark mode" value={darkValue} onChange={(v) => onChange({ [darkKey]: v })} />
        <ColorInput label="Light mode" value={lightValue} onChange={(v) => onChange({ [lightKey]: v })} />
      </div>
      <div className="flex items-center gap-3 mt-1.5">
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, color: "#6B7E8A" }}>
          {isOverridden
            ? "Custom color set — no longer following Accent."
            : `Currently following ${FOLLOW_LABELS[follow]} — edit to override.`}
        </p>
        {isOverridden && (
          <button
            onClick={resetToAccent}
            className="flex items-center gap-1.5 hover:opacity-70 transition-opacity flex-shrink-0"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#14ADB5", fontFamily: "'DM Mono', monospace", fontSize: 10 }}
          >
            <RotateCcw size={10} /> Reset to Accent
          </button>
        )}
      </div>
    </div>
  );
}

interface ResolvedPairing {
  heading: string;
  body: string;
  mono: string;
}

function PreviewCard({ mode, colors, pairing }: { mode: "dark" | "light"; colors: CMSDesignColors; pairing: ResolvedPairing }) {
  const suffix = mode === "dark" ? "Dark" : "Light";
  const get = (base: string) => colors[`${base}${suffix}` as keyof CMSDesignColors];

  return (
    <div style={{ background: get("bg"), borderRadius: 14, padding: 22, border: "1px solid rgba(237,232,223,0.06)" }}>
      <p style={{ fontFamily: pairing.mono, fontSize: 9, color: get("accent"), letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 12 }}>
        {mode === "dark" ? "Dark Mode" : "Light Mode"}
      </p>
      <p style={{ fontFamily: pairing.heading, fontSize: 24, color: get("heading"), marginBottom: 8, lineHeight: 1.2 }}>
        Design that solves problems
      </p>
      <p style={{ fontFamily: pairing.body, fontSize: 13, color: get("body"), lineHeight: 1.6, marginBottom: 14, fontWeight: 300 }}>
        Sample paragraph text showing how body copy reads with these settings.
      </p>
      <div style={{ borderTop: `1px solid ${get("divider")}`, paddingTop: 12, marginBottom: 14 }}>
        <p style={{ fontFamily: pairing.mono, fontSize: 10, color: get("muted"), letterSpacing: "0.04em" }}>Muted label · caption text</p>
      </div>
      <div style={{ background: get("card"), borderRadius: 10, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontFamily: pairing.body, fontSize: 12, color: get("text") }}>Card surface</span>
        <span style={{ fontFamily: pairing.mono, fontSize: 11, color: get("accent") }}>Accent link →</span>
      </div>
    </div>
  );
}

const TYPE_SCALE_ROWS: { key: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "small" | "xsmall"; label: string; isHeading: boolean }[] = [
  { key: "h1", label: "h1", isHeading: true },
  { key: "h2", label: "h2", isHeading: true },
  { key: "h3", label: "h3", isHeading: true },
  { key: "h4", label: "h4", isHeading: false },
  { key: "h5", label: "h5", isHeading: false },
  { key: "h6", label: "h6", isHeading: true },
  { key: "p", label: "p", isHeading: false },
  { key: "small", label: "small", isHeading: false },
  { key: "xsmall", label: "xs", isHeading: false },
];

// Only rendered when fontPairing === "custom". H4/H5 are shown in the preview for completeness
// (matching the reference type-scale tool) but aren't editable here — they keep their own
// distinct treatments elsewhere (a body-font subheading and a mono-font eyebrow label) and
// aren't part of this H1–H3/H6 heading hierarchy or the Labels size below.
type SizeUnit = "rem" | "px" | "pt";

// rem and pt are always derived from the computed px value using fixed browser-standard
// ratios (16px root font-size, 96 DPI) — not from the chosen base font-size — since that's
// what an actual `font-size: Xrem`/`Xpt` CSS declaration resolves to on this site.
function formatSize(px: number, unit: SizeUnit): string {
  if (unit === "px") return `${px}px`;
  if (unit === "rem") return `${Math.round((px / 16) * 1000) / 1000}rem`;
  return `${Math.round(px * 0.75 * 100) / 100}pt`;
}

function TypeScaleEditor({ typeScale, onChange }: { typeScale: CMSTypeScale; onChange: (patch: Partial<CMSTypeScale>) => void }) {
  const [unit, setUnit] = useState<SizeUnit>("px");
  // Which base+ratio pair the Base font-size/Scale fields (and the preview) currently edit —
  // "mobile" falls back to a copy of the desktop values until the admin actually changes
  // something, rather than starting from a blank/zero pair. typeScale.mobile itself stays
  // undefined until that first edit, which is what keeps the public site's mobile override
  // (buildDesignSystemCss, store/contentStore.ts) a strict opt-in.
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const activeScale = device === "mobile"
    ? (typeScale.mobile ?? { baseFontSize: typeScale.baseFontSize, scaleRatio: typeScale.scaleRatio })
    : { baseFontSize: typeScale.baseFontSize, scaleRatio: typeScale.scaleRatio };
  const sizes = computeTypeScaleSizes(activeScale.baseFontSize, activeScale.scaleRatio);

  function updateActiveScale(patch: Partial<{ baseFontSize: number; scaleRatio: number }>) {
    if (device === "desktop") {
      onChange(patch);
      return;
    }
    onChange({ mobile: { ...activeScale, ...patch } });
  }

  function updateBody(patch: Partial<CMSTypeScale["body"]>) {
    onChange({ body: { ...typeScale.body, ...patch } });
  }
  function updateHeadings(patch: Partial<CMSTypeScale["headings"]>) {
    onChange({ headings: { ...typeScale.headings, ...patch } });
  }
  function updateLabels(patch: Partial<CMSTypeScale["labels"]>) {
    onChange({ labels: { ...typeScale.labels, ...patch } });
  }

  const sectionLabelStyle: React.CSSProperties = { fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#14ADB5", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 };

  return (
    <div style={{ background: "#0C1117", border: "1px solid rgba(237,232,223,0.06)", borderRadius: 14, padding: 24, marginTop: 16, marginBottom: 8 }}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left column: controls */}
        <div>
          <div className="mb-5">
            <TextInputField label="Preview text" value={typeScale.previewText} onChange={(v) => onChange({ previewText: v })} />
          </div>

          <div className="flex items-center gap-1 mb-3">
            {(["desktop", "mobile"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                style={{
                  padding: "5px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase",
                  background: device === d ? "rgba(20,173,181,0.15)" : "transparent",
                  color: device === d ? "#14ADB5" : "#6B7E8A",
                }}
              >
                {d}
              </button>
            ))}
          </div>
          {device === "mobile" && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, color: "#6B7E8A", marginBottom: 10, lineHeight: 1.5 }}>
              {typeScale.mobile
                ? "Applies below 768px — page headings, hero statements, and rich text all switch to these sizes."
                : "Starts as a copy of Desktop — change a value below to enable a mobile-specific scale (applies below 768px)."}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <NumberField label="Base font-size" value={activeScale.baseFontSize} onChange={(v) => updateActiveScale({ baseFontSize: v })} suffix="px" />
            <SelectField
              label="Scale"
              value={String(activeScale.scaleRatio)}
              onChange={(v) => updateActiveScale({ scaleRatio: parseFloat(v) })}
              options={TYPE_SCALE_RATIOS.map((r) => ({ value: String(r.value), label: r.label }))}
            />
          </div>

          <p style={sectionLabelStyle}>Body</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <SelectField label="Font" value={typeScale.body.font} onChange={(v) => updateBody({ font: v })} options={CUSTOM_BODY_FONTS.map((f) => ({ value: f.css, label: f.label }))} />
            <SelectField label="Weight" value={String(typeScale.body.weight)} onChange={(v) => updateBody({ weight: parseInt(v) })} options={FONT_WEIGHTS.map((w) => ({ value: String(w), label: String(w) }))} />
            <NumberField label="Line-height" value={typeScale.body.lineHeight} onChange={(v) => updateBody({ lineHeight: v })} step={0.05} />
            <NumberField label="Letter-spacing" value={typeScale.body.letterSpacing} onChange={(v) => updateBody({ letterSpacing: v })} step={0.005} suffix="em" />
          </div>

          <p style={sectionLabelStyle}>Headings — H1–H6, S, XS</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            <SelectField label="Font" value={typeScale.headings.font} onChange={(v) => updateHeadings({ font: v })} options={CUSTOM_HEADING_FONTS.map((f) => ({ value: f.css, label: f.label }))} />
            <SelectField label="Weight" value={String(typeScale.headings.weight)} onChange={(v) => updateHeadings({ weight: parseInt(v) })} options={FONT_WEIGHTS.map((w) => ({ value: String(w), label: String(w) }))} />
            <NumberField label="Line-height" value={typeScale.headings.lineHeight} onChange={(v) => updateHeadings({ lineHeight: v })} step={0.05} />
            <NumberField label="Letter-spacing" value={typeScale.headings.letterSpacing} onChange={(v) => updateHeadings({ letterSpacing: v })} step={0.005} suffix="em" />
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, color: "#6B7E8A", marginBottom: 20, lineHeight: 1.5 }}>
            H4 (subheading) and H5 (eyebrow label) keep their own distinct styles, independent of this Headings group.
          </p>

          <p style={sectionLabelStyle}>Secondary Font</p>
          <div className="mb-2">
            <SelectField label="Font" value={typeScale.headings.secondaryFont} onChange={(v) => updateHeadings({ secondaryFont: v })} options={CUSTOM_HEADING_FONTS.map((f) => ({ value: f.css, label: f.label }))} />
          </div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, color: "#6B7E8A", marginBottom: 20, lineHeight: 1.5 }}>
            Selectable inline in the rich text editor toolbar — mix this font with the body font within the same sentence for emphasis.
          </p>

          <p style={sectionLabelStyle}>Labels / Mono</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SelectField label="Font" value={typeScale.labels.font} onChange={(v) => updateLabels({ font: v })} options={CUSTOM_MONO_FONTS.map((f) => ({ value: f.css, label: f.label }))} />
            <NumberField label="Font-size" value={typeScale.labels.fontSize} onChange={(v) => updateLabels({ fontSize: v })} suffix="px" />
            <SelectField label="Weight" value={String(typeScale.labels.weight)} onChange={(v) => updateLabels({ weight: parseInt(v) })} options={FONT_WEIGHTS.map((w) => ({ value: String(w), label: String(w) }))} />
          </div>
        </div>

        {/* Right column: live preview */}
        <div style={{ background: "#141D24", borderRadius: 12, padding: "18px 20px" }}>
          <div className="flex items-center gap-1 mb-3">
            {(["rem", "px", "pt"] as SizeUnit[]).map((u) => (
              <button
                key={u}
                onClick={() => setUnit(u)}
                style={{
                  padding: "4px 10px", borderRadius: 6, border: "none", cursor: "pointer",
                  fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.04em", textTransform: "uppercase",
                  background: unit === u ? "rgba(20,173,181,0.15)" : "transparent",
                  color: unit === u ? "#14ADB5" : "#6B7E8A",
                }}
              >
                {u}
              </button>
            ))}
          </div>
          {TYPE_SCALE_ROWS.map((row) => {
            const font = row.isHeading ? typeScale.headings.font : typeScale.body.font;
            const weight = row.isHeading ? typeScale.headings.weight : typeScale.body.weight;
            const size = sizes[row.key];
            return (
              <div key={row.key} className="flex items-baseline gap-3" style={{ borderBottom: "1px solid rgba(237,232,223,0.05)", padding: "7px 0" }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6B7E8A", width: 26, flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6B7E8A", width: 52, flexShrink: 0 }}>{formatSize(size, unit)}</span>
                <span
                  style={{
                    fontFamily: font,
                    fontWeight: weight,
                    fontSize: Math.min(size, 38),
                    color: "#EDE8DF",
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {typeScale.previewText || "Preview text"}
                </span>
              </div>
            );
          })}
          {/* Labels isn't part of the H1–H6/p/small mathematical scale — it's its own role
              (matching the Labels/Mono controls above) with a directly-set size, not computed. */}
          <div className="flex items-baseline gap-3" style={{ padding: "7px 0" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6B7E8A", width: 26, flexShrink: 0 }}>labels</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6B7E8A", width: 52, flexShrink: 0 }}>{formatSize(typeScale.labels.fontSize, unit)}</span>
            <span
              style={{
                fontFamily: typeScale.labels.font,
                fontWeight: typeScale.labels.weight,
                fontSize: typeScale.labels.fontSize,
                color: "#8C9AA3",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                minWidth: 0,
              }}
            >
              {typeScale.previewText || "Preview text"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component preview shell ────────────────────────────────────────────────────
// Every section below (Buttons through Tab Bar) previews live against the draft colors/font
// above — before Save Changes — so it re-renders inline styles directly from `colors`/`pairing`
// rather than the live site's CSS variables (which only update once persisted). The real,
// functioning versions of these components live in components/SiteKit.tsx and read the CSS
// variables directly; what's rendered here is a same-look preview, not the live component.

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <div id={id} style={{ scrollMarginTop: 20 }}>
      <CMSSectionHeading>{title}</CMSSectionHeading>
      {note && (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", marginTop: -12, marginBottom: 14, lineHeight: 1.5 }}>{note}</p>
      )}
      <div
        style={{ background: "#0C1117", border: "1px solid rgba(237,232,223,0.06)", borderRadius: 14, padding: 24, marginBottom: 28 }}
      >
        {children}
      </div>
    </div>
  );
}

const BUTTON_VARIANT_LABELS: Record<ButtonVariantId, string> = {
  primary: "Primary",
  secondary: "Secondary",
  tertiary: "Tertiary",
};

function ButtonVariantEditor({
  variantId, style, fontHeading, fontBody, fontMono, btnColor, bgColor, onChange,
}: {
  variantId: ButtonVariantId;
  style: CMSButtonVariantStyle;
  fontHeading: string;
  fontBody: string;
  fontMono: string;
  btnColor: string;
  bgColor: string;
  onChange: (patch: Partial<CMSButtonVariantStyle>) => void;
}) {
  const fontMap = { heading: fontHeading, body: fontBody, mono: fontMono };
  const sizeStyle = BUTTON_SIZE_STYLE[style.size];
  const fillStyle: React.CSSProperties =
    style.fill === "fill"
      ? { background: btnColor, color: bgColor, border: `1px solid ${btnColor}` }
      : style.fill === "outline"
      ? { background: "transparent", color: btnColor, border: `1px solid ${btnColor}` }
      : { background: "transparent", color: btnColor, border: "none" };

  const previewStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: sizeStyle.padding,
    fontSize: sizeStyle.fontSize,
    borderRadius: BUTTON_CORNER_RADIUS[style.corner],
    fontFamily: fontMap[style.font],
    textTransform: style.uppercase ? "uppercase" : "none",
    letterSpacing: style.uppercase ? "0.06em" : "normal",
    ...fillStyle,
  };

  return (
    <div style={{ background: "#141D24", border: "1px solid rgba(237,232,223,0.08)", borderRadius: 12, padding: 16, marginBottom: 12 }}>
      <div className="flex items-center justify-between mb-3">
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#EDE8DF", fontWeight: 500 }}>{BUTTON_VARIANT_LABELS[variantId]}</p>
        <span style={previewStyle}>
          {style.icon === "left" && <Send size={13} />}
          {BUTTON_VARIANT_LABELS[variantId] === "Primary" ? "Get in touch" : BUTTON_VARIANT_LABELS[variantId] === "Secondary" ? "View My Work" : "Cancel"}
          {style.icon === "right" && <Send size={13} />}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <SelectField label="Style" value={style.fill} onChange={(v) => onChange({ fill: v })} options={[
          { value: "fill", label: "Fill" }, { value: "outline", label: "Outline" }, { value: "text", label: "Text" },
        ]} />
        <SelectField label="Corner" value={style.corner} onChange={(v) => onChange({ corner: v })} options={[
          { value: "square", label: "Square" }, { value: "sharp", label: "Sharp" }, { value: "soft", label: "Soft" }, { value: "round", label: "Round" }, { value: "pill", label: "Pill" },
        ]} />
        <SelectField label="Icon" value={style.icon} onChange={(v) => onChange({ icon: v })} options={[
          { value: "none", label: "None" }, { value: "left", label: "Left" }, { value: "right", label: "Right" },
        ]} />
        <SelectField label="Font" value={style.font} onChange={(v) => onChange({ font: v })} options={[
          { value: "heading", label: "Heading" }, { value: "body", label: "Body" }, { value: "mono", label: "Mono" },
        ]} />
        <SelectField label="Size" value={style.size} onChange={(v) => onChange({ size: v })} options={[
          { value: "sm", label: "Small" }, { value: "md", label: "Medium" }, { value: "lg", label: "Large" },
        ]} />
        <ToggleField label="Uppercase" value={style.uppercase} onChange={(v) => onChange({ uppercase: v })} />
      </div>
    </div>
  );
}

export function DesignSystemSection({ data: rawData, branding, socials, notFound, companies, companyCreditCopy, onChange: onChangeProp, onBrandingChange, onSocialsChange, onNotFoundChange, onCompaniesChange, onCompanyCreditCopyChange }: Props) {
  const [checkPreview, setCheckPreview] = useState(true);
  const [radioPreview, setRadioPreview] = useState("a");
  const [switchPreview, setSwitchPreview] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tabPreview, setTabPreview] = useState("work");
  const [linkHovered, setLinkHovered] = useState(false);
  const [namingTheme, setNamingTheme] = useState(false);
  // Which swatch is currently loaded into the editor below — purely local UI state (not
  // persisted, not derived from the live colors themselves) so it stays put while you tweak
  // things and the live values naturally diverge from that theme's own saved snapshot. Cleared
  // by nothing except picking a different swatch; there's no way back to an explicit "none"
  // short of reloading the page, same as there's no "Original" swatch in this gallery to click.
  const [activeThemeId, setActiveThemeId] = useState<string | null>(null);
  const [themeName, setThemeName] = useState("");
  const companiesDrag = useDragReorder(companies, onCompaniesChange);

  // Defensive: content saved (or, in dev, still held in React state via Fast Refresh) before
  // these fields existed in the schema won't have them — fall back to defaults rather than
  // crash. getContent() also backfills these on a real page load; this just covers the same
  // gap for content that's already in memory.
  const data: CMSDesignSystem = {
    ...rawData,
    componentColors: rawData.componentColors ?? {},
    buttonStyles: rawData.buttonStyles ?? DEFAULT_DESIGN_SYSTEM.buttonStyles,
    linkUnderline: rawData.linkUnderline ?? "none",
    typeScale: rawData.typeScale ?? DEFAULT_DESIGN_SYSTEM.typeScale,
    menuStyle: rawData.menuStyle ?? DEFAULT_DESIGN_SYSTEM.menuStyle,
    tabBarStyle: rawData.tabBarStyle ?? DEFAULT_DESIGN_SYSTEM.tabBarStyle,
    textAreaStyle: rawData.textAreaStyle ?? DEFAULT_DESIGN_SYSTEM.textAreaStyle,
    switchStyle: rawData.switchStyle ?? DEFAULT_DESIGN_SYSTEM.switchStyle,
    tagStyle: rawData.tagStyle ?? DEFAULT_DESIGN_SYSTEM.tagStyle,
    cardStyle: rawData.cardStyle ?? DEFAULT_DESIGN_SYSTEM.cardStyle,
    statsStyle: rawData.statsStyle ?? DEFAULT_DESIGN_SYSTEM.statsStyle ?? {},
    savedThemes: rawData.savedThemes ?? [],
    visiblePresetIds: rawData.visiblePresetIds ?? DEFAULT_DESIGN_SYSTEM.visiblePresetIds ?? [],
    presetNameOverrides: rawData.presetNameOverrides ?? {},
    presetOverrides: rawData.presetOverrides ?? {},
    removedPresetIds: rawData.removedPresetIds ?? [],
  };

  // What the Theme Gallery actually renders for presets — filters out anything removed. Paired
  // with data.savedThemes.length for the "always keep at least one theme" guard below.
  const galleryPresets = THEME_PRESETS.filter((t) => !(data.removedPresetIds ?? []).includes(t.id));
  const totalThemes = galleryPresets.length + data.savedThemes.length;

  // Every field-editing handler below (colors, corners, buttons, fonts, components...) calls
  // this rather than onChangeProp directly — so an edit made while a theme is loaded (see
  // activeThemeId) lands in that theme's own stored snapshot too, not just the live root. Without
  // this, "Save Changes" only ever persisted the live root; a theme's own colors stayed frozen at
  // whatever they were the last time it was explicitly re-synced, and nothing about a successful
  // save indicated that the theme itself hadn't actually changed.
  //
  // Theme-gallery operations (apply/save-as/rename/delete/visibility/default/reset) call
  // onChangeProp directly instead, bypassing this — switching *which* theme is active must never
  // fold the just-loaded theme's own values back into whatever was active a moment ago, and an
  // operation that's already writing its own explicit snapshot (applyTheme, saveCurrentAsTheme)
  // would otherwise double-write using a stale activeThemeId from before React re-renders with it.
  function onChange(next: CMSDesignSystem) {
    if (!activeThemeId) { onChangeProp(next); return; }
    const snapshot: Partial<CMSSavedTheme> = {
      colors: next.colors,
      fontPairing: next.fontPairing,
      typeScale: next.typeScale,
      componentColors: next.componentColors,
      buttonStyles: next.buttonStyles,
      menuStyle: next.menuStyle,
      tabBarStyle: next.tabBarStyle,
      textAreaStyle: next.textAreaStyle,
      switchStyle: next.switchStyle,
      tagStyle: next.tagStyle,
      cardStyle: next.cardStyle,
    };
    if (THEME_PRESETS.some((t) => t.id === activeThemeId)) {
      onChangeProp({
        ...next,
        presetOverrides: { ...(next.presetOverrides ?? {}), [activeThemeId]: { ...(next.presetOverrides?.[activeThemeId] ?? {}), ...snapshot } },
      });
    } else {
      onChangeProp({ ...next, savedThemes: next.savedThemes.map((t) => (t.id === activeThemeId ? { ...t, ...snapshot } : t)) });
    }
  }

  function updateColor(key: keyof CMSDesignColors, value: string) {
    onChange({ ...data, colors: { ...data.colors, [key]: value } });
  }

  function updateColors(patch: Partial<CMSDesignColors>) {
    onChange({ ...data, colors: { ...data.colors, ...patch } });
  }

  // Applying a theme replaces the whole palette (including any Accent 2/3), plus every other
  // field the theme actually carries — a curated THEME_PRESETS entry or an older saved theme
  // only ever has `colors`, so this leaves fonts/buttons/components alone for those; a theme
  // saved since this expanded to a full snapshot restores everything at once.
  function applyTheme(theme: CMSSavedTheme) {
    setActiveThemeId(theme.id);
    onChangeProp({
      ...data,
      colors: { ...theme.colors },
      ...(theme.fontPairing ? { fontPairing: theme.fontPairing } : {}),
      ...(theme.typeScale ? { typeScale: theme.typeScale } : {}),
      ...(theme.componentColors ? { componentColors: theme.componentColors } : {}),
      ...(theme.buttonStyles ? { buttonStyles: theme.buttonStyles } : {}),
      ...(theme.menuStyle ? { menuStyle: theme.menuStyle } : {}),
      ...(theme.tabBarStyle ? { tabBarStyle: theme.tabBarStyle } : {}),
      ...(theme.textAreaStyle ? { textAreaStyle: theme.textAreaStyle } : {}),
      ...(theme.switchStyle ? { switchStyle: theme.switchStyle } : {}),
      ...(theme.tagStyle ? { tagStyle: theme.tagStyle } : {}),
      ...(theme.cardStyle ? { cardStyle: theme.cardStyle } : {}),
    });
  }

  function saveCurrentAsTheme(name: string) {
    const theme: CMSSavedTheme = {
      id: `theme-${Date.now()}`,
      name,
      colors: data.colors,
      fontPairing: data.fontPairing,
      typeScale: data.typeScale,
      componentColors: data.componentColors,
      buttonStyles: data.buttonStyles,
      menuStyle: data.menuStyle,
      tabBarStyle: data.tabBarStyle,
      textAreaStyle: data.textAreaStyle,
      switchStyle: data.switchStyle,
      tagStyle: data.tagStyle,
      cardStyle: data.cardStyle,
    };
    setActiveThemeId(theme.id);
    onChangeProp({ ...data, savedThemes: [...data.savedThemes, theme] });
  }

  function deleteTheme(id: string) {
    if (totalThemes <= 1) return; // the Theme Gallery always keeps at least one theme
    if (activeThemeId === id) setActiveThemeId(null);
    onChangeProp({
      ...data,
      savedThemes: data.savedThemes.filter((t) => t.id !== id),
      // A deleted theme can't stay the default for new visitors — falls back to Original.
      defaultVisitorThemeId: data.defaultVisitorThemeId === id ? undefined : data.defaultVisitorThemeId,
    });
  }

  // Presets are source-level constants (THEME_PRESETS), so "removing" one can't splice it out of
  // an array the way deleteTheme does — instead it's permanently filtered out of the gallery via
  // removedPresetIds, with its visibility/name/color overrides cleared alongside it so nothing
  // orphaned lingers keyed to an id the gallery no longer shows.
  function removePreset(id: string) {
    if (totalThemes <= 1) return;
    if (activeThemeId === id) setActiveThemeId(null);
    const { [id]: _removedOverride, ...restOverrides } = data.presetOverrides ?? {};
    const { [id]: _removedName, ...restNames } = data.presetNameOverrides ?? {};
    onChangeProp({
      ...data,
      removedPresetIds: [...(data.removedPresetIds ?? []), id],
      visiblePresetIds: (data.visiblePresetIds ?? []).filter((pid) => pid !== id),
      presetOverrides: restOverrides,
      presetNameOverrides: restNames,
      defaultVisitorThemeId: data.defaultVisitorThemeId === id ? undefined : data.defaultVisitorThemeId,
    });
  }

  function toggleThemeVisible(id: string) {
    const theme = data.savedThemes.find((t) => t.id === id);
    const nowVisible = !theme?.visible;
    onChangeProp({
      ...data,
      savedThemes: data.savedThemes.map((t) => (t.id === id ? { ...t, visible: nowVisible } : t)),
      // Hiding the current default falls back to Original rather than leaving new visitors
      // defaulted into a theme they can no longer actually select.
      defaultVisitorThemeId: !nowVisible && data.defaultVisitorThemeId === id ? undefined : data.defaultVisitorThemeId,
    });
  }

  function setDefaultVisitorTheme(id: string | undefined) {
    onChangeProp({ ...data, defaultVisitorThemeId: id });
  }

  // THEME_PRESETS entries are source-level constants, not persisted content — visibility and
  // rename overrides live on CMSDesignSystem instead (visiblePresetIds / presetNameOverrides),
  // keyed by the preset's own fixed id. No delete equivalent: a preset can be hidden, not removed.
  function togglePresetVisible(id: string) {
    const current = data.visiblePresetIds ?? [];
    const nowVisible = !current.includes(id);
    onChangeProp({
      ...data,
      visiblePresetIds: nowVisible ? [...current, id] : current.filter((pid) => pid !== id),
      defaultVisitorThemeId: !nowVisible && data.defaultVisitorThemeId === id ? undefined : data.defaultVisitorThemeId,
    });
  }

  function renamePreset(id: string, newName: string) {
    onChangeProp({ ...data, presetNameOverrides: { ...(data.presetNameOverrides ?? {}), [id]: newName } });
  }

  function renameSavedTheme(id: string, newName: string) {
    onChangeProp({ ...data, savedThemes: data.savedThemes.map((t) => (t.id === id ? { ...t, name: newName } : t)) });
  }

  function setPresetDefaultMode(id: string, mode: "dark" | "light" | undefined) {
    onChangeProp({ ...data, presetOverrides: { ...(data.presetOverrides ?? {}), [id]: { ...(data.presetOverrides?.[id] ?? {}), defaultMode: mode } } });
  }

  function setSavedThemeDefaultMode(id: string, mode: "dark" | "light" | undefined) {
    onChangeProp({ ...data, savedThemes: data.savedThemes.map((t) => (t.id === id ? { ...t, defaultMode: mode } : t)) });
  }

  // Locking with no defaultMode set yet wouldn't mean anything (locked to *what*?) — defaults to
  // dark in that case, same as a visitor gets today before ever touching the switch.
  function togglePresetLockMode(id: string) {
    const current = data.presetOverrides?.[id];
    const nowLocked = !current?.lockMode;
    onChangeProp({
      ...data,
      presetOverrides: { ...(data.presetOverrides ?? {}), [id]: { ...current, lockMode: nowLocked, defaultMode: current?.defaultMode ?? "dark" } },
    });
  }

  function toggleSavedThemeLockMode(id: string) {
    onChangeProp({
      ...data,
      savedThemes: data.savedThemes.map((t) => (t.id === id ? { ...t, lockMode: !t.lockMode, defaultMode: t.defaultMode ?? "dark" } : t)),
    });
  }

  function updateComponentColors(patch: Partial<CMSComponentColors>) {
    onChange({ ...data, componentColors: { ...data.componentColors, ...patch } });
  }

  function updateButtonStyle(variantId: ButtonVariantId, patch: Partial<CMSButtonVariantStyle>) {
    onChange({ ...data, buttonStyles: { ...data.buttonStyles, [variantId]: { ...data.buttonStyles[variantId], ...patch } } });
  }

  function updateTypeScale(patch: Partial<CMSTypeScale>) {
    onChange({ ...data, typeScale: { ...data.typeScale, ...patch } });
  }

  function updateMenuStyle(patch: Partial<typeof data.menuStyle>) {
    onChange({ ...data, menuStyle: { ...data.menuStyle, ...patch } });
  }

  function updateTabBarStyle(patch: Partial<typeof data.tabBarStyle>) {
    onChange({ ...data, tabBarStyle: { ...data.tabBarStyle, ...patch } });
  }

  function updateTagStyle(patch: Partial<NonNullable<typeof data.tagStyle>>) {
    onChange({ ...data, tagStyle: { ...(data.tagStyle ?? DEFAULT_DESIGN_SYSTEM.tagStyle!), ...patch } });
  }

  function updateCardStyle(patch: Partial<NonNullable<typeof data.cardStyle>>) {
    onChange({ ...data, cardStyle: { ...(data.cardStyle ?? DEFAULT_DESIGN_SYSTEM.cardStyle!), ...patch } });
  }

  function updateStatsStyle(patch: Partial<NonNullable<typeof data.statsStyle>>) {
    onChange({ ...data, statsStyle: { ...(data.statsStyle ?? {}), ...patch } });
  }

  function updateTextAreaStyle(patch: Partial<typeof data.textAreaStyle>) {
    onChange({ ...data, textAreaStyle: { ...data.textAreaStyle, ...patch } });
  }

  function updateSwitchStyle(patch: Partial<typeof data.switchStyle>) {
    onChange({ ...data, switchStyle: { ...data.switchStyle, ...patch } });
  }

  const c = data.colors;
  const cc = data.componentColors;
  const isCustomFont = data.fontPairing === "custom";
  const presetPairing = FONT_PAIRINGS.find((f) => f.id === data.fontPairing) ?? FONT_PAIRINGS[0];
  const pairing: ResolvedPairing = isCustomFont
    ? { heading: data.typeScale.headings.font, body: data.typeScale.body.font, mono: data.typeScale.labels.font }
    : { heading: presetPairing.heading, body: presetPairing.body, mono: presetPairing.mono };

  // Effective (override ?? followed accent) color per component, for previews below.
  const effective = (darkKey: Exclude<keyof CMSComponentColors, "followAccent">): string => {
    const literal = cc[darkKey];
    if (literal) return literal;
    const follow = cc.followAccent?.[darkKey.replace(/Dark$/, "")] ?? "accent";
    if (follow === "accent2") return c.accent2Dark ?? c.accentDark;
    if (follow === "accent3") return c.accent3Dark ?? c.accentDark;
    return c.accentDark;
  };
  const labelColor = effective("labelDark");
  const fieldColor = effective("fieldDark");
  const textareaColor = effective("textareaDark");
  const checkboxColor = effective("checkboxDark");
  const radioColor = effective("radioDark");
  const switchColor = effective("switchDark");
  const menuColor = effective("menuDark");
  const tabBarColor = effective("tabBarDark");
  const linkColor = effective("linkDark");
  const linkHoverColor = cc.linkHoverDark ?? linkColor;

  return (
    <div>
      <div id="ds-colors" style={{ scrollMarginTop: 20 }}>
        <CMSSectionHeading>Color Palette</CMSSectionHeading>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", marginTop: -12, marginBottom: 16, lineHeight: 1.5 }}>
          Each color has a dark-mode and light-mode value, matching the site&rsquo;s existing light/dark toggle. Changes apply site-wide once saved.
        </p>

        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#14ADB5", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>Theme Gallery</p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#8C9AA3", marginBottom: 10, lineHeight: 1.5, maxWidth: 480 }}>
          Click a swatch to load it into the editor below — it&rsquo;s outlined and marked &ldquo;Editing&rdquo; while active. Anything you change below (colors, corners, buttons, fonts...) is saved into that theme automatically once you hit Save Changes, not just the site&rsquo;s live look. The eye icon controls whether visitors can also pick that theme themselves in the site&rsquo;s own style switcher — &ldquo;Set default&rdquo; picks which one a first-time visitor sees, the pencil icon renames it, and the &times; removes it permanently (at least one theme always has to remain). The moon/sun icons set which mode (dark/light) it switches to when picked, and the lock icon hides the Dark/Light switch from visitors entirely, forcing that one mode — for a theme that&rsquo;s only ever been designed for it.
        </p>
        <div className="flex flex-wrap items-start gap-3 mb-8">
          {galleryPresets.map((t) => {
            const displayName = data.presetNameOverrides?.[t.id] ?? t.name;
            const presetVisible = (data.visiblePresetIds ?? []).includes(t.id);
            const override = data.presetOverrides?.[t.id];
            const displayColors = override?.colors ?? t.colors;
            return (
              <ThemeSwatch
                key={t.id}
                name={displayName}
                colors={displayColors}
                active={activeThemeId === t.id}
                onClick={() => applyTheme({ ...t, ...override, colors: displayColors })}
                onDelete={totalThemes > 1 ? () => removePreset(t.id) : undefined}
                visible={presetVisible}
                onToggleVisible={() => togglePresetVisible(t.id)}
                isDefault={data.defaultVisitorThemeId === t.id}
                onSetDefault={() => setDefaultVisitorTheme(t.id)}
                onRename={(newName) => renamePreset(t.id, newName)}
                defaultMode={override?.defaultMode}
                onSetDefaultMode={(mode) => setPresetDefaultMode(t.id, mode)}
                lockMode={override?.lockMode}
                onToggleLockMode={() => togglePresetLockMode(t.id)}
              />
            );
          })}
          {data.savedThemes.map((t) => (
            <ThemeSwatch
              key={t.id}
              name={t.name}
              colors={t.colors}
              active={activeThemeId === t.id}
              onClick={() => applyTheme(t)}
              onDelete={totalThemes > 1 ? () => deleteTheme(t.id) : undefined}
              visible={!!t.visible}
              onToggleVisible={() => toggleThemeVisible(t.id)}
              isDefault={data.defaultVisitorThemeId === t.id}
              onSetDefault={() => setDefaultVisitorTheme(t.id)}
              onRename={(newName) => renameSavedTheme(t.id, newName)}
              defaultMode={t.defaultMode}
              onSetDefaultMode={(mode) => setSavedThemeDefaultMode(t.id, mode)}
              lockMode={t.lockMode}
              onToggleLockMode={() => toggleSavedThemeLockMode(t.id)}
            />
          ))}
          {namingTheme ? (
            <div style={{ width: 92, display: "flex", flexDirection: "column", gap: 4 }}>
              <input
                autoFocus
                value={themeName}
                onChange={(e) => setThemeName(e.target.value)}
                placeholder="Theme name"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && themeName.trim()) {
                    saveCurrentAsTheme(themeName.trim());
                    setThemeName("");
                    setNamingTheme(false);
                  } else if (e.key === "Escape") {
                    setNamingTheme(false);
                    setThemeName("");
                  }
                }}
                style={{ width: "100%", background: "rgba(237,232,223,0.04)", border: "1px solid rgba(20,173,181,0.4)", borderRadius: 6, padding: "5px 7px", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#EDE8DF", outline: "none" }}
              />
              <div className="flex gap-1">
                <button
                  onClick={() => { if (themeName.trim()) { saveCurrentAsTheme(themeName.trim()); setThemeName(""); setNamingTheme(false); } }}
                  style={{ flex: 1, background: "#14ADB5", border: "none", borderRadius: 6, color: "#0C1117", fontFamily: "'DM Mono', monospace", fontSize: 9, padding: "4px 0", cursor: "pointer" }}
                >
                  Save
                </button>
                <button
                  onClick={() => { setNamingTheme(false); setThemeName(""); }}
                  style={{ flex: 1, background: "none", border: "1px solid rgba(237,232,223,0.15)", borderRadius: 6, color: "#8C9AA3", fontFamily: "'DM Mono', monospace", fontSize: 9, padding: "4px 0", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setNamingTheme(true)}
              className="flex flex-col items-center justify-center gap-1"
              style={{ width: 92, height: 62, background: "rgba(20,173,181,0.04)", border: "1px dashed rgba(20,173,181,0.3)", borderRadius: 10, cursor: "pointer", color: "#14ADB5", fontFamily: "'DM Mono', monospace", fontSize: 9.5, letterSpacing: "0.02em" }}
            >
              <Plus size={14} />
              Save current
            </button>
          )}
        </div>

        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#14ADB5", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
          Project Cards
        </p>
        <div className="mb-8 flex flex-wrap gap-6 items-start">
          <div style={{ maxWidth: 220 }}>
            <SelectField
              label="Card corner"
              value={(data.cardStyle ?? DEFAULT_DESIGN_SYSTEM.cardStyle!).corner}
              onChange={(v: ButtonCorner) => updateCardStyle({ corner: v })}
              options={[
                { value: "square", label: "Square" }, { value: "sharp", label: "Sharp" }, { value: "soft", label: "Soft" }, { value: "round", label: "Round" }, { value: "pill", label: "Pill" },
              ]}
            />
          </div>
          <div style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
            <PlainColorPairControl
              label="Card background"
              darkValue={data.cardStyle?.bgDark ?? data.colors.cardDark}
              lightValue={data.cardStyle?.bgLight ?? data.colors.cardLight}
              defaultDark={data.colors.cardDark}
              defaultLight={data.colors.cardLight}
              onDarkChange={(v) => updateCardStyle({ bgDark: v })}
              onLightChange={(v) => updateCardStyle({ bgLight: v })}
            />
          </div>
          <div style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
            <PlainColorPairControl
              label="Heading (title)"
              darkValue={data.cardStyle?.headingDark ?? cc.linkDark ?? data.colors.accentDark}
              lightValue={data.cardStyle?.headingLight ?? cc.linkLight ?? data.colors.accentLight}
              defaultDark={cc.linkDark ?? data.colors.accentDark}
              defaultLight={cc.linkLight ?? data.colors.accentLight}
              onDarkChange={(v) => updateCardStyle({ headingDark: v })}
              onLightChange={(v) => updateCardStyle({ headingLight: v })}
            />
            <div className="flex flex-wrap gap-1.5" style={{ marginTop: 8 }}>
              <ContrastBadge ratio={contrastRatio(data.cardStyle?.headingDark ?? cc.linkDark ?? data.colors.accentDark, data.cardStyle?.bgDark ?? data.colors.cardDark)} label="Dark vs Card" />
              <ContrastBadge ratio={contrastRatio(data.cardStyle?.headingLight ?? cc.linkLight ?? data.colors.accentLight, data.cardStyle?.bgLight ?? data.colors.cardLight)} label="Light vs Card" />
            </div>
          </div>
          <div style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
            <PlainColorPairControl
              label="Body text (description)"
              darkValue={data.cardStyle?.bodyDark ?? data.colors.textDark}
              lightValue={data.cardStyle?.bodyLight ?? data.colors.textLight}
              defaultDark={data.colors.textDark}
              defaultLight={data.colors.textLight}
              onDarkChange={(v) => updateCardStyle({ bodyDark: v })}
              onLightChange={(v) => updateCardStyle({ bodyLight: v })}
            />
            <div className="flex flex-wrap gap-1.5" style={{ marginTop: 8 }}>
              <ContrastBadge ratio={contrastRatio(data.cardStyle?.bodyDark ?? data.colors.textDark, data.cardStyle?.bgDark ?? data.colors.cardDark)} label="Dark vs Card" />
              <ContrastBadge ratio={contrastRatio(data.cardStyle?.bodyLight ?? data.colors.textLight, data.cardStyle?.bgLight ?? data.colors.cardLight)} label="Light vs Card" />
            </div>
          </div>
          <div style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
            <PlainColorPairControl
              label='Link ("View Project")'
              darkValue={data.cardStyle?.linkDark ?? data.colors.accentDark}
              lightValue={data.cardStyle?.linkLight ?? data.colors.accentLight}
              defaultDark={data.colors.accentDark}
              defaultLight={data.colors.accentLight}
              onDarkChange={(v) => updateCardStyle({ linkDark: v })}
              onLightChange={(v) => updateCardStyle({ linkLight: v })}
            />
          </div>
          <div style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
            <PlainColorPairControl
              label="Tags"
              darkValue={data.cardStyle?.tagTextDark ?? cc.labelDark ?? data.colors.accentDark}
              lightValue={data.cardStyle?.tagTextLight ?? cc.labelLight ?? data.colors.accentLight}
              defaultDark={cc.labelDark ?? data.colors.accentDark}
              defaultLight={cc.labelLight ?? data.colors.accentLight}
              onDarkChange={(v) => updateCardStyle({ tagTextDark: v })}
              onLightChange={(v) => updateCardStyle({ tagTextLight: v })}
            />
          </div>
        </div>

        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#14ADB5", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
          Stats Bar
        </p>
        <div className="mb-8 flex flex-wrap gap-6 items-start">
          <div style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
            <PlainColorPairControl
              label="Text (value / label)"
              darkValue={data.statsStyle?.textDark ?? data.colors.textDark}
              lightValue={data.statsStyle?.textLight ?? data.colors.textLight}
              defaultDark={data.colors.textDark}
              defaultLight={data.colors.textLight}
              onDarkChange={(v) => updateStatsStyle({ textDark: v })}
              onLightChange={(v) => updateStatsStyle({ textLight: v })}
            />
            <div className="flex flex-wrap gap-1.5" style={{ marginTop: 8 }}>
              <ContrastBadge ratio={contrastRatio(data.statsStyle?.textDark ?? data.colors.textDark, data.statsStyle?.bgDark ?? data.colors.bgDark)} label="Dark vs Background" />
              <ContrastBadge ratio={contrastRatio(data.statsStyle?.textLight ?? data.colors.textLight, data.statsStyle?.bgLight ?? data.colors.bgLight)} label="Light vs Background" />
              <ContrastBadge ratio={contrastRatio(data.statsStyle?.textDark ?? data.colors.textDark, data.statsStyle?.hoverBgDark ?? data.colors.cardDark)} label="Dark vs Hover" />
              <ContrastBadge ratio={contrastRatio(data.statsStyle?.textLight ?? data.colors.textLight, data.statsStyle?.hoverBgLight ?? data.colors.cardLight)} label="Light vs Hover" />
            </div>
          </div>
          <div style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
            <PlainColorPairControl
              label="Icon & link (View section)"
              darkValue={data.statsStyle?.iconDark ?? data.colors.accentDark}
              lightValue={data.statsStyle?.iconLight ?? data.colors.accentLight}
              defaultDark={data.colors.accentDark}
              defaultLight={data.colors.accentLight}
              onDarkChange={(v) => updateStatsStyle({ iconDark: v })}
              onLightChange={(v) => updateStatsStyle({ iconLight: v })}
            />
          </div>
          <div style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
            <PlainColorPairControl
              label="Background (default)"
              darkValue={data.statsStyle?.bgDark ?? data.colors.bgDark}
              lightValue={data.statsStyle?.bgLight ?? data.colors.bgLight}
              defaultDark={data.colors.bgDark}
              defaultLight={data.colors.bgLight}
              onDarkChange={(v) => updateStatsStyle({ bgDark: v })}
              onLightChange={(v) => updateStatsStyle({ bgLight: v })}
            />
          </div>
          <div style={{ maxWidth: 320, flex: 1, minWidth: 220 }}>
            <PlainColorPairControl
              label="Background (hover, clickable tiles)"
              darkValue={data.statsStyle?.hoverBgDark ?? data.colors.cardDark}
              lightValue={data.statsStyle?.hoverBgLight ?? data.colors.cardLight}
              defaultDark={data.colors.cardDark}
              defaultLight={data.colors.cardLight}
              onDarkChange={(v) => updateStatsStyle({ hoverBgDark: v })}
              onLightChange={(v) => updateStatsStyle({ hoverBgLight: v })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
        {TOKENS.map((token) => {
          const lightKey = lightKeyFor(token.key);
          return (
            <div key={token.key} className="mb-5" style={{ alignSelf: "start" }}>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#EDE8DF", fontWeight: 500, marginBottom: 2 }}>{token.label}</p>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#8C9AA3", marginBottom: 8 }}>{token.description}</p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <ColorInput label="Dark mode" value={data.colors[token.key]} onChange={(v) => updateColor(token.key, v)} />
                <ColorInput label="Light mode" value={data.colors[lightKey] ?? "#000000"} onChange={(v) => updateColor(lightKey, v)} />
              </div>
              {TEXT_TOKEN_KEYS.has(token.key) && (
                <div className="flex flex-wrap gap-1.5" style={{ marginTop: 8 }}>
                  <ContrastBadge ratio={contrastRatio(data.colors[token.key], data.colors.bgDark)} label="Dark vs Background" />
                  <ContrastBadge ratio={contrastRatio(data.colors[token.key], data.colors.cardDark)} label="Dark vs Card" />
                  <ContrastBadge ratio={contrastRatio(data.colors[lightKey] ?? "#000000", data.colors.bgLight)} label="Light vs Background" />
                  <ContrastBadge ratio={contrastRatio(data.colors[lightKey] ?? "#000000", data.colors.cardLight)} label="Light vs Card" />
                </div>
              )}
              {token.key === "accentDark" && (
                <div className="mt-4" style={{ paddingLeft: 14, borderLeft: "1px solid rgba(237,232,223,0.08)" }}>
                  {(["accent2", "accent3"] as const).map((slot) => {
                    const darkK = `${slot}Dark` as const;
                    const lightK = `${slot}Light` as const;
                    const exists = c[darkK] !== undefined;
                    if (!exists) return null;
                    return (
                      <div key={slot} className="mb-5">
                        <div className="flex items-center justify-between mb-2">
                          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#EDE8DF", fontWeight: 500 }}>
                            {slot === "accent2" ? "Accent 2" : "Accent 3"}
                          </p>
                          <button
                            onClick={() => updateColors({ [darkK]: undefined, [lightK]: undefined })}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#8C9AA3", fontFamily: "'DM Mono', monospace", fontSize: 10 }}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                          <ColorInput label="Dark mode" value={c[darkK] ?? c.accentDark} onChange={(v) => updateColors({ [darkK]: v })} />
                          <ColorInput label="Light mode" value={c[lightK] ?? c.accentLight} onChange={(v) => updateColors({ [lightK]: v })} />
                        </div>
                      </div>
                    );
                  })}
                  {c.accent2Dark === undefined && (
                    <button
                      onClick={() => updateColors({ accent2Dark: c.accentDark, accent2Light: c.accentLight })}
                      style={{ background: "none", border: "1px dashed rgba(20,173,181,0.3)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: "#14ADB5", fontFamily: "'DM Mono', monospace", fontSize: 10.5, letterSpacing: "0.04em" }}
                    >
                      + Add another accent color
                    </button>
                  )}
                  {c.accent2Dark !== undefined && c.accent3Dark === undefined && (
                    <button
                      onClick={() => updateColors({ accent3Dark: c.accentDark, accent3Light: c.accentLight })}
                      style={{ background: "none", border: "1px dashed rgba(20,173,181,0.3)", borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: "#14ADB5", fontFamily: "'DM Mono', monospace", fontSize: 10.5, letterSpacing: "0.04em" }}
                    >
                      + Add another accent color
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        </div>
      </div>

      <div id="ds-fonts" style={{ scrollMarginTop: 20 }}>
        <CMSSectionHeading>Font Pairing</CMSSectionHeading>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", marginTop: -12, marginBottom: 14, lineHeight: 1.5 }}>
          Currently using <strong style={{ color: "#EDE8DF" }}>{pairing.heading.split(",")[0].replace(/'/g, "")}</strong> for headings,{" "}
          <strong style={{ color: "#EDE8DF" }}>{pairing.body.split(",")[0].replace(/'/g, "")}</strong> for body text, and{" "}
          <strong style={{ color: "#EDE8DF" }}>{pairing.mono.split(",")[0].replace(/'/g, "")}</strong> for labels/mono accents.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
          {FONT_PAIRINGS.map((p) => {
            const active = data.fontPairing === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onChange({ ...data, fontPairing: p.id })}
                className="text-left hover:opacity-90 transition-opacity"
                style={{
                  padding: 16,
                  borderRadius: 12,
                  cursor: "pointer",
                  background: active ? "rgba(20,173,181,0.08)" : "#141D24",
                  border: `1.5px solid ${active ? "#14ADB5" : "rgba(237,232,223,0.08)"}`,
                }}
              >
                <p style={{ fontFamily: p.heading, fontSize: 22, color: "#EDE8DF", marginBottom: 6 }}>Aa</p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: active ? "#14ADB5" : "#EDE8DF", fontWeight: 500, marginBottom: 4 }}>
                  {p.name}
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#8C9AA3", lineHeight: 1.4 }}>{p.description}</p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6B7E8A", marginTop: 8, letterSpacing: "0.02em" }}>
                  {p.heading.split(",")[0].replace(/'/g, "")} · {p.body.split(",")[0].replace(/'/g, "")} · {p.mono.split(",")[0].replace(/'/g, "")}
                </p>
              </button>
            );
          })}
          <button
            onClick={() => onChange({ ...data, fontPairing: "custom" })}
            className="text-left hover:opacity-90 transition-opacity"
            style={{
              padding: 16,
              borderRadius: 12,
              cursor: "pointer",
              background: isCustomFont ? "rgba(20,173,181,0.08)" : "#141D24",
              border: `1.5px solid ${isCustomFont ? "#14ADB5" : "rgba(237,232,223,0.08)"}`,
            }}
          >
            <p style={{ fontFamily: data.typeScale.headings.font, fontSize: 22, color: "#EDE8DF", marginBottom: 6 }}>Aa</p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: isCustomFont ? "#14ADB5" : "#EDE8DF", fontWeight: 500, marginBottom: 4 }}>
              Custom
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#8C9AA3", lineHeight: 1.4 }}>Pick each font and set your own type scale.</p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6B7E8A", marginTop: 8, letterSpacing: "0.02em" }}>
              {data.typeScale.headings.font.split(",")[0].replace(/'/g, "")} · {data.typeScale.body.font.split(",")[0].replace(/'/g, "")} · {data.typeScale.labels.font.split(",")[0].replace(/'/g, "")}
            </p>
          </button>
        </div>

        {isCustomFont && <TypeScaleEditor typeScale={data.typeScale} onChange={updateTypeScale} />}
      </div>

      <div id="ds-preview" style={{ scrollMarginTop: 20 }}>
        <CMSSectionHeading>Preview</CMSSectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <PreviewCard mode="dark" colors={data.colors} pairing={pairing} />
          <PreviewCard mode="light" colors={data.colors} pairing={pairing} />
        </div>
      </div>

      <Section id="ds-buttons" title="Buttons" note="Primary, Secondary and Tertiary are each independently configurable — style, corner, icon, font and size — and all share one Button color (defaulting to Accent).">
        <div className="mb-5">
          <ComponentColorControl
            label="Button"
            darkKey="buttonDark"
            lightKey="buttonLight"
            componentColors={cc}
            colors={c}
            onChange={updateComponentColors}
          />
        </div>
        {(["primary", "secondary", "tertiary"] as ButtonVariantId[]).map((variantId) => (
          <ButtonVariantEditor
            key={variantId}
            variantId={variantId}
            style={data.buttonStyles[variantId]}
            fontHeading={pairing.heading}
            fontBody={pairing.body}
            fontMono={pairing.mono}
            btnColor={effective("buttonDark")}
            bgColor={c.bgDark}
            onChange={(patch) => updateButtonStyle(variantId, patch)}
          />
        ))}
      </Section>

      <Section id="ds-links" title="Links" note="Controls inline text links (e.g. the 'Accent link' style seen in card lists and rich text). Hover over the sample below to preview the hover state.">
        <div className="mb-5">
          <ComponentColorControl
            label="Link"
            darkKey="linkDark"
            lightKey="linkLight"
            componentColors={cc}
            colors={c}
            onChange={updateComponentColors}
          />
        </div>
        <div className="mb-5">
          <ComponentColorControl
            label="Link (hover)"
            darkKey="linkHoverDark"
            lightKey="linkHoverLight"
            componentColors={cc}
            colors={c}
            onChange={updateComponentColors}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4" style={{ maxWidth: 300 }}>
          <SelectField
            label="Underline"
            value={data.linkUnderline}
            onChange={(v: LinkUnderline) => onChange({ ...data, linkUnderline: v })}
            options={[
              { value: "none", label: "Never" },
              { value: "hover", label: "On hover" },
              { value: "always", label: "Always" },
            ]}
          />
        </div>
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          onMouseEnter={() => setLinkHovered(true)}
          onMouseLeave={() => setLinkHovered(false)}
          style={{
            fontFamily: pairing.body,
            fontSize: 14,
            color: linkHovered ? linkHoverColor : linkColor,
            opacity: linkHovered ? 0.75 : 1,
            textDecoration: data.linkUnderline === "always" || (data.linkUnderline === "hover" && linkHovered) ? "underline" : "none",
            transition: "color 0.2s ease, opacity 0.2s ease",
          }}
        >
          Sample link text{linkHovered ? " (hovered)" : ""}
        </a>
      </Section>

      <Section id="ds-labels" title="Tags & Labels" note="Corner applies to every project tag, filter-category pill, and credit badge sitewide — independent of the Buttons corner above, so a theme can pair (for example) pill buttons with square tags or vice versa.">
        <div className="mb-5">
          <ComponentColorControl
            label="Label"
            darkKey="labelDark"
            lightKey="labelLight"
            componentColors={cc}
            colors={c}
            onChange={updateComponentColors}
          />
        </div>
        <div className="mb-5" style={{ maxWidth: 220 }}>
          <SelectField
            label="Tag / badge corner"
            value={(data.tagStyle ?? DEFAULT_DESIGN_SYSTEM.tagStyle!).corner}
            onChange={(v: ButtonCorner) => updateTagStyle({ corner: v })}
            options={[
              { value: "square", label: "Square" }, { value: "sharp", label: "Sharp" }, { value: "soft", label: "Soft" }, { value: "round", label: "Round" }, { value: "pill", label: "Pill" },
            ]}
          />
        </div>
        <p style={{ fontFamily: pairing.mono, fontSize: 10, color: labelColor, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>Field Label · SEO</p>
        <p style={{ fontFamily: pairing.mono, fontSize: 10, color: c.mutedDark, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Muted Caption Text</p>
        <span style={{
          display: "inline-block", fontFamily: pairing.mono, fontSize: 9.5, letterSpacing: "0.1em", textTransform: "uppercase",
          color: labelColor, background: "transparent",
          border: `0.5px solid ${labelColor}`, borderRadius: BUTTON_CORNER_RADIUS[(data.tagStyle ?? DEFAULT_DESIGN_SYSTEM.tagStyle!).corner],
          padding: "4px 11px",
        }}>
          UX Design
        </span>
      </Section>

      <Section id="ds-fields" title="Input Fields" note="Focus-state border color; the field's own background/border/text still come from Card/Divider/Text above.">
        <div className="mb-5">
          <ComponentColorControl
            label="Field"
            darkKey="fieldDark"
            lightKey="fieldLight"
            componentColors={cc}
            colors={c}
            onChange={updateComponentColors}
          />
        </div>
        <input
          placeholder="Your email"
          readOnly
          style={{ width: "100%", maxWidth: 320, background: "rgba(237,232,223,0.04)", border: `1px solid ${fieldColor}`, borderRadius: 10, padding: "12px 16px", fontFamily: pairing.body, fontSize: 14, color: c.textDark, outline: "none" }}
        />
      </Section>

      <Section id="ds-textareas" title="Text Areas" note="Border color (focus state) is above; background and text color are its own standalone colors, not tied to Accent.">
        <div className="mb-5">
          <ComponentColorControl
            label="Text Area Border"
            darkKey="textareaDark"
            lightKey="textareaLight"
            componentColors={cc}
            colors={c}
            onChange={updateComponentColors}
          />
        </div>
        <div className="mb-5">
          <PlainColorPairControl
            label="Background"
            darkValue={data.textAreaStyle.bgDark}
            lightValue={data.textAreaStyle.bgLight}
            defaultDark={DEFAULT_DESIGN_SYSTEM.textAreaStyle.bgDark}
            defaultLight={DEFAULT_DESIGN_SYSTEM.textAreaStyle.bgLight}
            onDarkChange={(v) => updateTextAreaStyle({ bgDark: v })}
            onLightChange={(v) => updateTextAreaStyle({ bgLight: v })}
          />
        </div>
        <div className="mb-5">
          <PlainColorPairControl
            label="Text Color"
            darkValue={data.textAreaStyle.textDark}
            lightValue={data.textAreaStyle.textLight}
            defaultDark={DEFAULT_DESIGN_SYSTEM.textAreaStyle.textDark}
            defaultLight={DEFAULT_DESIGN_SYSTEM.textAreaStyle.textLight}
            onDarkChange={(v) => updateTextAreaStyle({ textDark: v })}
            onLightChange={(v) => updateTextAreaStyle({ textLight: v })}
          />
        </div>
        <textarea
          readOnly
          value="Tell me about the opportunity or project…"
          rows={3}
          style={{ width: "100%", maxWidth: 420, background: data.textAreaStyle.bgDark, border: `1px solid ${textareaColor}`, borderRadius: 10, padding: "12px 16px", fontFamily: pairing.body, fontSize: 14, color: data.textAreaStyle.textDark, outline: "none", resize: "none" }}
        />
      </Section>

      <Section id="ds-checkboxes" title="Checkboxes">
        <div className="mb-5">
          <ComponentColorControl
            label="Checkbox"
            darkKey="checkboxDark"
            lightKey="checkboxLight"
            componentColors={cc}
            colors={c}
            onChange={updateComponentColors}
          />
        </div>
        <button
          type="button"
          onClick={() => setCheckPreview((v) => !v)}
          className="flex items-center gap-3"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          <span style={{ width: 20, height: 20, borderRadius: 6, border: checkPreview ? `1.5px solid ${checkboxColor}` : "1.5px solid rgba(237,232,223,0.2)", background: checkPreview ? `color-mix(in srgb, ${checkboxColor} 15%, transparent)` : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {checkPreview && <Check size={13} style={{ color: checkboxColor }} />}
          </span>
          <span style={{ fontFamily: pairing.body, fontSize: 13, color: c.mutedDark }}>I agree to the terms</span>
        </button>
      </Section>

      <Section id="ds-radio" title="Radio Buttons" note="New component — not yet used anywhere on the site, styled and ready for a future feature.">
        <div className="mb-5">
          <ComponentColorControl
            label="Radio"
            darkKey="radioDark"
            lightKey="radioLight"
            componentColors={cc}
            colors={c}
            onChange={updateComponentColors}
          />
        </div>
        <div className="flex flex-col gap-3">
          {[{ v: "a", l: "Option one" }, { v: "b", l: "Option two" }].map((opt) => {
            const active = radioPreview === opt.v;
            return (
              <button key={opt.v} type="button" onClick={() => setRadioPreview(opt.v)} className="flex items-center gap-3" style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                <span style={{ width: 18, height: 18, borderRadius: "50%", border: active ? `1.5px solid ${radioColor}` : "1.5px solid rgba(237,232,223,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {active && <span style={{ width: 8, height: 8, borderRadius: "50%", background: radioColor }} />}
                </span>
                <span style={{ fontFamily: pairing.body, fontSize: 13, color: active ? c.textDark : c.mutedDark }}>{opt.l}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section id="ds-switches" title="Switches" note="New component — not yet used anywhere on the site, styled and ready for a future feature.">
        <div className="mb-5">
          <ComponentColorControl
            label="Switch Track"
            darkKey="switchDark"
            lightKey="switchLight"
            componentColors={cc}
            colors={c}
            onChange={updateComponentColors}
          />
        </div>
        <div className="mb-5">
          <PlainColorPairControl
            label="Switch Circle (thumb)"
            darkValue={data.switchStyle.thumbDark}
            lightValue={data.switchStyle.thumbLight}
            defaultDark={DEFAULT_DESIGN_SYSTEM.switchStyle.thumbDark}
            defaultLight={DEFAULT_DESIGN_SYSTEM.switchStyle.thumbLight}
            onDarkChange={(v) => updateSwitchStyle({ thumbDark: v })}
            onLightChange={(v) => updateSwitchStyle({ thumbLight: v })}
          />
        </div>
        <div className="mb-5">
          <PlainColorPairControl
            label="Switch Track (off)"
            darkValue={data.switchStyle.trackOffDark}
            lightValue={data.switchStyle.trackOffLight}
            defaultDark={DEFAULT_DESIGN_SYSTEM.switchStyle.trackOffDark}
            defaultLight={DEFAULT_DESIGN_SYSTEM.switchStyle.trackOffLight}
            onDarkChange={(v) => updateSwitchStyle({ trackOffDark: v })}
            onLightChange={(v) => updateSwitchStyle({ trackOffLight: v })}
          />
        </div>
        <button
          type="button"
          onClick={() => setSwitchPreview((v) => !v)}
          style={{ width: 38, height: 22, borderRadius: 100, border: "none", padding: 3, background: switchPreview ? switchColor : data.switchStyle.trackOffDark, cursor: "pointer", display: "flex", justifyContent: switchPreview ? "flex-end" : "flex-start" }}
        >
          <span style={{ width: 16, height: 16, borderRadius: "50%", background: data.switchStyle.thumbDark }} />
        </button>
      </Section>

      <Section id="ds-menus" title="Menus" note="Style groundwork for a future top-nav or hamburger menu — not wired into live navigation yet.">
        <div className="mb-5">
          <ComponentColorControl
            label="Menu Item"
            darkKey="menuDark"
            lightKey="menuLight"
            componentColors={cc}
            colors={c}
            onChange={updateComponentColors}
          />
        </div>
        <div className="mb-5">
          <PlainColorPairControl
            label="Panel Background"
            darkValue={data.menuStyle.panelBgDark}
            lightValue={data.menuStyle.panelBgLight}
            defaultDark={DEFAULT_DESIGN_SYSTEM.menuStyle.panelBgDark}
            defaultLight={DEFAULT_DESIGN_SYSTEM.menuStyle.panelBgLight}
            onDarkChange={(v) => updateMenuStyle({ panelBgDark: v })}
            onLightChange={(v) => updateMenuStyle({ panelBgLight: v })}
          />
        </div>
        <div className="mb-5">
          <PlainColorPairControl
            label="Panel Border"
            darkValue={data.menuStyle.panelBorderDark}
            lightValue={data.menuStyle.panelBorderLight}
            defaultDark={DEFAULT_DESIGN_SYSTEM.menuStyle.panelBorderDark}
            defaultLight={DEFAULT_DESIGN_SYSTEM.menuStyle.panelBorderLight}
            onDarkChange={(v) => updateMenuStyle({ panelBorderDark: v })}
            onLightChange={(v) => updateMenuStyle({ panelBorderLight: v })}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5" style={{ maxWidth: 400 }}>
          <SelectField
            label="On hover"
            value={data.menuStyle.hoverEffect}
            onChange={(v: MenuHoverEffect) => updateMenuStyle({ hoverEffect: v })}
            options={[
              { value: "background", label: "Background tint" },
              { value: "underline", label: "Underline" },
              { value: "color", label: "Text color change" },
            ]}
          />
          <SelectField
            label="Panel corner"
            value={data.menuStyle.corner}
            onChange={(v: ButtonCorner) => updateMenuStyle({ corner: v })}
            options={[
              { value: "square", label: "Square" }, { value: "sharp", label: "Sharp" }, { value: "soft", label: "Soft" }, { value: "round", label: "Round" }, { value: "pill", label: "Pill" },
            ]}
          />
        </div>
        <div style={{ position: "relative", display: "inline-block" }}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-2"
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: pairing.body, fontSize: 13, color: c.textDark }}
          >
            Menu <ChevronDown size={13} style={{ transform: menuOpen ? "rotate(180deg)" : "none", color: c.mutedDark }} />
          </button>
          {menuOpen && (
            <div style={{ position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 5, minWidth: 160, background: data.menuStyle.panelBgDark, border: `1px solid ${data.menuStyle.panelBorderDark}`, borderRadius: BUTTON_CORNER_RADIUS[data.menuStyle.corner], padding: 6, boxShadow: "0 12px 32px rgba(0,0,0,0.35)" }}>
              {["Work", "Evaluate", "Process", "Story"].map((label) => {
                const hoverStyle: React.CSSProperties =
                  data.menuStyle.hoverEffect === "background" ? { background: `color-mix(in srgb, ${menuColor} 8%, transparent)` }
                  : data.menuStyle.hoverEffect === "underline" ? { textDecoration: "underline" }
                  : { color: menuColor };
                return (
                  <div key={label} className="hover-menu-item" style={{ borderRadius: 8, padding: "9px 12px", fontFamily: pairing.body, fontSize: 13, color: c.textDark, cursor: "pointer" }}
                    onMouseEnter={(e) => Object.assign(e.currentTarget.style, hoverStyle)}
                    onMouseLeave={(e) => Object.assign(e.currentTarget.style, { background: "none", textDecoration: "none", color: c.textDark })}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Section>

      <Section id="ds-tabbar" title="Tab Bar">
        <div className="mb-5">
          <ComponentColorControl
            label="Active Tab"
            darkKey="tabBarDark"
            lightKey="tabBarLight"
            componentColors={cc}
            colors={c}
            onChange={updateComponentColors}
          />
        </div>
        <div className="mb-5">
          <PlainColorPairControl
            label="Bar Background"
            darkValue={data.tabBarStyle.bgDark}
            lightValue={data.tabBarStyle.bgLight}
            defaultDark={DEFAULT_DESIGN_SYSTEM.tabBarStyle.bgDark}
            defaultLight={DEFAULT_DESIGN_SYSTEM.tabBarStyle.bgLight}
            onDarkChange={(v) => updateTabBarStyle({ bgDark: v })}
            onLightChange={(v) => updateTabBarStyle({ bgLight: v })}
          />
        </div>
        <div className="mb-5">
          <PlainColorPairControl
            label="Bar Border"
            darkValue={data.tabBarStyle.borderDark}
            lightValue={data.tabBarStyle.borderLight}
            defaultDark={DEFAULT_DESIGN_SYSTEM.tabBarStyle.borderDark}
            defaultLight={DEFAULT_DESIGN_SYSTEM.tabBarStyle.borderLight}
            onDarkChange={(v) => updateTabBarStyle({ borderDark: v })}
            onLightChange={(v) => updateTabBarStyle({ borderLight: v })}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5" style={{ maxWidth: 500 }}>
          <SelectField
            label="Active tab style"
            value={data.tabBarStyle.fill}
            onChange={(v: TabBarFill) => updateTabBarStyle({ fill: v })}
            options={[{ value: "fill", label: "Fill" }, { value: "outline", label: "Outline" }]}
          />
          <SelectField
            label="Corner"
            value={data.tabBarStyle.corner}
            onChange={(v: ButtonCorner) => updateTabBarStyle({ corner: v })}
            options={[
              { value: "square", label: "Square" }, { value: "sharp", label: "Sharp" }, { value: "soft", label: "Soft" }, { value: "round", label: "Round" }, { value: "pill", label: "Pill" },
            ]}
          />
          <NumberField label="Font-size" value={data.tabBarStyle.fontSize} onChange={(v) => updateTabBarStyle({ fontSize: v })} suffix="px" />
        </div>
        <div className="inline-flex items-center gap-1" style={{ background: data.tabBarStyle.bgDark, border: `1px solid ${data.tabBarStyle.borderDark}`, borderRadius: BUTTON_CORNER_RADIUS[data.tabBarStyle.corner], padding: 4 }}>
          {[{ v: "work", l: "Work" }, { v: "evaluate", l: "Evaluate" }, { v: "process", l: "Process" }].map((tab) => {
            const active = tabPreview === tab.v;
            const isOutline = data.tabBarStyle.fill === "outline";
            return (
              <button
                key={tab.v}
                onClick={() => setTabPreview(tab.v)}
                style={{
                  padding: "8px 16px",
                  borderRadius: BUTTON_CORNER_RADIUS[data.tabBarStyle.corner],
                  border: active && isOutline ? `1px solid ${tabBarColor}` : "1px solid transparent",
                  cursor: "pointer",
                  fontFamily: pairing.mono,
                  fontSize: data.tabBarStyle.fontSize,
                  letterSpacing: "0.04em",
                  background: active ? (isOutline ? "transparent" : tabBarColor) : "transparent",
                  color: active ? (isOutline ? tabBarColor : c.bgDark) : c.mutedDark,
                }}
              >
                {tab.l}
              </button>
            );
          })}
        </div>
      </Section>

      <div id="ds-branding" style={{ scrollMarginTop: 20 }}>
        <CMSSectionHeading>Branding</CMSSectionHeading>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", marginTop: -12, marginBottom: 16, lineHeight: 1.5 }}>
          Logo updates everywhere instantly, same as colors and fonts. Favicons are fetched directly by the browser and cached, so they may take a refresh or two to show for returning visitors.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <ImagePicker
            label="Logo"
            previewRatio="1/1"
            previewFit="contain"
            previewBackground="#1A2128"
            previewMaxWidth={24}
            value={branding.logoUrl || DEFAULT_LOGO_URL}
            onChange={(url) => onBrandingChange({ ...branding, logoUrl: url || undefined })}
          />
          <ImagePicker
            label="Favicon (.ico)"
            previewRatio="1/1"
            previewFit="contain"
            previewBackground="#1A2128"
            previewMaxWidth={32}
            value={branding.faviconUrl || DEFAULT_FAVICON_URL}
            onChange={(url) => onBrandingChange({ ...branding, faviconUrl: url || undefined })}
          />
          <ImagePicker
            label="Favicon (PNG)"
            previewRatio="1/1"
            previewFit="contain"
            previewBackground="#1A2128"
            previewMaxWidth={96}
            value={branding.faviconPngUrl || DEFAULT_FAVICON_PNG_URL}
            onChange={(url) => onBrandingChange({ ...branding, faviconPngUrl: url || undefined })}
          />
          <ImagePicker
            label="Favicon (SVG)"
            previewRatio="1/1"
            previewFit="contain"
            previewBackground="#1A2128"
            previewMaxWidth={32}
            value={branding.faviconSvgUrl || DEFAULT_FAVICON_SVG_URL}
            onChange={(url) => onBrandingChange({ ...branding, faviconSvgUrl: url || undefined })}
          />
          <ImagePicker
            label="Apple Touch Icon"
            previewRatio="1/1"
            previewFit="contain"
            previewBackground="#1A2128"
            previewMaxWidth={180}
            value={branding.appleTouchIconUrl || DEFAULT_APPLE_TOUCH_ICON_URL}
            onChange={(url) => onBrandingChange({ ...branding, appleTouchIconUrl: url || undefined })}
          />
        </div>
      </div>

      <div id="ds-socials" style={{ scrollMarginTop: 20 }}>
        <CMSSectionHeading>Socials</CMSSectionHeading>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", marginTop: -12, marginBottom: 16, lineHeight: 1.5 }}>
          Add a profile URL for any platform you want linked — leave the rest blank. Once at least one is set, a &quot;Follow me on Socials&quot; row appears under the Get in touch buttons on the public site.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8">
          {SOCIAL_PLATFORMS.map(({ key, label, Icon }) => (
            <div key={key} className="flex items-start gap-3">
              <Icon size={16} style={{ color: "#8C9AA3", flexShrink: 0, marginTop: 34.5 }} />
              <div style={{ flex: 1 }}>
                <CMSUrlInput
                  label={label}
                  value={socials[key] ?? ""}
                  onChange={(v) => onSocialsChange({ ...socials, [key]: v || undefined })}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div id="ds-companies" style={{ scrollMarginTop: 20 }}>
        <CMSSectionHeading>Companies</CMSSectionHeading>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", marginTop: -12, marginBottom: 16, lineHeight: 1.5 }}>
          Employers or agencies whose clients you&apos;ve done work for. Add a company here, then select it as the &quot;Agency&quot; on a project or case study (in the Work tab) to credit &quot;Created while working at [Company]&quot; instead of listing a client directly.
        </p>

        <CMSTextarea
          label="Attribution Callout Copy — use {company} and {client} as placeholders"
          value={companyCreditCopy ?? DEFAULT_COMPANY_CREDIT_COPY}
          onChange={onCompanyCreditCopyChange}
          rows={4}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {companies.map((company, i) => (
            <div key={company.id} className="rounded-xl p-4" style={{ background: "#141D24", border: "1px solid rgba(237,232,223,0.06)", ...companiesDrag.cardStyle(i) }} {...companiesDrag.dropTargetProps(i)}>
              <div className="flex items-center justify-between gap-1 mb-3">
                <DragHandle {...companiesDrag.dragHandleProps(i)} />
                <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (i === 0) return;
                    const c = [...companies];
                    [c[i - 1], c[i]] = [c[i], c[i - 1]];
                    onCompaniesChange(c);
                  }}
                  disabled={i === 0}
                  className="hover:opacity-70 transition-opacity"
                  style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  onClick={() => {
                    if (i === companies.length - 1) return;
                    const c = [...companies];
                    [c[i], c[i + 1]] = [c[i + 1], c[i]];
                    onCompaniesChange(c);
                  }}
                  disabled={i === companies.length - 1}
                  className="hover:opacity-70 transition-opacity"
                  style={{ background: "none", border: "none", cursor: i === companies.length - 1 ? "default" : "pointer", color: i === companies.length - 1 ? "#6B7E8A" : "#EDE8DF", padding: "2px" }}
                >
                  <ArrowDown size={13} />
                </button>
                <button
                  onClick={() => onCompaniesChange(companies.filter((_, idx) => idx !== i))}
                  className="hover:opacity-60 transition-opacity"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: "2px", marginLeft: "2px" }}
                >
                  <Trash2 size={13} />
                </button>
                </div>
              </div>

              <CMSInput
                label="Company Name"
                value={company.name}
                onChange={(v) => { const c = [...companies]; c[i] = { ...c[i], name: v }; onCompaniesChange(c); }}
              />
              <ImagePicker
                label="Logo"
                previewRatio="3/1"
                previewFit="contain"
                previewBackground="#fff"
                value={company.logoUrl}
                onChange={(url) => { const c = [...companies]; c[i] = { ...c[i], logoUrl: url || undefined }; onCompaniesChange(c); }}
              />
            </div>
          ))}
        </div>

        <button
          onClick={() => onCompaniesChange([...companies, { id: `company-${Date.now()}`, name: "New Company" }])}
          className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
          style={{ background: "rgba(20,173,181,0.08)", border: "1px solid rgba(20,173,181,0.25)", borderRadius: "10px", padding: "10px 18px", cursor: "pointer", color: "#14ADB5", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.06em" }}
        >
          <Plus size={13} /> Add Company
        </button>
      </div>

      <div id="ds-404" style={{ scrollMarginTop: 20 }}>
        <CMSSectionHeading>404 Page</CMSSectionHeading>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#8C9AA3", marginTop: -12, marginBottom: 16, lineHeight: 1.5 }}>
          Shown whenever a visitor hits a URL that doesn&apos;t exist, instead of Next.js&apos;s unstyled default. Automatically follows the colors and fonts set above.
        </p>
        <CMSInput label="Eyebrow (small label above the heading)" value={notFound.eyebrow ?? "404"} onChange={(v) => onNotFoundChange({ ...notFound, eyebrow: v })} />
        <CMSInput label="Heading" value={notFound.heading ?? "Page not found"} onChange={(v) => onNotFoundChange({ ...notFound, heading: v })} />
        <ResponsiveRichTextEditor
          label="Body text"
          value={notFound.body ?? "The page you're looking for doesn't exist or may have moved."}
          onChange={(v) => onNotFoundChange({ ...notFound, body: v })}
          mobileValue={notFound.bodyMobile}
          onMobileChange={(v) => onNotFoundChange({ ...notFound, bodyMobile: v })}
        />
        <CMSInput label="Button Label" value={notFound.buttonLabel ?? "Back to home"} onChange={(v) => onNotFoundChange({ ...notFound, buttonLabel: v })} />
        <ImagePicker
          label="Illustration (optional)"
          previewRatio="1/1"
          previewFit="contain"
          previewMaxWidth={160}
          value={notFound.imageUrl}
          onChange={(url) => onNotFoundChange({ ...notFound, imageUrl: url || undefined })}
        />
      </div>

      <button
        onClick={() => { setActiveThemeId(null); onChangeProp(DEFAULT_DESIGN_SYSTEM); }}
        className="flex items-center gap-2 mb-6 hover:opacity-80 transition-opacity"
        style={{ background: "none", border: "1px solid rgba(237,232,223,0.12)", borderRadius: "10px", padding: "10px 18px", cursor: "pointer", color: "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.06em" }}
      >
        <RotateCcw size={13} /> Reset Everything to Default
      </button>
    </div>
  );
}
