"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Menu } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { SWATCH_BG, SWATCH_TEXT, SWATCH_DIVIDER } from "@/components/ThemeDropdown";
import { HeaderIconButton } from "@/components/HeaderIconButton";

// The popup's own reference-grid glyphs (including its own "Hamburger" entry) stay hand-drawn
// inline SVG — the whole point of that grid is to show the precise shape differences between
// near-identical menu icons (three lines vs two, dots vs squares, left-aligned vs centred), which
// off-the-shelf icons don't reliably match glyph-for-glyph. Stroke conventions (24x24 viewBox,
// 2px round-capped strokes) mirror lucide-react, the icon set used everywhere else on the site,
// so these blend in rather than clashing — including with the trigger button itself, which now
// uses lucide's own Menu icon directly (see HeaderIconButton usage below), matching ThemeDropdown/
// FontSizeToggle's shared icon set now that all three are a unified header button group.
function Glyph({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function HamburgerGlyph(props: { size?: number }) {
  return (
    <Glyph {...props}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </Glyph>
  );
}
function VeggieBurgerGlyph(props: { size?: number }) {
  return (
    <Glyph {...props}>
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
    </Glyph>
  );
}
function HotDogGlyph(props: { size?: number }) {
  return (
    <Glyph {...props}>
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </Glyph>
  );
}
function MeatballsGlyph(props: { size?: number }) {
  return (
    <Glyph {...props}>
      <circle cx="6" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="18" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </Glyph>
  );
}
function KebabGlyph(props: { size?: number }) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="5" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1.6" fill="currentColor" stroke="none" />
    </Glyph>
  );
}
function BentoGlyph(props: { size?: number }) {
  return (
    <Glyph {...props}>
      {[6, 12, 18].flatMap((cy) => [6, 12, 18].map((cx) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.4" fill="currentColor" stroke="none" />))}
    </Glyph>
  );
}
function CheeseburgerGlyph(props: { size?: number }) {
  return (
    <Glyph {...props}>
      <circle cx="5" cy="6" r="1.4" fill="currentColor" stroke="none" />
      <line x1="9" y1="6" x2="20" y2="6" />
      <circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <circle cx="5" cy="18" r="1.4" fill="currentColor" stroke="none" />
      <line x1="9" y1="18" x2="20" y2="18" />
    </Glyph>
  );
}
function FriesGlyph(props: { size?: number }) {
  return (
    <Glyph {...props}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="10" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </Glyph>
  );
}
function WaffleGlyph(props: { size?: number }) {
  return (
    <Glyph {...props}>
      {[3, 10, 17].flatMap((y) => [3, 10, 17].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="4" height="4" rx="1" fill="currentColor" stroke="none" />))}
    </Glyph>
  );
}
function CloseGlyph() {
  return (
    <Glyph size={14}>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </Glyph>
  );
}

const MENU_ICONS: { Icon: (props: { size?: number }) => React.ReactElement; name: string; use: string }[] = [
  { Icon: HamburgerGlyph, name: "Hamburger", use: "Opens the main navigation, most common on mobile." },
  { Icon: CheeseburgerGlyph, name: "Cheeseburger", use: "Switches to a list view." },
  { Icon: VeggieBurgerGlyph, name: "Veggie Burger", use: "A slimmer hamburger, popular in minimal designs." },
  { Icon: HotDogGlyph, name: "Hot Dog", use: "Usually means filter." },
  { Icon: MeatballsGlyph, name: "Meatballs", use: "More actions, often in a toolbar or on a card." },
  { Icon: FriesGlyph, name: "Fries", use: "Represents a paragraph of text, like notes or a caption." },
  { Icon: KebabGlyph, name: "Kebab", use: "More actions for a single item, like a row in a list." },
  { Icon: WaffleGlyph, name: "Waffle", use: "Switches to a grid view, or opens an app launcher." },
  { Icon: BentoGlyph, name: "Candy Box", use: "Switches between apps, like an app launcher." },
];

// Desktop-only self-aware joke: the site's real navigation is the floating bottom nav
// (PathSwitcher), not a hamburger menu — this button + popup pokes fun at that, then nudges the
// visitor toward the real thing. Hidden at the same `md` breakpoint the mobile hamburger
// (MobileNavMenu) appears at, so the two are never both on screen. Focus-trap/Escape/click-
// outside/focus-return mirrors the established pattern in components/CompanyCredit.tsx's info
// callout — same codebase, same kind of small anchored dialog.
export function HamburgerEasterEgg() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const headingId = useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    dialogRef.current?.querySelector<HTMLButtonElement>("[data-close]")?.focus();

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (dialogRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      wasOpen.current = true;
    } else if (wasOpen.current) {
      wasOpen.current = false;
      triggerRef.current?.focus();
    }
  }, [open]);

  // Tells PathSwitcher (a sibling, not an ancestor/descendant — see app/(public)/(experience)/
  // layout.tsx) to play its brief nudge. A plain window event rather than lifted state or a new
  // context, matching the existing cms_content_updated precedent (store/useContentStoreHook.ts)
  // for this kind of decoupled, fire-and-forget cross-component signal. Fired both on open and
  // again every time the pointer re-enters the popup — hovering the card re-plays the reminder
  // even if the visitor's already looked away from the first one.
  function nudge() {
    window.dispatchEvent(new Event("nudge-bottom-nav"));
  }

  function handleOpen() {
    setOpen(true);
    nudge();
  }

  const dialogContent = (
    <>
      <button type="button" data-close aria-label="Close" onClick={() => setOpen(false)} style={closeButtonStyle}>
        <CloseGlyph />
      </button>
      <HamburgerMenuReference headingId={headingId} />
    </>
  );

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <HeaderIconButton
        ref={triggerRef}
        aria-label="Menu icon easter egg"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : handleOpen())}
        icon={<Menu size={20} strokeWidth={2} />}
      />

      {reduceMotion ? (
        open && (
          <div
            ref={dialogRef}
            id={`hamburger-easter-egg-${headingId}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            onMouseEnter={nudge}
            style={panelStyle}
          >
            {dialogContent}
          </div>
        )
      ) : (
        <AnimatePresence>
          {open && (
            <motion.div
              ref={dialogRef}
              id={`hamburger-easter-egg-${headingId}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby={headingId}
              onMouseEnter={nudge}
              initial={{ opacity: 0, scale: 0.96, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              style={panelStyle}
            >
              {dialogContent}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "absolute",
  top: "calc(100% + 10px)",
  right: 0,
  zIndex: 60,
  width: "min(540px, calc(100vw - 48px))",
  background: SWATCH_BG,
  border: `1px solid ${SWATCH_DIVIDER}`,
  borderRadius: 14,
  boxShadow: "0 16px 40px rgba(0,0,0,0.4)",
  padding: "20px 22px",
};

const closeButtonStyle: React.CSSProperties = {
  position: "absolute",
  top: 14,
  right: 14,
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: 4,
  margin: -4,
  display: "flex",
  color: SWATCH_TEXT,
  opacity: 0.7,
};

// The joke + glyph reference itself, minus any dialog chrome. The desktop popup above wraps this
// in its own anchored dialog; the mobile hamburger sheet (components/MobileNavMenu.tsx) stacks it
// under the Theme/Accessibility controls. Shared rather than copied because the nine glyphs only
// make their point if they stay pixel-identical between the two — they exist to show the precise
// shape differences between near-identical menu icons.
export function HamburgerMenuReference({ headingId, compact = false }: { headingId?: string; compact?: boolean }) {
  return (
    <>
      <h2 id={headingId} style={headingStyle}>
        Craving a hamburger?
      </h2>
      <p style={bodyTextStyle}>
        I get it. But this site runs on a{" "}
        <span style={{ fontWeight: 700, color: "var(--c-teal)" }}>floating bottom nav.</span>
        <br />
        Since you&rsquo;re here, here&rsquo;s the full menu:
      </p>
      {/* compact drops each glyph's "what it usually means" line. The mobile sheet uses it so the
          panel stays short enough to sit above the floating nav rather than covering the very
          thing the line below points at — the glyphs and their names still carry the joke, which
          is what that grid is there for. */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: compact ? "10px 14px" : "18px 14px", margin: compact ? "12px 0" : "16px 0" }}>
        {MENU_ICONS.map(({ Icon, name, use }) => (
          <div key={name} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ color: SWATCH_TEXT }}>
              <Icon size={20} />
            </span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 11.5, fontWeight: 500, color: SWATCH_TEXT, lineHeight: 1.3 }}>{name}</span>
            {!compact && (
              <span style={{ fontFamily: "var(--font-body)", fontSize: 10, color: "color-mix(in srgb, " + SWATCH_TEXT + " 65%, transparent)", lineHeight: 1.4 }}>
                {use}
              </span>
            )}
          </div>
        ))}
      </div>
      <div style={{ height: 1, background: SWATCH_DIVIDER, margin: "2px 0 12px" }} />
      <p style={{ ...bodyTextStyle, margin: 0, fontSize: 15, fontWeight: 700 }}>Your actual navigation is waiting down below 👇</p>
    </>
  );
}

const headingStyle: React.CSSProperties = {
  fontFamily: "var(--font-heading)",
  fontSize: 17,
  fontWeight: 500,
  color: SWATCH_TEXT,
  margin: "0 28px 8px 0",
};

const bodyTextStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)",
  fontSize: 12.5,
  lineHeight: 1.5,
  color: "color-mix(in srgb, " + SWATCH_TEXT + " 80%, transparent)",
  margin: 0,
};
