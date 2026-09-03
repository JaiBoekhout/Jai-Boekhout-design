"use client";

import { useState, forwardRef } from "react";
import { Plus, X, GripVertical, ArrowUp, ArrowDown } from "lucide-react";

const ACCENT = "#14ADB5";

// Shared drag-and-drop reordering for any list of CMSCards/rows — pairs with each list's
// existing up/down arrow buttons rather than replacing them, so every reorderable list in the
// CMS offers both. `dragHandleProps(i)` goes on a small grip icon (not the whole card, so
// clicking/typing inside the card's own fields isn't affected); `dropTargetProps(i)` goes on
// the card/row itself so dropping anywhere on it (not just exactly on the handle) reorders.
export function useDragReorder<T>(items: T[], onChange: (items: T[]) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function reorder(from: number, to: number) {
    if (from === to) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  }

  function dragHandleProps(index: number) {
    return {
      draggable: true,
      onDragStart: () => setDragIndex(index),
      onDragEnd: () => { setDragIndex(null); setOverIndex(null); },
    };
  }

  function dropTargetProps(index: number) {
    return {
      onDragEnter: () => { if (dragIndex !== null && dragIndex !== index) setOverIndex(index); },
      onDragOver: (e: React.DragEvent) => e.preventDefault(),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        if (dragIndex !== null) reorder(dragIndex, index);
        setDragIndex(null);
        setOverIndex(null);
      },
    };
  }

  function cardStyle(index: number): React.CSSProperties {
    return {
      opacity: dragIndex === index ? 0.4 : 1,
      borderColor: overIndex === index ? "rgba(20,173,181,0.5)" : undefined,
    };
  }

  return { dragIndex, overIndex, dragHandleProps, dropTargetProps, cardStyle };
}

// Drag handle icon — spread dragHandleProps(i) from useDragReorder onto this.
export function DragHandle(props: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      {...props}
      className="hover:opacity-70 transition-opacity"
      style={{ display: "inline-flex", alignItems: "center", cursor: "grab", color: "#6B7E8A", padding: "2px" }}
    >
      <GripVertical size={13} />
    </span>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  color: ACCENT,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "6px",
};

const inputBase: React.CSSProperties = {
  width: "100%",
  background: "#0C1117",
  border: "1px solid rgba(237,232,223,0.08)",
  borderRadius: "8px",
  padding: "10px 14px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: "14px",
  color: "#EDE8DF",
  fontWeight: 300,
  outline: "none",
  transition: "border-color 0.2s",
};

// Spread into a <select>'s style AFTER its own base styles (e.g. `{...base, ...selectArrowStyle}`)
// — every admin <select> was relying on the browser's native dropdown arrow, flush against the
// field's edge with no control over its inset. This swaps in a custom chevron sat further in.
export const selectArrowStyle: React.CSSProperties = {
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2314ADB5' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 16px center",
  paddingRight: "38px",
};

const charCountStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "9.5px",
  color: "#8C9AA3",
  textAlign: "right",
  marginTop: "4px",
};

// Shared "this differs from what's in Postgres" treatment — every field below takes an
// optional `dirty` prop and falls back to this same border/glow so an admin scanning a long
// page can spot every unsaved field at a glance, not just the one they're currently in.
const DIRTY_BORDER_COLOR = "rgba(245,158,11,0.6)";
const DIRTY_GLOW = "0 0 0 3px rgba(245,158,11,0.12)";
function restBorderColor(dirty: boolean | undefined) {
  return dirty ? DIRTY_BORDER_COLOR : "rgba(237,232,223,0.08)";
}

export function CMSInput({ label, value, onChange, dirty }: { label: string; value: string; onChange: (v: string) => void; dirty?: boolean }) {
  return (
    <div className="flex flex-col mb-4">
      <label style={labelStyle}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputBase, borderColor: restBorderColor(dirty), boxShadow: dirty ? DIRTY_GLOW : undefined }}
        onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
        onBlur={(e) => (e.target.style.borderColor = restBorderColor(dirty))}
      />
      <span style={charCountStyle}>{value.length} characters</span>
    </div>
  );
}

const URL_SCHEME_RE = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//;

function looksLikeValidUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true; // empty is fine — these fields are all optional
  const candidate = URL_SCHEME_RE.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const u = new URL(candidate);
    return u.hostname === "localhost" || u.hostname.includes(".");
  } catch {
    return false;
  }
}

