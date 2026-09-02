"use client";

import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle, FontSize, FontFamily, LineHeight } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import { Node, Extension, mergeAttributes } from "@tiptap/core";
import DOMPurify from "dompurify";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Bold, Italic, UnderlineIcon, Strikethrough, Link2, Image as ImageIcon,
  List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Minus, Undo, Redo,
  Video as YoutubeIcon, FileText, X, ChevronDown, Table as TableIcon,
  Rows3, Columns3, Trash2, Plus, ArrowRight, PanelBottom, Type as SecondaryFontIcon,
  Smartphone,
} from "lucide-react";
import { MediaLibraryModal } from "@/components/MediaLibraryModal";
import { Switch } from "@/components/SiteKit";
import { useContentStore, getPublishedProjects, projectUrlSlug } from "@/store/contentStore";

const ACCENT = "#14ADB5";
// Quick-pick shortcuts for the Link/Button dialogs' "internal page" dropdown — the site's fixed
// top-level routes. Project pages are appended separately at render time (they're CMS content,
// not static routes, so they can't live in this constant).
const INTERNAL_PAGES: { path: string; label: string }[] = [
  { path: "/", label: "Home" },
  { path: "/work", label: "Work (all projects)" },
  { path: "/story", label: "Story" },
  { path: "/process", label: "Process" },
  { path: "/evaluate", label: "Evaluate" },
];
// Steps stay tight (+1) at small sizes where a single px is noticeable, then widen (+2, +4, +8,
// +16) as sizes grow, since a fixed +1 step would take forever to reach the largest headings —
// the site's biggest live heading (the homepage hero) renders at up to 96px.
const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80, 88, 96, 112, 128, 144];
const DEFAULT_SIZE = 14;
const LINE_HEIGHTS = [1, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.75, 1.9, 2, 2.25, 2.5];
const DEFAULT_LINE_HEIGHT = 1.75;
const RTE_FONT_WEIGHTS = [300, 400, 500, 600, 700, 800];
const DEFAULT_WEIGHT = 400;
function nearestWeightOption(weight: number): number {
  return RTE_FONT_WEIGHTS.reduce((best, cur) => (Math.abs(cur - weight) < Math.abs(best - weight) ? cur : best), RTE_FONT_WEIGHTS[0]);
}
// Mirrors the literal weights the .ProseMirror block below actually renders each block type
// at (h1/h4: 500, h2/h3/h5: 400, plain paragraphs/captions inherit the root's 300) — kept as a
// lookup rather than read from the DOM so it can't drift out of sync with cursor/selection
// timing across the setContent() reset that follows every edit.
const BLOCK_BASE_WEIGHTS: Record<string, number> = { h1: 500, h2: 400, h3: 400, h4: 500, h5: 400, caption: 300, body: 300 };
const LETTER_SPACINGS = [-0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.04, 0.06, 0.08, 0.1, 0.15, 0.2];
const DEFAULT_LETTER_SPACING = 0;
const MAX_WIDTHS = [200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 900, 1000, 1100, 1200, 1400, 1600];
// Starting point for the first step when no override exists yet — matches this editor's own
// field width, so the first click nudges narrower from something close to how the text already
// looks rather than jumping straight to the preset list's smallest/largest value.
const DEFAULT_MAX_WIDTH = 800;

// Stored content is rendered back out via dangerouslySetInnerHTML in every place a case study
// or project reads it — a defense-in-depth pass against script tags, event handler attributes,
// javascript: URLs etc, run once here on save rather than at every render site. DOMPurify's
// default allowlist already covers everything StarterKit produces (headings, lists, tables,
// spans with style/class/data-* for the color/size/collapsible/caption extensions below); the
// only two additions are the embedded-video <iframe> and Tiptap's own YouTube attributes.
function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") return html;
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe"],
    ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "target"],
  });
}
// Resolves against the Design System's configurable secondary font (Font Pairing tab), not a
// fixed typeface — so changing that setting updates every existing use of this toolbar toggle.
const SECONDARY_FONT_CSS = "var(--font-secondary)";

// ── Font weight / letter spacing — same shape as the official FontSize extension (Tiptap
// ships one for line-height but not these two), so a per-selection override survives as a
// plain inline style on the shared `textStyle` mark and needs no special sanitizer allowance,
// same as font-size/color/font-family already don't. ──────────────────────────────────────
declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontWeight: {
      setFontWeight: (fontWeight: string) => ReturnType;
      unsetFontWeight: () => ReturnType;
    };
    letterSpacing: {
      setLetterSpacing: (letterSpacing: string) => ReturnType;
      unsetLetterSpacing: () => ReturnType;
    };
    maxWidth: {
      setMaxWidth: (maxWidth: string) => ReturnType;
      unsetMaxWidth: () => ReturnType;
    };
  }
}

const FontWeight = Extension.create({
  name: "fontWeight",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontWeight: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontWeight || null,
            renderHTML: (attributes: { fontWeight?: string }) => {
              if (!attributes.fontWeight) return {};
              return { style: `font-weight: ${attributes.fontWeight}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontWeight: (fontWeight: string) => ({ chain }) => chain().setMark("textStyle", { fontWeight }).run(),
      unsetFontWeight: () => ({ chain }) => chain().setMark("textStyle", { fontWeight: null }).removeEmptyTextStyle().run(),
    };
  },
});

const LetterSpacing = Extension.create({
  name: "letterSpacing",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.letterSpacing || null,
            renderHTML: (attributes: { letterSpacing?: string }) => {
              if (!attributes.letterSpacing) return {};
              return { style: `letter-spacing: ${attributes.letterSpacing}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLetterSpacing: (letterSpacing: string) => ({ chain }) => chain().setMark("textStyle", { letterSpacing }).run(),
      unsetLetterSpacing: () => ({ chain }) => chain().setMark("textStyle", { letterSpacing: null }).removeEmptyTextStyle().run(),
    };
  },
});

