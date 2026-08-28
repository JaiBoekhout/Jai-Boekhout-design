"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, MoveRight, Trash2, Loader2, AlertTriangle, Upload, Image as ImageIcon } from "lucide-react";
import type { MediaFile } from "@/app/api/media/route";

const LS: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  color: "#14ADB5",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "6px",
};

const INPUT: React.CSSProperties = {
  width: "100%",
  background: "rgba(237,232,223,0.04)",
  border: "1px solid rgba(237,232,223,0.1)",
  borderRadius: 7,
  padding: "8px 10px",
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 12,
  color: "#EDE8DF",
  outline: "none",
};

export interface MediaMeta {
  displayName?: string;
  alt?: string;
  description?: string;
}

interface Props {
  file: MediaFile;
  meta: MediaMeta;
  onMetaChange: (patch: Partial<MediaMeta>) => void;
  folderOptions: { path: string; label: string }[];
  currentFolder: string;
  movingTo: string;
  onMovingToChange: (path: string) => void;
  onMove: () => void;
  isMoving: boolean;
  onDelete: () => void;
  isDeleting: boolean;
  /** Human-readable list of places this file is referenced (from findMediaUsage()) —
      shown as a warning that requires an extra confirm click before deleting. */
  usages: string[];
  /** Repoints every reference in `usages` at a newly-uploaded file, then deletes this one.
      Omit (along with onReplaceFromLibrary) in contexts where offering a nested "replace"
      flow doesn't make sense — e.g. MediaLibraryModal, itself a picker — the delete warning
      still shows, just without the replace shortcuts. */
  onReplaceWithUpload?: (file: File) => void;
  /** Opens a library picker in the parent; the parent calls back into its own replace logic
      once the admin picks an existing file (same repoint-then-delete behavior as upload). */
  onReplaceFromLibrary?: () => void;
  isReplacing?: boolean;
}