// Same as CMSInput, but flags text that doesn't look like a URL and auto-prepends
// "https://" on blur for bare domains (e.g. "example.com") so links don't silently
// end up relative to the current page.
export function CMSUrlInput({ label, value, onChange, dirty }: { label: string; value: string; onChange: (v: string) => void; dirty?: boolean }) {
  const [touched, setTouched] = useState(false);
  const valid = looksLikeValidUrl(value);
  const showError = touched && !valid;

  return (
    <div className="flex flex-col mb-4">
      <label style={labelStyle}>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputBase, borderColor: showError ? "rgba(192,57,43,0.5)" : restBorderColor(dirty), boxShadow: !showError && dirty ? DIRTY_GLOW : undefined }}
        onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
        onBlur={(e) => {
          setTouched(true);
          const trimmed = e.target.value.trim();
          if (trimmed && !URL_SCHEME_RE.test(trimmed) && looksLikeValidUrl(trimmed)) {
            onChange(`https://${trimmed}`);
          }
          e.target.style.borderColor = trimmed && !looksLikeValidUrl(trimmed) ? "rgba(192,57,43,0.5)" : restBorderColor(dirty);
        }}
      />
      {showError ? (
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "10px", color: "#C0392B", marginTop: "5px" }}>
          Doesn&rsquo;t look like a valid URL
        </span>
      ) : (
        <span style={charCountStyle}>{value.length} characters</span>
      )}
    </div>
  );
}

function slugify(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Editable /work/<slug> URL path for a project or case study — see projectUrlSlug() in
// contentStore.ts, which is what every href on the site actually resolves through. `fallback`
// is whatever this entry resolves to today with the field left empty (its internal id), shown
// as both the placeholder and the live preview so the admin always sees the real current URL.
export function CMSSlugInput({ label, value, fallback, onChange, dirty }: { label: string; value: string; fallback: string; onChange: (v: string) => void; dirty?: boolean }) {
  const preview = (value && value.trim()) || fallback;
  return (
    <div className="flex flex-col mb-4">
      <label style={labelStyle}>{label}</label>
      <input
        type="text"
        value={value}
        placeholder={fallback}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const cleaned = slugify(e.target.value);
          if (cleaned !== e.target.value) onChange(cleaned);
          e.target.style.borderColor = restBorderColor(dirty);
        }}
        style={{ ...inputBase, borderColor: restBorderColor(dirty), boxShadow: dirty ? DIRTY_GLOW : undefined }}
        onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
      />
      <span style={charCountStyle}>yoursite.com/work/{preview}</span>
    </div>
  );
}

export function CMSTextarea({ label, value, onChange, rows = 4, dirty }: { label: string; value: string; onChange: (v: string) => void; rows?: number; dirty?: boolean }) {
  return (
    <div className="flex flex-col mb-4">
      <label style={labelStyle}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        style={{ ...inputBase, resize: "vertical", borderColor: restBorderColor(dirty), boxShadow: dirty ? DIRTY_GLOW : undefined }}
        onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
        onBlur={(e) => (e.target.style.borderColor = restBorderColor(dirty))}
      />
      <span style={charCountStyle}>{value.length} characters</span>
    </div>
  );
}

export function CMSArrayEditor({ label, items, onChange, dirty }: { label: string; items: string[]; onChange: (items: string[]) => void; dirty?: boolean }) {
  const [newItem, setNewItem] = useState("");
  const { dragHandleProps, dropTargetProps, cardStyle } = useDragReorder(items, onChange);

  function add() {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem("");
    }
  }

  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function update(idx: number, val: string) {
    onChange(items.map((item, i) => (i === idx ? val : item)));
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }

  return (
    <div className="flex flex-col mb-4" style={dirty ? { borderLeft: `2px solid ${DIRTY_BORDER_COLOR}`, paddingLeft: 10 } : undefined}>
      <label style={labelStyle}>{label}</label>
      <div className="flex flex-col gap-2 mb-2">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 rounded-lg"
            style={{ ...cardStyle(i), padding: "2px" }}
            {...dropTargetProps(i)}
          >
            <DragHandle {...dragHandleProps(i)} />
            <input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              style={{ ...inputBase, flex: 1 }}
              onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
              onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.08)")}
            />
            <button
              onClick={() => move(i, -1)}
              disabled={i === 0}
              style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#3A4650" : "#EDE8DF", padding: "4px", flexShrink: 0 }}
              className="hover:opacity-70 transition-opacity"
            >
              <ArrowUp size={13} />
            </button>
            <button
              onClick={() => move(i, 1)}
              disabled={i === items.length - 1}
              style={{ background: "none", border: "none", cursor: i === items.length - 1 ? "default" : "pointer", color: i === items.length - 1 ? "#3A4650" : "#EDE8DF", padding: "4px", flexShrink: 0 }}
              className="hover:opacity-70 transition-opacity"
            >
              <ArrowDown size={13} />
            </button>
            <button
              onClick={() => remove(i)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: "4px", flexShrink: 0 }}
              className="hover:opacity-60 transition-opacity"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Add item…"
          style={{ ...inputBase, flex: 1, fontSize: "13px" }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.08)")}
        />
        <button
          onClick={add}
          style={{ background: "rgba(20,173,181,0.1)", border: "1px solid rgba(20,173,181,0.3)", borderRadius: "8px", cursor: "pointer", color: ACCENT, padding: "8px 12px" }}
          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

