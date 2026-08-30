"use client";

// Shared, Design-System-aware building blocks for the public site — every visual property here
// reads from the same CSS custom properties the Design System tab writes to (--c-teal, --c-text,
// var(--font-*), etc.), so editing a color or font pairing in the CMS updates every instance of
// these at once instead of needing dozens of one-off inline styles kept in sync by hand.
//
// Deliberately NOT built on the components/ui/* shadcn kit already in this repo — that kit is
// unused scaffolding left over from the original template (nothing imports it) and follows a
// Tailwind-class + cva-variant styling approach, whereas every hand-built component on this site
// (PathCTA, HomePage, FeaturedProjects, etc.) uses inline style objects reading CSS variables.
// Mixing both approaches on the same page would be inconsistent; this file follows the
// convention that's actually used everywhere else.

import { useState, useId } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useContentStore, BUTTON_CORNER_RADIUS, BUTTON_SIZE_STYLE, DEFAULT_DESIGN_SYSTEM } from "@/store/contentStore";
import type { ButtonVariantId, ButtonFill, CMSButtonVariantStyle } from "@/store/contentStore";

// ─── Button ─────────────────────────────────────────────────────────────────────
// Fill/corner/icon-position/font/size/uppercase all come from the Design System tab's Buttons
// section (content.designSystem.buttonStyles[variant]) rather than per-call props — the point
// is that every "Get in touch"-style primary button, every outline secondary, and every text-
// only tertiary action across the site shares one configurable look. Colors still flow through
// the --btn-color CSS variable (see globals.css) so they stay theme (dark/light) aware without
// this component needing to know which mode is active.

export type ButtonVariant = ButtonVariantId;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: React.ReactNode;
}

const BUTTON_FONT_VAR: Record<CMSButtonVariantStyle["font"], string> = {
  heading: "var(--font-heading)",
  body: "var(--font-body)",
  mono: "var(--font-mono)",
};

export function Button({ variant = "primary", icon, children, style, disabled, ...rest }: ButtonProps) {
  const [hovered, setHovered] = useState(false);
  const { content } = useContentStore();
  const cfg = content.designSystem.buttonStyles?.[variant] ?? DEFAULT_DESIGN_SYSTEM.buttonStyles[variant];
  const sizeStyle = BUTTON_SIZE_STYLE[cfg.size];

  const fillStyles: Record<ButtonFill, React.CSSProperties> = {
    fill: {
      background: "var(--btn-color)",
      color: "var(--c-bg)",
      border: "1px solid var(--btn-color)",
    },
    outline: {
      background: hovered ? "color-mix(in srgb, var(--btn-color) 8%, transparent)" : "transparent",
      color: "var(--btn-color)",
      border: "1px solid color-mix(in srgb, var(--btn-color) 40%, transparent)",
    },
    text: {
      background: "transparent",
      color: "var(--btn-color)",
      border: "none",
      opacity: hovered && !disabled ? 0.7 : disabled ? 0.5 : 1,
    },
  };

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: sizeStyle.padding,
    fontSize: sizeStyle.fontSize,
    borderRadius: BUTTON_CORNER_RADIUS[cfg.corner],
    fontFamily: BUTTON_FONT_VAR[cfg.font],
    fontWeight: 400,
    textTransform: cfg.uppercase ? "uppercase" : "none",
    letterSpacing: cfg.uppercase ? "0.06em" : "normal",
    cursor: disabled ? "default" : "pointer",
    transition: "background 0.25s ease, color 0.25s ease, border-color 0.25s ease, opacity 0.25s ease",
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <button
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      disabled={disabled}
      style={{ ...base, ...fillStyles[cfg.fill], ...style }}
      {...rest}
    >
      {icon && cfg.icon === "left" && icon}
      {children}
      {icon && cfg.icon === "right" && icon}
    </button>
  );
}

// ─── Label ──────────────────────────────────────────────────────────────────────

export function Label({ children, style, ...rest }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--label-color)",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        display: "block",
        marginBottom: 6,
        ...style,
      }}
      {...rest}
    >
      {children}
    </label>
  );
}

// ─── Link ───────────────────────────────────────────────────────────────────────
// Underline behaviour (none/hover/always) is controlled by the Design System's Links section
// via the .site-link CSS class (see buildDesignSystemCss() / globals.css), so it isn't part of
// this component's own style prop.

export function Link({ style, className, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a className={`site-link${className ? ` ${className}` : ""}`} style={style} {...rest} />;
}

// ─── Text field / textarea ───────────────────────────────────────────────────────

const fieldBase: React.CSSProperties = {
  width: "100%",
  background: "var(--c-surface-4)",
  border: "1px solid var(--c-border-med)",
  borderRadius: 10,
  padding: "12px 16px",
  fontFamily: "var(--font-body)",
  fontSize: 15,
  color: "var(--c-text)",
  fontWeight: 300,
  outline: "none",
  transition: "border-color 0.2s ease",
};

export function TextField({ style, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      style={{ ...fieldBase, ...style }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--field-color)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--c-border-med)")}
      {...rest}
    />
  );
}

export function TextArea({ style, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      style={{
        ...fieldBase,
        background: "var(--textarea-bg)",
        color: "var(--textarea-text)",
        resize: "vertical",
        lineHeight: 1.6,
        ...style,
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "var(--textarea-color)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--c-border-med)")}
      {...rest}
    />
  );
}

// ─── Checkbox ───────────────────────────────────────────────────────────────────

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
  id?: string;
}