// The "Image Info" editing panel — display name / alt text / caption / move / delete —
// shared between the Media Library's file panel and ImagePicker's in-modal preview so the
// two never drift apart on fields or copy.
export function MediaInfoPanel({ file, meta, onMetaChange, folderOptions, currentFolder, movingTo, onMovingToChange, onMove, isMoving, onDelete, isDeleting, usages, onReplaceWithUpload, onReplaceFromLibrary, isReplacing }: Props) {
  const canReplace = !!(onReplaceWithUpload && onReplaceFromLibrary);
  const [copied, setCopied] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);

  // This panel scrolls internally (its container is overflow-y: auto), but the site hides all
  // scrollbars everywhere (see globals.css), so there's no visual cue that expanding the confirm
  // block pushed content below the fold — easy to miss entirely, especially the Cancel button.
  // Scrolling it into view the instant it appears means it's never something the admin has to
  // go looking for.
  useEffect(() => {
    if (confirmingDelete) confirmRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [confirmingDelete]);

  // Pixel dimensions aren't tracked by the media scan (app/api/media/route.ts only reads file
  // size off disk) — read naturally off the file itself via a hidden probe image instead of
  // adding image decoding to that directory-listing endpoint.
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    setDimensions(null);
    if (file.mediaType !== "image") return;
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => { if (!cancelled) setDimensions({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.src = file.src;
    return () => { cancelled = true; };
  }, [file.src, file.mediaType]);

  function copyPath() {
    navigator.clipboard.writeText(file.src).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  function handleDeleteClick() {
    if (usages.length > 0 && !confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    onDelete();
  }

  return (
    <>
      {/* File path */}
      <div>
        <label style={LS}>File path</label>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <code style={{ flex: 1, fontFamily: "'DM Mono', monospace", fontSize: 9.5, color: "#EDE8DF", background: "#141D24", border: "1px solid rgba(237,232,223,0.06)", borderRadius: 6, padding: "6px 8px", wordBreak: "break-all", lineHeight: 1.4 }}>
            {file.src}
          </code>
          <button
            onClick={copyPath}
            style={{ background: "rgba(20,173,181,0.08)", border: "1px solid rgba(20,173,181,0.2)", borderRadius: 6, padding: "6px 8px", cursor: "pointer", color: "#14ADB5", flexShrink: 0 }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      {/* Display name */}
      <div>
        <label style={LS}>Display name</label>
        <input
          value={meta.displayName ?? ""}
          onChange={(e) => onMetaChange({ displayName: e.target.value })}
          placeholder={file.name}
          style={INPUT}
          onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.1)")}
        />
      </div>

      {/* Alt text */}
      <div>
        <label style={LS}>Alt text <span style={{ color: "#14ADB5" }}>· SEO</span></label>
        <textarea
          value={meta.alt ?? ""}
          onChange={(e) => onMetaChange({ alt: e.target.value })}
          placeholder="Describe the image for search engines…"
          rows={3}
          style={{ ...INPUT, resize: "none", lineHeight: 1.5 }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.1)")}
        />
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#EDE8DF", marginTop: 4, lineHeight: 1.4 }}>Aim for 50–125 characters.</p>
      </div>

      {/* Caption */}
      <div>
        <label style={LS}>Caption</label>
        <textarea
          value={meta.description ?? ""}
          onChange={(e) => onMetaChange({ description: e.target.value })}
          placeholder="Optional caption…"
          rows={2}
          style={{ ...INPUT, resize: "none", lineHeight: 1.5 }}
          onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
          onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.1)")}
        />
      </div>

      {/* Move to folder */}
      <div style={{ borderTop: "1px solid rgba(237,232,223,0.06)", paddingTop: 14 }}>
        <label style={LS}><MoveRight size={10} style={{ display: "inline", marginRight: 4 }} />Move to folder</label>
        <select
          value={movingTo}
          onChange={(e) => onMovingToChange(e.target.value)}
          style={{ width: "100%", background: "#141D24", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 7, padding: "8px 10px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EDE8DF", outline: "none", cursor: "pointer", marginBottom: 8 }}
        >
          <option value="" style={{ background: "#141D24" }}>/ (root)</option>
          {folderOptions.map((f) => (
            <option key={f.path} value={f.path} style={{ background: "#141D24" }}>/{f.label}</option>
          ))}
        </select>
        <button
          onClick={onMove}
          disabled={isMoving || movingTo === currentFolder}
          className="hover:opacity-80 transition-opacity"
          style={{
            width: "100%", background: movingTo === currentFolder ? "rgba(237,232,223,0.04)" : "rgba(20,173,181,0.12)",
            border: `1px solid ${movingTo === currentFolder ? "rgba(237,232,223,0.08)" : "rgba(20,173,181,0.3)"}`,
            borderRadius: 7, padding: "8px 0", cursor: movingTo === currentFolder ? "default" : "pointer",
            fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.06em",
            color: movingTo === currentFolder ? "#6B7E8A" : "#14ADB5",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          }}
        >
          {isMoving ? <Loader2 size={12} className="animate-spin" /> : <MoveRight size={12} />}
          {isMoving ? "Moving…" : movingTo === currentFolder ? "Already here" : "Move here"}
        </button>
      </div>

      {/* File details + delete */}
      <div style={{ borderTop: "1px solid rgba(237,232,223,0.06)", paddingTop: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 12, rowGap: 6, marginBottom: 12, alignItems: "baseline" }}>
          {([
            ["Type", file.ext.toUpperCase()],
            ["Size", file.sizeKb > 0 ? `${file.sizeKb} KB` : "—"],
            ["Resolution", dimensions ? `${dimensions.w} × ${dimensions.h}` : "—"],
          ] as const).map(([k, v]) => (
            <div key={k} style={{ display: "contents" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#EDE8DF", letterSpacing: "0.1em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{k}</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EDE8DF" }}>{v}</p>
            </div>
          ))}
        </div>

        {confirmingDelete && usages.length > 0 && (
          <div ref={confirmRef} style={{ background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.25)", borderRadius: 7, padding: "10px", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
              <AlertTriangle size={12} style={{ color: "#C0392B", flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#EDE8DF", lineHeight: 1.4 }}>
                This file is used in {usages.length} place{usages.length > 1 ? "s" : ""}:
              </span>
            </div>
            <ul style={{ margin: "0 0 10px", paddingLeft: 18, fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, color: "#EDE8DF", lineHeight: 1.6 }}>
              {usages.map((u, i) => <li key={i}>{u}</li>)}
            </ul>

            {canReplace && (
              <>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, color: "#8C9AA3", lineHeight: 1.5, margin: "0 0 6px" }}>
                  Or replace it everywhere it&apos;s used, then remove the old file:
                </p>
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <button
                    onClick={() => replaceInputRef.current?.click()}
                    disabled={isReplacing}
                    className="hover:opacity-80 transition-opacity"
                    style={{ flex: 1, background: "rgba(20,173,181,0.1)", border: "1px solid rgba(20,173,181,0.3)", borderRadius: 6, padding: "7px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#14ADB5", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                  >
                    {isReplacing ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                    Upload new
                  </button>
                  <button
                    onClick={onReplaceFromLibrary}
                    disabled={isReplacing}
                    className="hover:opacity-80 transition-opacity"
                    style={{ flex: 1, background: "rgba(20,173,181,0.1)", border: "1px solid rgba(20,173,181,0.3)", borderRadius: 6, padding: "7px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#14ADB5", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}
                  >
                    <ImageIcon size={11} />
                    From library
                  </button>
                  <input
                    ref={replaceInputRef}
                    type="file"
                    accept="image/*,.gif,.svg,video/*,.mp4,.mov,.webm,.ogg"
                    style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onReplaceWithUpload?.(f); e.target.value = ""; }}
                  />
                </div>
              </>
            )}

            <button
              onClick={() => setConfirmingDelete(false)}
              style={{ width: "100%", background: "transparent", border: "1px solid rgba(237,232,223,0.15)", borderRadius: 6, padding: "6px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#EDE8DF" }}
            >
              Cancel
            </button>
          </div>
        )}

        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className="hover:opacity-80 transition-opacity"
          style={{ width: "100%", background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.25)", borderRadius: 7, padding: "8px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#C0392B", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          {isDeleting ? "Deleting…" : confirmingDelete ? "Delete anyway" : usages.length > 0 ? `Delete file (used ${usages.length}×)` : "Delete file"}
        </button>
      </div>
    </>
  );
}