export function CMSChipEditor({ label, items, onChange, dirty }: { label: string; items: string[]; onChange: (items: string[]) => void; dirty?: boolean }) {
  const [newItem, setNewItem] = useState("");
  const { dragIndex, overIndex, dragHandleProps, dropTargetProps } = useDragReorder(items, onChange);

  // Splits comma-separated input into individual tags, dropping blanks and duplicates
  function addTags(raw: string) {
    const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return;
    const unique = parts.filter((p, i) => parts.indexOf(p) === i && !items.includes(p));
    if (unique.length) onChange([...items, ...unique]);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val.includes(",")) {
      const segments = val.split(",");
      const trailing = segments.pop() ?? ""; // text after the last comma stays in the input
      addTags(segments.join(","));
      setNewItem(trailing);
    } else {
      setNewItem(val);
    }
  }

  function commit() {
    addTags(newItem);
    setNewItem("");
  }

  function remove(idx: number) {
    onChange(items.filter((_, i) => i !== idx));
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  }

  return (
    <div className="flex flex-col mb-4" style={dirty ? { borderLeft: `2px solid ${DIRTY_BORDER_COLOR}`, paddingLeft: 10 } : undefined}>
      <label style={labelStyle}>{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {items.map((item, i) => (
          <span
            key={i}
            {...dragHandleProps(i)}
            {...dropTargetProps(i)}
            className="flex items-center gap-1"
            style={{
              fontFamily: "'DM Mono', monospace", fontSize: "11px", color: "#EDE8DF", background: "#141D24",
              border: `1px solid ${overIndex === i ? "rgba(20,173,181,0.5)" : "rgba(237,232,223,0.08)"}`,
              borderRadius: "100px", padding: "3px 6px", cursor: "grab",
              opacity: dragIndex === i ? 0.4 : 1, transition: "border-color 0.15s ease, opacity 0.15s ease",
            }}
          >
            <GripVertical size={10} style={{ color: "#6B7E8A", flexShrink: 0 }} />
            {item}
            <button
              onClick={() => move(i, -1)}
              disabled={i === 0}
              style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#3A4650" : "#8C9AA3", padding: 0, display: "flex" }}
              className="hover:opacity-70"
            >
              <ArrowUp size={9} />
            </button>
            <button
              onClick={() => move(i, 1)}
              disabled={i === items.length - 1}
              style={{ background: "none", border: "none", cursor: i === items.length - 1 ? "default" : "pointer", color: i === items.length - 1 ? "#3A4650" : "#8C9AA3", padding: 0, display: "flex" }}
              className="hover:opacity-70"
            >
              <ArrowDown size={9} />
            </button>
            <button
              onClick={() => remove(i)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: 0, marginLeft: "2px" }}
              className="hover:opacity-60"
            >
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={newItem}
          onChange={handleChange}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
          placeholder="Add tag… (comma-separated)"
          style={{ ...inputBase, flex: 1, fontSize: "13px" }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.08)")}
        />
        <button
          onClick={commit}
          style={{ background: "rgba(20,173,181,0.1)", border: "1px solid rgba(20,173,181,0.3)", borderRadius: "8px", cursor: "pointer", color: ACCENT, padding: "8px 12px" }}
          className="flex items-center gap-1 hover:opacity-80 transition-opacity"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

export function CMSSectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontFamily: "'Poppins', sans-serif",
        fontSize: "19px",
        color: "#EDE8DF",
        fontWeight: 600,
        marginBottom: "16px",
        marginTop: "8px",
        paddingBottom: "10px",
        borderBottom: "1px solid rgba(237,232,223,0.06)",
      }}
    >
      {children}
    </h3>
  );
}

export const CMSCard = forwardRef<HTMLDivElement, { children: React.ReactNode; style?: React.CSSProperties } & React.HTMLAttributes<HTMLDivElement>>(function CMSCard({ children, style, ...rest }, ref) {
  return (
    <div
      ref={ref}
      className="rounded-xl p-5 mb-4"
      style={{ background: "#141D24", border: "1px solid rgba(237,232,223,0.06)", transition: "opacity 0.15s ease, border-color 0.15s ease", ...style }}
      {...rest}
    >
      {children}
    </div>
  );
});