export function Checkbox({ checked, onChange, label, id }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <div className="flex items-center gap-3">
      <button
        id={inputId}
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 20,
          height: 20,
          flexShrink: 0,
          borderRadius: 6,
          border: checked ? "1.5px solid var(--checkbox-color)" : "1.5px solid var(--c-border-med)",
          background: checked ? "color-mix(in srgb, var(--checkbox-color) 15%, transparent)" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "border-color 0.2s ease, background 0.2s ease",
        }}
      >
        {checked && <Check size={13} style={{ color: "var(--checkbox-color)" }} />}
      </button>
      {label && (
        <label htmlFor={inputId} style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 400, color: "#EDE8DF", cursor: "pointer", lineHeight: 1.5 }}>
          {label}
        </label>
      )}
    </div>
  );
}

// ─── Radio group ──────────────────────────────────────────────────────────────────

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  name?: string;
}

export function RadioGroup({ value, onChange, options, name }: RadioGroupProps) {
  const autoName = useId();
  return (
    <div role="radiogroup" className="flex flex-col gap-3">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            name={name ?? autoName}
            onClick={() => onChange(opt.value)}
            className="flex items-center gap-3"
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                flexShrink: 0,
                borderRadius: "50%",
                border: active ? "1.5px solid var(--radio-color)" : "1.5px solid var(--c-border-med)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "border-color 0.2s ease",
              }}
            >
              {active && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--radio-color)" }} />}
            </span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: active ? "var(--c-text)" : "var(--c-text-muted)" }}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Switch ─────────────────────────────────────────────────────────────────────

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: React.ReactNode;
}

export function Switch({ checked, onChange, label }: SwitchProps) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: 38,
          height: 22,
          borderRadius: 100,
          border: "none",
          padding: 3,
          background: checked ? "var(--switch-color)" : "var(--switch-track-off)",
          cursor: "pointer",
          display: "flex",
          justifyContent: checked ? "flex-end" : "flex-start",
          transition: "background 0.2s ease",
          flexShrink: 0,
        }}
      >
        <span style={{ width: 16, height: 16, borderRadius: "50%", background: "var(--switch-thumb)", transition: "transform 0.2s ease" }} />
      </button>
      {label && <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--c-text-muted)" }}>{label}</span>}
    </div>
  );
}

// ─── Menu (dropdown) ──────────────────────────────────────────────────────────────
// Not wired into any live navigation yet — styling groundwork for a future top-nav or
// hamburger menu, kept ready so that feature can be dropped in without a separate style pass.

interface MenuItemDef {
  label: string;
  onSelect?: () => void;
}

interface MenuProps {
  trigger: React.ReactNode;
  items: MenuItemDef[];
}

export function Menu({ trigger, items }: MenuProps) {
  const [open, setOpen] = useState(false);
  const { content } = useContentStore();
  const hoverEffect = content.designSystem.menuStyle?.hoverEffect ?? "background";

  function applyHover(e: React.MouseEvent<HTMLButtonElement>, on: boolean) {
    const el = e.currentTarget;
    if (hoverEffect === "background") {
      el.style.background = on ? "color-mix(in srgb, var(--menu-color) 8%, transparent)" : "none";
    } else if (hoverEffect === "underline") {
      el.style.textDecoration = on ? "underline" : "none";
    } else {
      el.style.color = on ? "var(--menu-color)" : "var(--c-text)";
    }
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2"
        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--c-text)" }}
      >
        {trigger}
        <ChevronDown size={13} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s ease", color: "var(--c-text-muted)" }} />
      </button>
      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div
            style={{
              position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 41, minWidth: 180,
              background: "var(--menu-panel-bg)", border: "1px solid var(--menu-panel-border)", borderRadius: "var(--menu-corner)",
              padding: 6, boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
            }}
          >
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => { item.onSelect?.(); setOpen(false); }}
                style={{
                  display: "block", width: "100%", textAlign: "left", background: "none", border: "none",
                  borderRadius: 8, padding: "9px 12px", cursor: "pointer",
                  fontFamily: "var(--font-body)", fontSize: 13, color: "var(--c-text)",
                  transition: "background 0.15s ease, color 0.15s ease",
                }}
                onMouseEnter={(e) => applyHover(e, true)}
                onMouseLeave={(e) => applyHover(e, false)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Tab bar ────────────────────────────────────────────────────────────────────

interface TabBarProps {
  value: string;
  onChange: (value: string) => void;
  tabs: { value: string; label: string }[];
}

export function TabBar({ value, onChange, tabs }: TabBarProps) {
  const { content } = useContentStore();
  const style = content.designSystem.tabBarStyle;
  const isOutline = style?.fill === "outline";

  return (
    <div
      role="tablist"
      className="inline-flex items-center gap-1"
      style={{ background: "var(--tabbar-bg)", border: "1px solid var(--tabbar-border)", borderRadius: "var(--tabbar-corner)", padding: 4 }}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            style={{
              padding: "8px 16px",
              borderRadius: "var(--tabbar-corner)",
              border: active && isOutline ? "1px solid var(--tabbar-color)" : "1px solid transparent",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--tabbar-font-size)",
              letterSpacing: "0.04em",
              background: active ? (isOutline ? "transparent" : "var(--tabbar-color)") : "transparent",
              color: active ? (isOutline ? "var(--tabbar-color)" : "var(--c-bg)") : "var(--c-text-muted)",
              transition: "background 0.2s ease, color 0.2s ease, border-color 0.2s ease",
            }}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