// Unlike the marks above, max-width has no visual effect on inline text — it only does anything
// on the block element itself, so this is a node attribute (on paragraph/heading/captionBlock,
// same set TextAlign already targets) rather than another textStyle mark. Rendered with
// margin-left/right: auto so a narrowed block centers itself in whatever space it has, matching
// how every "max-width content column" on the web behaves, rather than sitting flush left.
const MaxWidth = Extension.create({
  name: "maxWidth",
  addOptions() {
    return { types: ["heading", "paragraph", "captionBlock"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          maxWidth: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.maxWidth || null,
            renderHTML: (attributes: { maxWidth?: string }) => {
              if (!attributes.maxWidth) return {};
              return { style: `max-width: ${attributes.maxWidth}; margin-left: auto; margin-right: auto;` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    // Targets every block type unconditionally rather than detecting "the" active one — a
    // selection spanning more than one type (e.g. select-all across a heading and a trailing
    // paragraph) isn't isActive("heading") for the whole range, so a single-type guess would
    // silently miss part of the selection. updateAttributes on a type with no match in the
    // selection just returns false without touching the transaction, so chaining all three is
    // harmless when only one type is actually present.
    return {
      setMaxWidth: (maxWidth: string) => ({ chain }) =>
        chain().updateAttributes("heading", { maxWidth }).updateAttributes("paragraph", { maxWidth }).updateAttributes("captionBlock", { maxWidth }).run(),
      unsetMaxWidth: () => ({ chain }) =>
        chain().updateAttributes("heading", { maxWidth: null }).updateAttributes("paragraph", { maxWidth: null }).updateAttributes("captionBlock", { maxWidth: null }).run(),
    };
  },
});

// ── Caption block — custom paragraph-level node ────────────────────────────
const CaptionBlock = Node.create({
  name: "captionBlock",
  group: "block",
  content: "inline*",
  parseHTML() {
    return [{ tag: 'p[data-type="caption"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["p", mergeAttributes(HTMLAttributes, { "data-type": "caption", class: "rte-caption" }), 0];
  },
});

// ── Shared button style ────────────────────────────────────────────────────
const btnBase: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "4px 6px",
  borderRadius: "5px",
  color: "#EDE8DF",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  transition: "all 0.15s",
  flexShrink: 0,
};

function ToolbarBtn({
  onClick, active, title, children, style,
}: {
  onClick: () => void; active?: boolean; title: string; children: React.ReactNode; style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Toolbar buttons live outside the contentEditable area — without this, the browser's
      // default mousedown handling collapses whatever text is currently selected in the editor
      // before onClick even fires, so a command like setColor ends up applying to a collapsed
      // cursor instead of the selection the button was actually clicked for.
      onMouseDown={(e) => e.preventDefault()}
      title={title}
      style={{
        ...btnBase,
        background: active ? "rgba(20,173,181,0.15)" : "none",
        color: active ? ACCENT : "#EDE8DF",
        ...style,
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(237,232,223,0.06)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = active ? "rgba(20,173,181,0.15)" : "none"; }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span style={{ width: "1px", height: "16px", background: "rgba(237,232,223,0.07)", margin: "0 3px", flexShrink: 0 }} />;
}

// A labeled −/value/+ stepper for a per-selection override — shows "Auto" while the selection
// still follows the Design System's default, and a clear (×) button appears only once a real
// override has been set, to make it obvious how to go back to following the default again.
function Stepper({
  label, display, onDec, onInc, onClear, title, onSetValue,
}: {
  label: string; display: string; onDec: () => void; onInc: () => void; onClear?: () => void; title: string;
  // Optional — lets the number itself be clicked and typed over instead of only reachable via
  // +/-. Receives the raw digits the user typed (unitless); the caller applies whatever unit it
  // needs (px, em, plain number, ...).
  onSetValue?: (raw: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function commit() {
    setEditing(false);
    const n = parseInt(draft, 10);
    if (!Number.isNaN(n)) onSetValue?.(n);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#8C9AA3", letterSpacing: "0.06em" }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 1, background: "rgba(237,232,223,0.04)", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 6, padding: "1px 2px" }}>
        <button type="button" onClick={onDec} onMouseDown={(e) => e.preventDefault()} title={`Decrease ${title}`} style={{ ...btnBase, padding: "2px 5px", color: "#EDE8DF" }}>
          <span style={{ fontSize: 13, lineHeight: 1, fontWeight: 300 }}>−</span>
        </button>
        {editing ? (
          <input
            autoFocus
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^0-9]/g, ""))}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") setEditing(false);
            }}
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF", background: "none", border: "none", outline: "none", width: 34, textAlign: "center" }}
          />
        ) : (
          <span
            onClick={onSetValue ? () => { setDraft(display.replace(/\D/g, "")); setEditing(true); } : undefined}
            title={onSetValue ? `Click to type an exact ${title}` : undefined}
            style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF", minWidth: 34, textAlign: "center", cursor: onSetValue ? "pointer" : "default" }}
          >
            {display}
          </span>
        )}
        <button type="button" onClick={onInc} onMouseDown={(e) => e.preventDefault()} title={`Increase ${title}`} style={{ ...btnBase, padding: "2px 5px", color: "#EDE8DF" }}>
          <span style={{ fontSize: 13, lineHeight: 1, fontWeight: 300 }}>+</span>
        </button>
      </div>
      {onClear && (
        <button type="button" onClick={onClear} onMouseDown={(e) => e.preventDefault()} title={`Reset ${title} to the Design System default`} style={{ ...btnBase, padding: "2px 4px", color: "#8C9AA3" }}>
          <X size={10} />
        </button>
      )}
    </div>
  );
}

// ── Dialogs ────────────────────────────────────────────────────────────────
// Shared by LinkDialog and ButtonDialog: a dropdown of the site's own pages/projects that fills
// in the URL field on selection, so linking internally doesn't require knowing/typing the exact
// path. Purely a convenience on top of the free-text field below it — picking nothing (or an
// external URL) works exactly as before.
function InternalPagePicker({ projects, onPick }: { projects: { path: string; label: string }[]; onPick: (path: string) => void }) {
  return (
    <select
      value=""
      onChange={(e) => { if (e.target.value) onPick(e.target.value); e.target.value = ""; }}
      style={{ background: "#141D24", border: "1px solid rgba(237,232,223,0.08)", borderRadius: "6px", padding: "6px 8px", color: "#8C9AA3", fontFamily: "'DM Sans', sans-serif", fontSize: "12px", outline: "none", width: "100%" }}
    >
      <option value="">Or link to a page on this site…</option>
      <optgroup label="Pages">
        {INTERNAL_PAGES.map((p) => <option key={p.path} value={p.path}>{p.label}</option>)}
      </optgroup>
      {projects.length > 0 && (
        <optgroup label="Projects">
          {projects.map((p) => <option key={p.path} value={p.path}>{p.label}</option>)}
        </optgroup>
      )}
    </select>
  );
}

function LinkDialog({
  initialUrl = "https://",
  initialNewWindow = false,
  projects,
  onConfirm,
  onClose,
}: {
  initialUrl?: string;
  initialNewWindow?: boolean;
  projects: { path: string; label: string }[];
  onConfirm: (url: string, openInNewWindow: boolean) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [openInNewWindow, setOpenInNewWindow] = useState(initialNewWindow);
  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: "#0C1117", border: "1px solid rgba(20,173,181,0.3)", minWidth: "300px" }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: ACCENT, letterSpacing: "0.1em" }}>INSERT LINK</p>
      <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onConfirm(url, openInNewWindow); if (e.key === "Escape") onClose(); }}
        placeholder="https://..."
        style={{ background: "#141D24", border: "1px solid rgba(237,232,223,0.08)", borderRadius: "6px", padding: "7px 10px", color: "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: "12px", outline: "none" }} />
      <InternalPagePicker projects={projects} onPick={setUrl} />
      <Switch checked={openInNewWindow} onChange={setOpenInNewWindow} label="Open in new window" />
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} style={{ ...btnBase, color: "#EDE8DF", padding: "5px 10px" }}>Cancel</button>
        <button onClick={() => onConfirm(url, openInNewWindow)} style={{ background: ACCENT, border: "none", borderRadius: "6px", color: "#0C1117", fontFamily: "'DM Mono', monospace", fontSize: "11px", padding: "6px 14px", cursor: "pointer" }}>Set link</button>
      </div>
    </div>
  );
}

function VideoDialog({ onConfirm, onClose }: { onConfirm: (url: string) => void; onClose: () => void }) {
  const [url, setUrl] = useState("");
  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: "#0C1117", border: "1px solid rgba(20,173,181,0.3)", minWidth: "300px" }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: ACCENT, letterSpacing: "0.1em" }}>EMBED VIDEO</p>
      <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="YouTube or Vimeo URL"
        style={{ background: "#141D24", border: "1px solid rgba(237,232,223,0.08)", borderRadius: "6px", padding: "7px 10px", color: "#EDE8DF", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", outline: "none" }} />
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} style={{ ...btnBase, color: "#EDE8DF", padding: "5px 10px" }}>Cancel</button>
        <button onClick={() => { if (url) onConfirm(url); }} style={{ background: ACCENT, border: "none", borderRadius: "6px", color: "#0C1117", fontFamily: "'DM Mono', monospace", fontSize: "11px", padding: "6px 14px", cursor: "pointer" }}>Embed</button>
      </div>
    </div>
  );
}

function PDFDialog({ onConfirm, onClose }: { onConfirm: (url: string, label: string) => void; onClose: () => void }) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("Download PDF");
  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg" style={{ background: "#0C1117", border: "1px solid rgba(20,173,181,0.3)", minWidth: "300px" }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: ACCENT, letterSpacing: "0.1em" }}>INSERT PDF LINK</p>
      <input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder="PDF URL (https://...)"
        style={{ background: "#141D24", border: "1px solid rgba(237,232,223,0.08)", borderRadius: "6px", padding: "7px 10px", color: "#EDE8DF", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", outline: "none" }} />
      <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Link label"
        style={{ background: "#141D24", border: "1px solid rgba(237,232,223,0.08)", borderRadius: "6px", padding: "7px 10px", color: "#EDE8DF", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", outline: "none" }} />
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} style={{ ...btnBase, color: "#EDE8DF", padding: "5px 10px" }}>Cancel</button>
        <button onClick={() => { if (url) onConfirm(url, label); }} style={{ background: ACCENT, border: "none", borderRadius: "6px", color: "#0C1117", fontFamily: "'DM Mono', monospace", fontSize: "11px", padding: "6px 14px", cursor: "pointer" }}>Insert</button>
      </div>
    </div>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost";
function ButtonDialog({
  projects,
  onConfirm,
  onClose,
}: {
  projects: { path: string; label: string }[];
  onConfirm: (text: string, url: string, variant: BtnVariant, openInNewWindow: boolean) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState("Click here");
  const [url, setUrl] = useState("https://");
  const [variant, setVariant] = useState<BtnVariant>("primary");
  // Buttons have always opened in a new tab (previously hardcoded); default stays on so existing
  // habits don't silently change, but it's now a real per-button choice — e.g. a button linking
  // to an internal page usually reads better staying in the same tab.
  const [openInNewWindow, setOpenInNewWindow] = useState(true);

  const VARIANTS: { key: BtnVariant; label: string; preview: React.CSSProperties }[] = [
    { key: "primary", label: "Primary", preview: { background: "#14ADB5", color: "#0C1117", border: "1.5px solid #14ADB5" } },
    { key: "secondary", label: "Secondary", preview: { background: "transparent", color: "#14ADB5", border: "1.5px solid #14ADB5" } },
    { key: "ghost", label: "Ghost", preview: { background: "transparent", color: "#EDE8DF", border: "1.5px solid rgba(237,232,223,0.2)" } },
  ];

  return (
    <div className="flex flex-col gap-3 p-3 rounded-lg" style={{ background: "#0C1117", border: "1px solid rgba(20,173,181,0.3)", minWidth: "320px" }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: ACCENT, letterSpacing: "0.1em" }}>INSERT BUTTON</p>
      <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Button label"
        style={{ background: "#141D24", border: "1px solid rgba(237,232,223,0.08)", borderRadius: "6px", padding: "7px 10px", color: "#EDE8DF", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", outline: "none" }} />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..."
        style={{ background: "#141D24", border: "1px solid rgba(237,232,223,0.08)", borderRadius: "6px", padding: "7px 10px", color: "#EDE8DF", fontFamily: "'DM Sans', sans-serif", fontSize: "13px", outline: "none" }} />
      <InternalPagePicker projects={projects} onPick={setUrl} />
      {/* Style picker */}
      <div style={{ display: "flex", gap: 6 }}>
        {VARIANTS.map((v) => (
          <button key={v.key} type="button" onClick={() => setVariant(v.key)}
            style={{ flex: 1, padding: "6px 10px", borderRadius: "7px", fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.04em", cursor: "pointer", outline: variant === v.key ? `2px solid ${ACCENT}` : "2px solid transparent", outlineOffset: 2, ...v.preview }}>
            {v.label}
          </button>
        ))}
      </div>
      <Switch checked={openInNewWindow} onChange={setOpenInNewWindow} label="Open in new window" />
      <div className="flex gap-2 justify-end">
        <button onClick={onClose} style={{ ...btnBase, color: "#EDE8DF", padding: "5px 10px" }}>Cancel</button>
        <button onClick={() => { if (text && url) onConfirm(text, url, variant, openInNewWindow); }}
          style={{ background: ACCENT, border: "none", borderRadius: "6px", color: "#0C1117", fontFamily: "'DM Mono', monospace", fontSize: "11px", padding: "6px 14px", cursor: "pointer" }}>
          Insert
        </button>
      </div>
    </div>
  );
}

// ── Resizable Image NodeView ───────────────────────────────────────────────
const IMAGE_ALIGN_MARGIN: Record<string, string> = { left: "12px 0", center: "12px auto", right: "12px 0 12px auto" };

function ResizableImageView({ node, updateAttributes, selected }: ReactNodeViewProps) {
  const { src, alt, width, height, align } = node.attrs as {
    src: string; alt?: string; width?: number | null; height?: number | null; align?: string;
  };

  const [showPopup, setShowPopup]       = useState(false);
  const [showLibrary, setShowLibrary]   = useState(false);
  const [popupW, setPopupW]             = useState("");
  const [popupH, setPopupH]             = useState("");
  const imgRef  = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startW: number; ratio: number; dir: 1 | -1 } | null>(null);

  function naturalRatio(): number {
    const img = imgRef.current;
    if (!img) return 1;
    return (img.naturalWidth || img.offsetWidth) / (img.naturalHeight || img.offsetHeight);
  }

  function openPopup() {
    const img = imgRef.current;
    if (!img) return;
    setPopupW(String(Math.round(width ?? img.offsetWidth)));
    setPopupH(String(Math.round(height ?? img.offsetHeight)));
    setShowPopup(true);
  }

  function startDrag(e: React.MouseEvent, dir: 1 | -1) {
    e.preventDefault();
    e.stopPropagation();
    const img = imgRef.current;
    if (!img) return;
    dragRef.current = { startX: e.clientX, startW: img.offsetWidth, ratio: naturalRatio(), dir };
    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = (me.clientX - dragRef.current.startX) * dragRef.current.dir;
      const newW = Math.max(40, Math.round(dragRef.current.startW + dx));
      updateAttributes({ width: newW, height: Math.round(newW / dragRef.current.ratio) });
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function applyPopup() {
    const w = parseInt(popupW), h = parseInt(popupH);
    if (!isNaN(w) && w > 0 && !isNaN(h) && h > 0) updateAttributes({ width: w, height: h });
    setShowPopup(false);
  }

  const handle = (pos: React.CSSProperties, cur: string, dir: 1 | -1) => (
    <div
      onMouseDown={(e) => startDrag(e, dir)}
      style={{ position: "absolute", width: 10, height: 10, background: ACCENT, border: "2px solid #0C1117", borderRadius: 2, zIndex: 10, cursor: cur, ...pos }}
    />
  );

  return (
    <NodeViewWrapper as="div" style={{ display: "inline-block", position: "relative", lineHeight: 0, maxWidth: "100%", margin: IMAGE_ALIGN_MARGIN[align || "left"] || IMAGE_ALIGN_MARGIN.left }}>
      <img
        ref={imgRef}
        src={src}
        alt={alt || ""}
        width={width ?? undefined}
        height={height ?? undefined}
        draggable={false}
        onDoubleClick={(e) => { e.stopPropagation(); openPopup(); }}
        style={{ display: "block", maxWidth: "100%", borderRadius: 8, outline: selected && !showPopup ? `2px solid ${ACCENT}` : "none", outlineOffset: 2, userSelect: "none", cursor: "default" }}
      />

      {/* Corner handles — shown when TipTap-selected */}
      {selected && !showPopup && (
        <>
          {handle({ top: -5, left: -5 },  "nwse-resize", -1)}
          {handle({ top: -5, right: -5 }, "nesw-resize",  1)}
          {handle({ bottom: -5, left: -5 },  "nesw-resize", -1)}
          {handle({ bottom: -5, right: -5 }, "nwse-resize",  1)}
        </>
      )}

      {/* Double-click popup */}
      {showPopup && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", background: "#0C1117", border: "1px solid rgba(20,173,181,0.4)", borderRadius: 10, padding: "14px 16px", zIndex: 50, minWidth: 230, boxShadow: "0 16px 48px rgba(0,0,0,0.7)" }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: ACCENT, letterSpacing: "0.1em" }}>IMAGE SIZE</span>
            <button onClick={() => setShowPopup(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: 0, display: "flex" }}><X size={13} /></button>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#EDE8DF", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>WIDTH (px)</label>
              <input type="number" value={popupW}
                onChange={(e) => { setPopupW(e.target.value); const w = parseInt(e.target.value); if (!isNaN(w) && w > 0) setPopupH(String(Math.round(w / naturalRatio()))); }}
                style={{ width: "100%", background: "#141D24", border: "1px solid rgba(237,232,223,0.12)", borderRadius: 6, padding: "6px 8px", color: "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: "12px", outline: "none" }}
              />
            </div>
            <span style={{ color: "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: 12, paddingBottom: 7 }}>×</span>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: "#EDE8DF", letterSpacing: "0.1em", display: "block", marginBottom: 4 }}>HEIGHT (px)</label>
              <input type="number" value={popupH}
                onChange={(e) => { setPopupH(e.target.value); const h = parseInt(e.target.value); if (!isNaN(h) && h > 0) setPopupW(String(Math.round(h * naturalRatio()))); }}
                style={{ width: "100%", background: "#141D24", border: "1px solid rgba(237,232,223,0.12)", borderRadius: 6, padding: "6px 8px", color: "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: "12px", outline: "none" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <button onClick={applyPopup} style={{ width: "100%", background: ACCENT, border: "none", borderRadius: 7, padding: "8px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#0C1117", letterSpacing: "0.06em" }}>Apply size</button>
            <button onClick={() => { setShowPopup(false); setShowLibrary(true); }} style={{ width: "100%", background: "rgba(237,232,223,0.04)", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 7, padding: "8px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#EDE8DF", letterSpacing: "0.06em" }}>Replace image</button>
          </div>
        </div>
      )}

      {showLibrary && (
        <MediaLibraryModal
          onSelect={(newSrc, newAlt) => { updateAttributes({ src: newSrc, alt: newAlt }); setShowLibrary(false); }}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </NodeViewWrapper>
  );
}

// Margin baked directly onto the saved <img>'s style attribute (not a class), so the public
// site's dangerouslySetInnerHTML render needs zero changes to respect it — it just overrides
// .rte-content img's default symmetric "margin: 12px 0" for whichever side should collapse to 0.
const IMAGE_ALIGN_STYLE: Record<string, string> = {
  left: "display:block;margin:12px 0",
  center: "display:block;margin:12px auto",
  right: "display:block;margin:12px 0 12px auto",
};

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => { const v = el.getAttribute("width"); return v ? parseInt(v) : null; },
        renderHTML: (attrs) => (attrs.width ? { width: String(attrs.width) } : {}),
      },
      height: {
        default: null,
        parseHTML: (el) => { const v = el.getAttribute("height"); return v ? parseInt(v) : null; },
        renderHTML: (attrs) => (attrs.height ? { height: String(attrs.height) } : {}),
      },
      align: {
        default: "left",
        parseHTML: (el) => el.getAttribute("data-align") || "left",
        renderHTML: (attrs) => ({ "data-align": attrs.align, style: IMAGE_ALIGN_STYLE[attrs.align as string] || IMAGE_ALIGN_STYLE.left }),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

// ── Collapsible panel — FAQ-style toggle. Renders as a native <details>/<summary>
// on the public site, so open/close needs no JS there at all. ─────────────────
const PANEL_ICON_OPTIONS = [
  { key: "chevron", label: "Chevron", Icon: ChevronDown },
  { key: "plus", label: "Plus", Icon: Plus },
  { key: "arrow", label: "Arrow", Icon: ArrowRight },
] as const;
type PanelIconKey = (typeof PANEL_ICON_OPTIONS)[number]["key"];

const CollapsiblePanel = Node.create({
  name: "collapsiblePanel",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,
  addAttributes() {
    return {
      title: {
        default: "New question",
        parseHTML: (el: HTMLElement) => el.querySelector(".rte-collapsible-title")?.textContent || "New question",
        renderHTML: () => ({}),
      },
      icon: {
        default: "chevron" as PanelIconKey,
        parseHTML: (el: HTMLElement) => el.getAttribute("data-icon") || "chevron",
        renderHTML: (attrs: { icon: PanelIconKey }) => ({ "data-icon": attrs.icon }),
      },
    };
  },
  parseHTML() {
    return [{ tag: "details.rte-collapsible", contentElement: ".rte-collapsible-body" }];
  },
  renderHTML({ HTMLAttributes, node }) {
    return [
      "details",
      mergeAttributes(HTMLAttributes, { class: "rte-collapsible" }),
      ["summary", { class: "rte-collapsible-summary" },
        ["span", { class: "rte-collapsible-title" }, node.attrs.title || "New question"],
        ["span", { class: "rte-collapsible-icon" }],
      ],
      ["div", { class: "rte-collapsible-body" }, 0],
    ];
  },
  addNodeView() {
    return ReactNodeViewRenderer(CollapsiblePanelView);
  },
});

function CollapsiblePanelView({ node, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const { title, icon } = node.attrs as { title: string; icon: PanelIconKey };
  const [iconMenuOpen, setIconMenuOpen] = useState(false);
  const ActiveIcon = PANEL_ICON_OPTIONS.find((o) => o.key === icon)?.Icon ?? ChevronDown;

  return (
    <NodeViewWrapper
      as="div"
      className="rte-collapsible-editor"
      style={{ border: "1px solid rgba(20,173,181,0.25)", borderRadius: 10, margin: "14px 0", overflow: "hidden", background: "rgba(20,173,181,0.03)" }}
    >
      <div
        contentEditable={false}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid rgba(20,173,181,0.15)", background: "rgba(20,173,181,0.06)" }}
      >
        <PanelBottom size={12} style={{ color: ACCENT, flexShrink: 0 }} />
        <input
          value={title}
          onChange={(e) => updateAttributes({ title: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          placeholder="Panel title (e.g. a FAQ question)…"
          style={{
            flex: 1, minWidth: 0, color: "#EDE8DF", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 400,
            background: "#0C1117", border: "1px solid rgba(237,232,223,0.12)", borderRadius: 6, padding: "5px 9px", outline: "none",
          }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.5)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.12)")}
        />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#6A7A83", letterSpacing: "0.06em", flexShrink: 0 }}>ICON</span>
        <div style={{ position: "relative", flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => setIconMenuOpen((v) => !v)}
            title="Icon style"
            style={{ ...btnBase, color: ACCENT, background: iconMenuOpen ? "rgba(20,173,181,0.15)" : "none" }}
          >
            <ActiveIcon size={13} />
          </button>
          {iconMenuOpen && (
            <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: "#0C1117", border: "1px solid rgba(20,173,181,0.3)", borderRadius: 8, padding: 4, display: "flex", gap: 2, zIndex: 10 }}>
              {PANEL_ICON_OPTIONS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  type="button"
                  title={label}
                  onClick={() => { updateAttributes({ icon: key }); setIconMenuOpen(false); }}
                  style={{ ...btnBase, background: icon === key ? "rgba(20,173,181,0.15)" : "none", color: icon === key ? ACCENT : "#EDE8DF" }}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={deleteNode}
          title="Remove panel"
          style={{ ...btnBase, color: "#EDE8DF", flexShrink: 0 }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#C0392B"; e.currentTarget.style.background = "rgba(192,57,43,0.12)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#EDE8DF"; e.currentTarget.style.background = "none"; }}
        >
          <X size={13} />
        </button>
      </div>
      <div style={{ padding: "10px 14px" }}>
        <NodeViewContent />
      </div>
    </NodeViewWrapper>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
const COLOR_SWATCHES = [
  // Neutrals / theme text
  "#EDE8DF", "#C8D2D8", "#EDE8DF", "#4A5D6B",
  // Accent
  "#14ADB5", "#0D7D84",
  // Warm
  "#C87E7E", "#E8A87C", "#F5D76E",
  // Cool
  "#7EA5C8", "#9B7EC8", "#7EC8A0",
  // Dark
  "#1A2832", "#0C1117",
];

function ColorPicker({ currentColor, onSet, onClear }: { currentColor: string; onSet: (c: string) => void; onClear: () => void }) {
  const [hex, setHex] = useState(currentColor || "#EDE8DF");
  const colorInputRef = useRef<HTMLInputElement>(null);

  function apply(c: string) { setHex(c); onSet(c); }

  function handleHexInput(val: string) {
    setHex(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) onSet(val);
  }

  return (
    <div style={{ background: "#0C1117", border: "1px solid rgba(20,173,181,0.3)", borderRadius: 10, padding: "12px 12px 10px", width: 200, display: "flex", flexDirection: "column", gap: 10 }}>
      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: "9px", color: ACCENT, letterSpacing: "0.12em", margin: 0 }}>TEXT COLOUR</p>

      {/* Swatches */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 5 }}>
        {COLOR_SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            title={c}
            onClick={() => apply(c)}
            onMouseDown={(e) => e.preventDefault()}
            style={{
              width: "100%", aspectRatio: "1", borderRadius: 4, border: c === currentColor ? `2px solid ${ACCENT}` : "1.5px solid rgba(237,232,223,0.12)",
              background: c, cursor: "pointer", padding: 0, outline: "none",
            }}
          />
        ))}
      </div>

      {/* Native colour wheel + hex input */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div
          title="Open colour picker"
          onClick={() => colorInputRef.current?.click()}
          style={{ width: 26, height: 26, borderRadius: 5, border: "1.5px solid rgba(237,232,223,0.15)", background: hex, cursor: "pointer", flexShrink: 0, position: "relative" }}
        >
          <input
            ref={colorInputRef}
            type="color"
            value={/^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : "#EDE8DF"}
            onChange={(e) => apply(e.target.value)}
            style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer", padding: 0, border: "none" }}
          />
        </div>
        <input
          type="text"
          value={hex}
          onChange={(e) => handleHexInput(e.target.value)}
          placeholder="#EDE8DF"
          maxLength={7}
          style={{ flex: 1, background: "#141D24", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 5, padding: "4px 8px", color: "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: "11px", outline: "none" }}
        />
      </div>

      {/* Reset */}
      <button type="button" onClick={onClear} onMouseDown={(e) => e.preventDefault()} style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}>
        Reset to default
      </button>
    </div>
  );
}

type Dialog = "link" | "video" | "pdf" | "button" | "color" | null;

// Every rich text editor now shares this one width, rather than each field capping itself to
// wherever its own text actually renders on the live site (a per-field maxWidth prop used to do
// that — some 60ch, some 700/800px). That per-field accuracy meant the *toolbar* above it, which
// never respected that width at all, stretched to fill the CMS panel's full column regardless —
// so a narrow 60ch field showed a toolbar with a large empty gap on the right, and both boxes
// growing very wide on a big monitor. One fixed width, sized to fit the two toolbar rows without
// wrapping, removes that gap everywhere at the cost of per-field editing-preview width accuracy.
// 720px still wrapped the LS stepper onto a 3rd line whenever LH/WT/LS all had an active
// "reset to default" × showing at once (each adds ~21px row 1 doesn't need when they're at
// "Auto") — 800px keeps all three steppers, clear buttons included, on row 1.
export const RICH_TEXT_EDITOR_WIDTH = "800px";
const EDITOR_WIDTH = RICH_TEXT_EDITOR_WIDTH;

interface Props {
  value: string;
  onChange: (html: string) => void;
  label?: string;
  /** Raw CSS declarations (e.g. "font-family: var(--font-heading); font-size: 32px; color:
   *  var(--c-teal); text-align: center;") matching this field's real live-site typography —
   *  appended after the editor's plain-body defaults so it wins on whichever properties it
   *  sets, making the editing view an accurate preview instead of always looking like plain
   *  14px body text regardless of how large/styled the field renders on the actual page. */
  previewStyle?: string;
}

export function RichTextEditor({ value, onChange, label = "Project Detail", previewStyle }: Props) {
  const [dialog, setDialog]       = useState<Dialog>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [, forceUpdate] = useState(0);

  // Powers the Link/Button dialogs' "internal page" picker — every published project, alongside
  // the fixed top-level routes in INTERNAL_PAGES.
  const { content } = useContentStore();
  const internalProjectPages = useMemo(
    () => getPublishedProjects(content).map((p) => ({ path: `/work/${projectUrlSlug(p)}`, label: p.name })),
    [content]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5] } }),
      CaptionBlock,
      CollapsiblePanel,
      TextStyle,
      FontSize,
      FontFamily,
      LineHeight,
      FontWeight,
      LetterSpacing,
      MaxWidth,
      Color,
      Underline,
      ResizableImage.configure({ inline: false, allowBase64: false }),
      // Tiptap's Link extension defaults HTMLAttributes to { target: "_blank", rel: "noopener
      // noreferrer nofollow" } internally, and .configure() deep-merges rather than replacing —
      // so leaving target/rel unset here would silently inherit "always open in a new tab" for
      // every link (including autolinked/pasted URLs) regardless of what the insert-link dialog
      // asks for. Setting both to null makes "same tab" the real default; the dialog then passes
      // explicit target/rel on every setLink() call based on its own switch.
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "rte-link", target: null, rel: null } }),
      Youtube.configure({ width: 640, height: 360 }),
      TextAlign.configure({ types: ["heading", "paragraph", "captionBlock"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        includeChildren: true,
        placeholder: ({ editor, node, pos }) => {
          const parentType = editor.state.doc.resolve(pos).parent.type.name;
          return node.type.name === "paragraph" && parentType === "collapsiblePanel"
            ? "Type the hidden content here…"
            : "Write a detailed project description — include context, challenges, decisions, and outcomes…";
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => { onChange(sanitizeHtml(editor.getHTML())); forceUpdate((n) => n + 1); },
    onSelectionUpdate: () => forceUpdate((n) => n + 1),
    editorProps: {
      attributes: {
        style: [
          // ~2 lines at this font-size/line-height — content hugs tightly with roughly one
          // line of breathing room below it, instead of a large fixed empty box, and still
          // grows freely as more is typed.
          "min-height: calc(2 * 1.75 * 14px)",
          "padding: 14px 16px",
          "outline: none",
          "font-family: 'DM Sans', sans-serif",
          "font-size: 14px",
          "color: #EDE8DF",
          "font-weight: 300",
          "line-height: 1.75",
          `max-width: ${EDITOR_WIDTH}`,
          ...(previewStyle ? [previewStyle] : []),
        ].join(";"),
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value]);

  if (!editor) return null;

  // ── Derived state ─────────────────────────────────────────────────────────
  function getBlockType() {
    if (editor.isActive("heading", { level: 1 })) return "h1";
    if (editor.isActive("heading", { level: 2 })) return "h2";
    if (editor.isActive("heading", { level: 3 })) return "h3";
    if (editor.isActive("heading", { level: 4 })) return "h4";
    if (editor.isActive("heading", { level: 5 })) return "h5";
    if (editor.isActive("captionBlock")) return "caption";
    return "body";
  }

  function setBlockType(type: string) {
    editor.chain().focus();
    if (type === "body") { editor.chain().focus().setParagraph().run(); }
    else if (type === "caption") { editor.chain().focus().setNode("captionBlock").run(); }
    else {
      const level = parseInt(type.replace("h", "")) as 1 | 2 | 3 | 4 | 5;
      editor.chain().focus().toggleHeading({ level }).run();
    }
  }

  const rawSize = editor.getAttributes("textStyle").fontSize as string | undefined;
  const currentSize = rawSize ? parseInt(rawSize) : DEFAULT_SIZE;
  const currentColor = (editor.getAttributes("textStyle").color as string | undefined) ?? "";

  // null (not the module default) means "no override — still following the Design System",
  // which is what lets these steppers show "Auto" and offer a clear/reset action.
  const rawLineHeight = editor.getAttributes("textStyle").lineHeight as string | undefined;
  const currentLineHeight = rawLineHeight ? parseFloat(rawLineHeight) : null;
  const rawWeight = editor.getAttributes("textStyle").fontWeight as string | undefined;
  const currentWeight = rawWeight ? parseInt(rawWeight) : null;
  const rawLetterSpacing = editor.getAttributes("textStyle").letterSpacing as string | undefined;
  const currentLetterSpacing = rawLetterSpacing ? parseFloat(rawLetterSpacing) : null;
  // maxWidth lives on the block node itself (paragraph/heading/captionBlock), not the textStyle
  // mark the controls above read from — see the MaxWidth extension for why.
  // Checked across all 3 possible types rather than picking one via isActive() — a selection
  // spanning more than one block type isn't isActive("heading") for the whole range, so a single
  // guess could read the wrong node's (unset) attribute even though the block actually being
  // edited has a real value.
  const rawMaxWidth = (editor.getAttributes("heading").maxWidth ?? editor.getAttributes("paragraph").maxWidth ?? editor.getAttributes("captionBlock").maxWidth) as string | undefined;
  const currentMaxWidth = rawMaxWidth ? parseInt(rawMaxWidth) : null;

  // Weight has no equivalent of "Auto" being a fine answer — headings and body text land on
  // genuinely different numbers, and the point of this control is letting you see and move
  // from whatever that number actually is (e.g. reducing a heading's weight below its own
  // default), rather than starting from an opaque "Auto" with no visible baseline.
  const effectiveWeight = BLOCK_BASE_WEIGHTS[getBlockType()] ?? DEFAULT_WEIGHT;

  function stepSize(dir: 1 | -1) {
    const idx = FONT_SIZES.indexOf(currentSize);
    const nextIdx = Math.max(0, Math.min(FONT_SIZES.length - 1, idx === -1 ? FONT_SIZES.indexOf(DEFAULT_SIZE) : idx + dir));
    editor.chain().focus().setFontSize(`${FONT_SIZES[nextIdx]}px`).run();
  }

  function stepLineHeight(dir: 1 | -1) {
    const idx = currentLineHeight === null ? LINE_HEIGHTS.indexOf(DEFAULT_LINE_HEIGHT) : LINE_HEIGHTS.indexOf(currentLineHeight);
    const base = idx === -1 ? LINE_HEIGHTS.indexOf(DEFAULT_LINE_HEIGHT) : idx;
    const nextIdx = Math.max(0, Math.min(LINE_HEIGHTS.length - 1, base + dir));
    editor.chain().focus().setLineHeight(String(LINE_HEIGHTS[nextIdx])).run();
  }

  function stepWeight(dir: 1 | -1) {
    // Starting from the real effective weight (rather than always assuming 400) means the
    // first click actually moves one step from wherever the text visually is right now —
    // a 700 heading steps to 600, not straight to 300.
    const idx = currentWeight === null ? RTE_FONT_WEIGHTS.indexOf(nearestWeightOption(effectiveWeight)) : RTE_FONT_WEIGHTS.indexOf(currentWeight);
    const base = idx === -1 ? RTE_FONT_WEIGHTS.indexOf(DEFAULT_WEIGHT) : idx;
    const nextIdx = Math.max(0, Math.min(RTE_FONT_WEIGHTS.length - 1, base + dir));
    editor.chain().focus().setFontWeight(String(RTE_FONT_WEIGHTS[nextIdx])).run();
  }

  function stepLetterSpacing(dir: 1 | -1) {
    const idx = currentLetterSpacing === null ? LETTER_SPACINGS.indexOf(DEFAULT_LETTER_SPACING) : LETTER_SPACINGS.indexOf(currentLetterSpacing);
    const base = idx === -1 ? LETTER_SPACINGS.indexOf(DEFAULT_LETTER_SPACING) : idx;
    const nextIdx = Math.max(0, Math.min(LETTER_SPACINGS.length - 1, base + dir));
    editor.chain().focus().setLetterSpacing(`${LETTER_SPACINGS[nextIdx]}em`).run();
  }

  function stepMaxWidth(dir: 1 | -1) {
    const idx = currentMaxWidth === null ? MAX_WIDTHS.indexOf(DEFAULT_MAX_WIDTH) : MAX_WIDTHS.indexOf(currentMaxWidth);
    const base = idx === -1 ? MAX_WIDTHS.indexOf(DEFAULT_MAX_WIDTH) : idx;
    const nextIdx = Math.max(0, Math.min(MAX_WIDTHS.length - 1, base + dir));
    editor.chain().focus().setMaxWidth(`${MAX_WIDTHS[nextIdx]}px`).run();
  }

  function insertButton(text: string, url: string, variant: BtnVariant, openInNewWindow: boolean) {
    const targetAttrs = openInNewWindow ? ' target="_blank" rel="noopener noreferrer"' : "";
    editor.chain().focus().insertContent(
      `<a href="${url}"${targetAttrs} class="rte-btn rte-btn-${variant}">${text}</a> `
    ).run();
    setDialog(null);
  }

  const BLOCK_OPTIONS = [
    { value: "body", label: "Body text" },
    { value: "h1", label: "Heading 1" },
    { value: "h2", label: "Heading 2" },
    { value: "h3", label: "Heading 3" },
    { value: "h4", label: "Heading 4" },
    { value: "h5", label: "Heading 5" },
    { value: "caption", label: "Caption" },
  ];

  const blockType = getBlockType();

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="mb-4" style={{ maxWidth: EDITOR_WIDTH }}>
      {/* Empty label suppressed (rather than always rendering the element) so
          ResponsiveRichTextEditor can supply its own label+device-toggle row above this
          component instead of double-labeling the field. */}
      {label && (
        <label style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: ACCENT, letterSpacing: "0.12em", textTransform: "uppercase", display: "block", marginBottom: "6px" }}>
          {label}
        </label>
      )}

      {/* ── Toolbar — sticky so it stays reachable while editing a long field.
           top: 70 stacks it directly below the card's own sticky header (same height). ── */}
      <div
        style={{
          position: "sticky",
          top: 70,
          zIndex: 4,
          background: "#0C1117",
          border: "1px solid rgba(237,232,223,0.08)",
          borderBottom: "1px solid rgba(237,232,223,0.04)",
          borderRadius: "10px 10px 0 0",
          padding: "6px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
        }}
      >
        {/* Row 1 — typography */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
          <ToolbarBtn onClick={() => editor.chain().focus().undo().run()} title="Undo"><Undo size={12} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().redo().run()} title="Redo"><Redo size={12} /></ToolbarBtn>
          <Divider />

          {/* Block type dropdown */}
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <select
              value={blockType}
              onChange={(e) => setBlockType(e.target.value)}
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                background: "rgba(237,232,223,0.04)",
                border: "1px solid rgba(237,232,223,0.1)",
                borderRadius: 6,
                color: "#EDE8DF",
                fontFamily: "'DM Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.04em",
                padding: "4px 22px 4px 8px",
                cursor: "pointer",
                outline: "none",
                minWidth: 94,
              }}
            >
              {BLOCK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} style={{ background: "#141D24", color: "#EDE8DF" }}>{o.label}</option>
              ))}
            </select>
            <ChevronDown size={10} style={{ position: "absolute", right: 6, color: "#6A7A83", pointerEvents: "none" }} />
          </div>
          <Divider />

          {/* Font size control */}
          <div style={{ display: "flex", alignItems: "center", gap: 1, background: "rgba(237,232,223,0.04)", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 6, padding: "1px 2px" }}>
            <button type="button" onClick={() => stepSize(-1)} onMouseDown={(e) => e.preventDefault()} title="Decrease font size"
              style={{ ...btnBase, padding: "2px 5px", color: "#EDE8DF" }}>
              <span style={{ fontSize: 13, lineHeight: 1, fontWeight: 300 }}>−</span>
            </button>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#EDE8DF", minWidth: 30, textAlign: "center" }}>{currentSize}</span>
            <button type="button" onClick={() => stepSize(1)} onMouseDown={(e) => e.preventDefault()} title="Increase font size"
              style={{ ...btnBase, padding: "2px 5px", color: "#EDE8DF" }}>
              <span style={{ fontSize: 13, lineHeight: 1, fontWeight: 300 }}>+</span>
            </button>
          </div>
          <Divider />

          {/* Text formatting */}
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold"><Bold size={12} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic"><Italic size={12} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline"><UnderlineIcon size={12} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough"><Strikethrough size={12} /></ToolbarBtn>
          <ToolbarBtn
            onClick={() => {
              if (editor.getAttributes("textStyle").fontFamily === SECONDARY_FONT_CSS) {
                editor.chain().focus().unsetFontFamily().run();
              } else {
                editor.chain().focus().setFontFamily(SECONDARY_FONT_CSS).run();
              }
            }}
            active={editor.getAttributes("textStyle").fontFamily === SECONDARY_FONT_CSS}
            title="Secondary font — mix in the Design System's secondary typeface"
          >
            <SecondaryFontIcon size={12} />
          </ToolbarBtn>

          {/* Text colour */}
          <button
            type="button"
            title="Text colour"
            onClick={() => setDialog(dialog === "color" ? null : "color")}
            onMouseDown={(e) => e.preventDefault()}
            style={{ ...btnBase, padding: "4px 5px", position: "relative", background: dialog === "color" ? "rgba(20,173,181,0.15)" : "none" }}
          >
            <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", fontWeight: 600, color: currentColor || "#EDE8DF", letterSpacing: 0 }}>A</span>
              <span style={{ width: 14, height: 3, borderRadius: 2, background: currentColor || "#EDE8DF" }} />
            </span>
          </button>
          <Divider />

          {/* Per-selection overrides — each defaults to "Auto" (follows the Design System's
              configured value) until stepped, at which point a × appears to clear it again. */}
          <Stepper
            label="LH"
            title="line height"
            display={currentLineHeight === null ? "Auto" : String(currentLineHeight)}
            onDec={() => stepLineHeight(-1)}
            onInc={() => stepLineHeight(1)}
            onClear={currentLineHeight !== null ? () => editor.chain().focus().unsetLineHeight().run() : undefined}
          />
          <Stepper
            label="WT"
            title="font weight"
            display={currentWeight === null ? String(effectiveWeight) : String(currentWeight)}
            onDec={() => stepWeight(-1)}
            onInc={() => stepWeight(1)}
            onClear={currentWeight !== null ? () => editor.chain().focus().unsetFontWeight().run() : undefined}
          />
          <Stepper
            label="LS"
            title="letter spacing"
            display={currentLetterSpacing === null ? "Auto" : `${currentLetterSpacing}em`}
            onDec={() => stepLetterSpacing(-1)}
            onInc={() => stepLetterSpacing(1)}
            onClear={currentLetterSpacing !== null ? () => editor.chain().focus().unsetLetterSpacing().run() : undefined}
          />
          <Stepper
            label="MW"
            title="max width — caps how wide this block renders on the live page; narrower still wraps and reflows normally on small screens"
            display={currentMaxWidth === null ? "Auto" : `${currentMaxWidth}px`}
            onDec={() => stepMaxWidth(-1)}
            onInc={() => stepMaxWidth(1)}
            onClear={currentMaxWidth !== null ? () => editor.chain().focus().unsetMaxWidth().run() : undefined}
            onSetValue={(n) => editor.chain().focus().setMaxWidth(`${Math.max(50, n)}px`).run()}
          />
        </div>

        {/* Row 2 — insert */}
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, paddingTop: 3, borderTop: "1px solid rgba(237,232,223,0.05)" }}>
          {/* Alignment — when an image is selected these align the image itself (updates its own
              "align" attribute, baked into the saved <img>'s style) instead of the surrounding
              text, since an image is a block node on its own and setTextAlign has no text block
              to apply to. */}
          {(["left", "center", "right"] as const).map((dir) => {
            const Icon = dir === "left" ? AlignLeft : dir === "center" ? AlignCenter : AlignRight;
            const isImage = editor.isActive("image");
            return (
              <ToolbarBtn
                key={dir}
                onClick={() => {
                  if (isImage) editor.chain().focus().updateAttributes("image", { align: dir }).run();
                  else editor.chain().focus().setTextAlign(dir).run();
                }}
                active={isImage ? editor.isActive("image", { align: dir }) : editor.isActive({ textAlign: dir })}
                title={isImage ? `Align image ${dir}` : `Align ${dir}`}
              >
                <Icon size={12} />
              </ToolbarBtn>
            );
          })}
          <Divider />

          {/* Mobile-width preview — constrains the content column to a phone-width viewport so
              a long headline's real wrapping can be checked before saving, without changing the
              actual saved content or the editor's own typography. */}
          <ToolbarBtn onClick={() => setMobilePreview((v) => !v)} active={mobilePreview} title="Preview at mobile width">
            <Smartphone size={12} />
          </ToolbarBtn>
          <Divider />

          {/* Lists */}
          <ToolbarBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list"><List size={12} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered list"><ListOrdered size={12} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule"><Minus size={12} /></ToolbarBtn>
          <Divider />

          {/* Media */}
          <ToolbarBtn onClick={() => setDialog(dialog === "link" ? null : "link")} active={editor.isActive("link") || dialog === "link"} title="Insert link"><Link2 size={12} /></ToolbarBtn>
          <ToolbarBtn onClick={() => { setDialog(null); setShowLibrary(true); }} active={showLibrary} title="Insert image from library"><ImageIcon size={12} /></ToolbarBtn>
          <ToolbarBtn onClick={() => setDialog(dialog === "video" ? null : "video")} active={dialog === "video"} title="Embed video"><YoutubeIcon size={12} /></ToolbarBtn>
          <ToolbarBtn onClick={() => setDialog(dialog === "pdf" ? null : "pdf")} active={dialog === "pdf"} title="Insert PDF link"><FileText size={12} /></ToolbarBtn>
          <ToolbarBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} active={editor.isActive("table")} title="Insert table"><TableIcon size={12} /></ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor.chain().focus().insertContent({
              type: "collapsiblePanel",
              attrs: { title: "New question", icon: "chevron" },
              content: [{ type: "paragraph" }],
            }).run()}
            active={editor.isActive("collapsiblePanel")}
            title="Insert collapsible panel (FAQ / hide-and-reveal content)"
          ><PanelBottom size={12} /></ToolbarBtn>
          <Divider />

          {/* Table editing — only shown while the cursor is inside a table */}
          {editor.isActive("table") && (
            <>
              <ToolbarBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Add row below"><Rows3 size={12} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add column right"><Columns3 size={12} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().deleteRow().run()} title="Delete row"><Rows3 size={12} style={{ opacity: 0.5 }} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().deleteColumn().run()} title="Delete column"><Columns3 size={12} style={{ opacity: 0.5 }} /></ToolbarBtn>
              <ToolbarBtn onClick={() => editor.chain().focus().deleteTable().run()} title="Delete table"><Trash2 size={12} /></ToolbarBtn>
              <Divider />
            </>
          )}

          {/* Insert button — one trigger opening the same text/URL/style dialog the 3 separate
              Primary/Secondary/Ghost quick-inserts used to bypass; the dialog already offers all
              three styles itself (see ButtonDialog above), so those made it redundant. Styled as
              a miniature of the secondary button variant so the icon itself reads as "a button",
              rather than a generic pointer/cursor glyph. */}
          <button
            type="button"
            onClick={() => setDialog(dialog === "button" ? null : "button")}
            onMouseDown={(e) => e.preventDefault()}
            title="Insert button"
            style={{
              fontFamily: "'DM Mono', monospace", fontSize: "10px", padding: "3px 9px", borderRadius: 5, cursor: "pointer",
              background: dialog === "button" ? "rgba(20,173,181,0.15)" : "transparent",
              color: "#14ADB5", border: "1px solid #14ADB5", letterSpacing: "0.04em",
            }}
          >
            Button
          </button>
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      {dialog && (
        <div className="relative" style={{ zIndex: 20 }}>
          <div className="absolute left-0 top-0 shadow-xl" style={{ zIndex: 20 }}>
            {dialog === "link" && (
              <LinkDialog
                initialUrl={editor.getAttributes("link").href || "https://"}
                initialNewWindow={editor.getAttributes("link").target === "_blank"}
                projects={internalProjectPages}
                onConfirm={(url, openInNewWindow) => {
                  editor.chain().focus().extendMarkRange("link").setLink({
                    href: url,
                    target: openInNewWindow ? "_blank" : null,
                    rel: openInNewWindow ? "noopener noreferrer" : null,
                  }).run();
                  setDialog(null);
                }}
                onClose={() => setDialog(null)}
              />
            )}
            {dialog === "video" && (
              <VideoDialog
                onConfirm={(url) => { (editor.commands as unknown as Record<string, (args: unknown) => void>).setYoutube({ src: url }); setDialog(null); }}
                onClose={() => setDialog(null)}
              />
            )}
            {dialog === "pdf" && (
              <PDFDialog
                onConfirm={(url, lbl) => {
                  editor.chain().focus().insertContent(`<a href="${url}" target="_blank" rel="noopener noreferrer" class="rte-pdf">${lbl}</a> `).run();
                  setDialog(null);
                }}
                onClose={() => setDialog(null)}
              />
            )}
            {dialog === "button" && (
              <ButtonDialog
                projects={internalProjectPages}
                onConfirm={insertButton}
                onClose={() => setDialog(null)}
              />
            )}
            {dialog === "color" && (
              <ColorPicker
                currentColor={currentColor}
                onSet={(c) => { editor.chain().focus().setColor(c).run(); }}
                onClear={() => { editor.chain().focus().unsetColor().run(); setDialog(null); }}
              />
            )}
          </div>
        </div>
      )}

      {/* ── Editor area ─────────────────────────────────────────────────── */}
      <div
        className="rounded-b-lg"
        style={{ background: "#0C1117", border: "1px solid rgba(237,232,223,0.08)", borderTop: "none" }}
        onClick={() => editor.chain().focus().run()}
      >
        <style>{`
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #EDE8DF;
            pointer-events: none;
            height: 0;
            font-family: 'DM Sans', sans-serif;
            font-size: 14px;
            font-weight: 300;
          }
          /* Nested empty nodes (e.g. inside a collapsible panel) — the rule above only
             covers the doc's very first paragraph when the whole editor is empty. */
          .ProseMirror .is-empty::before {
            content: attr(data-placeholder);
            float: left;
            color: #EDE8DF;
            opacity: 0.4;
            pointer-events: none;
            height: 0;
            font-family: 'DM Sans', sans-serif;
            font-size: 14px;
            font-weight: 300;
          }
          .ProseMirror h1 { font-family: 'Poppins', sans-serif; font-size: var(--h1-size, 24px); font-weight: 500; color: #EDE8DF; margin: 18px 0 8px; line-height: 1.2; letter-spacing: -0.01em; }
          .ProseMirror h2 { font-family: 'Poppins', sans-serif; font-size: var(--h2-size, 19px); font-weight: 400; color: #EDE8DF; margin: 16px 0 7px; line-height: 1.25; }
          .ProseMirror h3 { font-family: 'Poppins', sans-serif; font-size: var(--h3-size, 15.5px); font-weight: 400; color: #EDE8DF; margin: 13px 0 6px; }
          .ProseMirror h4 { font-family: 'DM Sans', sans-serif; font-size: 13.5px; font-weight: 500; color: #C8D2D8; margin: 11px 0 5px; letter-spacing: 0.01em; }
          .ProseMirror h5 { font-family: 'DM Mono', monospace; font-size: var(--label-size, 11px); font-weight: 400; color: #EDE8DF; margin: 10px 0 4px; letter-spacing: 0.1em; text-transform: uppercase; }
          .ProseMirror p[data-type="caption"] { font-family: 'DM Mono', monospace; font-size: var(--label-size, 10.5px); color: #5A6A73; letter-spacing: 0.06em; margin: 2px 0 14px; line-height: 1.5; font-style: italic; }
          .ProseMirror p { margin: 0 0 10px; }
          .ProseMirror ul, .ProseMirror ol { padding-left: 20px; margin: 0 0 10px; }
          .ProseMirror li { margin-bottom: 4px; }
          .ProseMirror hr { border: none; border-top: 1px solid rgba(237,232,223,0.08); margin: 18px 0; }
          .ProseMirror img { max-width: 100%; border-radius: 8px; margin: 12px 0; display: block; }
          .ProseMirror iframe { border-radius: 8px; margin: 12px 0; max-width: 100%; }
          .ProseMirror a.rte-link { color: #14ADB5; text-decoration: underline; }
          .ProseMirror a.rte-pdf { color: #14ADB5; font-family: 'DM Mono', monospace; font-size: 12px; }
          .ProseMirror blockquote { border-left: 3px solid #14ADB5; padding-left: 14px; margin: 12px 0; color: #EDE8DF; font-style: italic; }
          .ProseMirror strong { color: #EDE8DF; font-weight: 500; }
          /* h1/h4 above are also hardcoded to 500 — same collision as .rte-content on the live
             site, where Bold silently does nothing inside those headings. bolder always renders
             heavier than the heading's own weight, whatever that is. */
          .ProseMirror h1 strong, .ProseMirror h2 strong, .ProseMirror h3 strong,
          .ProseMirror h4 strong, .ProseMirror h5 strong { font-weight: bolder; }
          .ProseMirror em { color: #A8B4BC; }
          .ProseMirror a.rte-btn { display: inline-block; padding: 7px 18px; border-radius: 8px; text-decoration: none; font-family: 'DM Mono', monospace; font-size: 11.5px; letter-spacing: 0.06em; margin: 4px 3px 4px 0; transition: opacity 0.2s; }
          .ProseMirror a.rte-btn:hover { opacity: 0.8; }
          .ProseMirror a.rte-btn-primary { background: #14ADB5; color: #0C1117; border: 1.5px solid #14ADB5; }
          .ProseMirror a.rte-btn-secondary { background: transparent; color: #14ADB5; border: 1.5px solid #14ADB5; }
          .ProseMirror a.rte-btn-ghost { background: transparent; color: #EDE8DF; border: 1.5px solid rgba(237,232,223,0.2); }
          .ProseMirror .tableWrapper { overflow-x: auto; margin: 12px 0; }
          .ProseMirror table { border-collapse: collapse; table-layout: fixed; width: 100%; margin: 0; }
          .ProseMirror table td, .ProseMirror table th { border: 1px solid rgba(237,232,223,0.15); padding: 7px 10px; vertical-align: top; min-width: 80px; position: relative; }
          .ProseMirror table th { background: rgba(20,173,181,0.08); color: #EDE8DF; font-weight: 500; text-align: left; }
          .ProseMirror table .selectedCell { background: rgba(20,173,181,0.12); }
          .ProseMirror table .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; background: #14ADB5; pointer-events: none; }
          .ProseMirror table.resize-cursor { cursor: col-resize; }
        `}</style>
        {mobilePreview ? (
          <div style={{ padding: "16px", display: "flex", justifyContent: "center" }}>
            <div style={{ width: "375px", maxWidth: "100%", border: "1px solid rgba(20,173,181,0.25)", borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", background: "rgba(20,173,181,0.08)", borderBottom: "1px solid rgba(20,173,181,0.15)" }}>
                <Smartphone size={10} style={{ color: ACCENT }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: ACCENT, letterSpacing: "0.06em" }}>375px — MOBILE WIDTH</span>
              </div>
              <EditorContent editor={editor} />
            </div>
          </div>
        ) : (
          <EditorContent editor={editor} />
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "4px 12px 8px" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "9.5px", color: "#8C9AA3" }}>{editor.getText().length} characters</span>
        </div>
      </div>

      {showLibrary && (
        <MediaLibraryModal
          onSelect={(src, alt) => {
            editor.chain().focus().setImage({ src, alt }).run();
            setShowLibrary(false);
          }}
          onClose={() => setShowLibrary(false)}
        />
      )}
    </div>
  );
}
