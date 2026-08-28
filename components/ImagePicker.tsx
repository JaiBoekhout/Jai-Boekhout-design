"use client";

import { useState, useEffect, useRef } from "react";
import {
  Image, Upload, X, Check, Loader2, Search, FolderOpen,
  RefreshCw, ListChecks, CheckSquare, Square, MoveRight, AlertTriangle, Trash2, FileImage,
} from "lucide-react";
import type { MediaFile, MediaFolder } from "@/app/api/media/route";
import { useContentStore, findMediaUsage, findOrphanedMedia, replaceMediaUsage } from "@/store/contentStore";
import { MediaInfoPanel } from "@/components/MediaInfoPanel";
import { MediaLibraryModal } from "@/components/MediaLibraryModal";
import { ImageFolderTree } from "@/components/ImageFolderTree";
import { sanitizeFilename, uniqueFilename } from "@/lib/media";
import { collectImages, collectFolders, fileFolder, matchesSearch } from "@/lib/mediaTree";

interface Props {
  value?: string;
  position?: string;
  scale?: number;
  previewRatio?: string;
  label?: string;
  onChange: (src: string | undefined) => void;
  onPositionChange?: (pos: string) => void;
  onScaleChange?: (scale: number) => void;
  /** When true, an image taller than the 3:4 recommendation (e.g. >1600px at 1200px wide)
   *  skips cropping entirely and instead displays — here and on the public site — as a
   *  natural-size, independently-scrollable panel. Only meaningful for the Hero image field. */
  allowTallScroll?: boolean;
  /** "cover" (default) crops to fill previewRatio, matching photo fields. "contain" letterboxes
   *  the whole image instead — for assets like logos that must never be cropped. Implies no
   *  focal-point/zoom controls regardless of onPositionChange/onScaleChange. */
  previewFit?: "cover" | "contain";
  /** Preview box background color. Defaults to the dark CMS background; logos usually want
   *  "#fff" to match how they'll actually render on their (typically white) card. */
  previewBackground?: string;
  /** Caps the preview box to a fixed pixel width (instead of stretching to fill the field's
   *  column, up to 440px) so the box reflects the image's actual rendered size on the site —
   *  e.g. a 24px logo mark or a 32px favicon, rather than a large blown-up crop preview. */
  previewMaxWidth?: number;
}

// An image is "tall" once its natural aspect ratio exceeds the recommended 3:4 (1200×1600)
// hero ratio — i.e. height/width > 4/3 — regardless of its actual upload resolution.
export const TALL_RATIO_THRESHOLD = 4 / 3;

export function useIsTallImage(src: string | undefined): boolean {
  const [isTall, setIsTall] = useState(false);
  useEffect(() => {
    if (!src) { setIsTall(false); return; }
    let cancelled = false;
    const img = new window.Image();
    img.onload = () => {
      if (!cancelled && img.naturalWidth > 0) {
        setIsTall(img.naturalHeight / img.naturalWidth > TALL_RATIO_THRESHOLD);
      }
    };
    img.src = src;
    return () => { cancelled = true; };
  }, [src]);
  return isTall;
}

function parsePos(pos: string | undefined): [number, number] {
  if (!pos) return [50, 50];
  const parts = pos.trim().split(/\s+/);
  return [parseFloat(parts[0]) ?? 50, parseFloat(parts[1]) ?? 50];
}

const PRESETS = [
  ["0% 0%",   "50% 0%",   "100% 0%"],
  ["0% 50%",  "50% 50%",  "100% 50%"],
  ["0% 100%", "50% 100%", "100% 100%"],
];
const PRESET_LABELS = [
  ["↖", "↑", "↗"],
  ["←", "⊙", "→"],
  ["↙", "↓", "↘"],
];

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

export function ImagePicker({ value, position, scale, previewRatio = "16/9", label = "Cover Image", onChange, onPositionChange, onScaleChange, allowTallScroll = false, previewFit = "cover", previewBackground = "#0C1117", previewMaxWidth }: Props) {
  const { content, updateContent, persistContent } = useContentStore();
  const isTall = useIsTallImage(allowTallScroll ? value : undefined);

  const [open, setOpen]             = useState(false);
  const [tree, setTree]             = useState<(MediaFile | MediaFolder)[]>([]);
  const [loading, setLoading]       = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [folderFilter, setFolderFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFile, setPreviewFile]   = useState<MediaFile | null>(null);
  const [movingTo, setMovingTo]     = useState("");
  const [isMoving, setIsMoving]     = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [showReplacePicker, setShowReplacePicker] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{ files: File[]; folder: string; names: string[] } | null>(null);
  const [dragging, setDragging]     = useState(false);
  const [showOrphansOnly, setShowOrphansOnly] = useState(false);
  const [selectMode, setSelectMode]       = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [bulkMovingTo, setBulkMovingTo]   = useState("");
  const [isBulkMoving, setIsBulkMoving]   = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  // Whole-modal drag & drop overlay — distinct from `dragging` above, which tracks the
  // focal-point mouse-drag on the field's own preview box, not a file being dragged in.
  const [modalDragging, setModalDragging] = useState(false);
  const modalDragCountRef = useRef(0);
  const previewRef  = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [px, py] = parsePos(position);

  // ── Media fetching ──────────────────────────────────────────────────────────
  async function fetchTree() {
    setLoading(true);
    try {
      const data = await fetch("/api/media").then((r) => r.json());
      setTree(data.tree ?? []);
    } finally { setLoading(false); }
  }

  useEffect(() => { if (open) fetchTree(); }, [open]);

  const allImages  = collectImages(tree);
  const folders    = collectFolders(tree);
  const allFolderPaths = ["", ...folders.map((f) => f.path)];
  const isSearching = searchQuery.trim().length > 0;
  const folderScope =
    folderFilter === "all" ? allImages : allImages.filter((img) => img.path.startsWith(folderFilter + "/"));
  const orphanedImages = showOrphansOnly ? findOrphanedMedia(content, folderScope) : [];
  const images =
    showOrphansOnly
      ? orphanedImages
      : isSearching
        ? allImages.filter((img) => matchesSearch(img, searchQuery, content.mediaMeta ?? {}))
        : folderScope;

  // ── Metadata helpers ────────────────────────────────────────────────────────
  function getMeta(src: string) { return content.mediaMeta?.[src] ?? {}; }
  function setMeta(src: string, patch: Partial<{ displayName: string; alt: string; description: string }>) {
    const updated = { ...content.mediaMeta, [src]: { ...getMeta(src), ...patch } };
    updateContent({ mediaMeta: updated });
    persistContent({ mediaMeta: updated });
  }

  // ── Upload ──────────────────────────────────────────────────────────────────
  // Checks the target folder for filename collisions before uploading — a silent overwrite
  // is how a photo used to get permanently lost with zero warning. Clean uploads go straight
  // through; anything colliding pauses for the "same name" confirmation dialog below instead.
  function handleUpload(files: FileList) {
    const arr = Array.from(files);
    if (!arr.length) return;
    const folder = folderFilter === "all" ? "" : folderFilter;
    const existingNames = new Set(allImages.filter((f) => fileFolder(f.path) === folder).map((f) => f.name));
    const collisionNames = arr.map((f) => sanitizeFilename(f.name)).filter((name) => existingNames.has(name));
    if (collisionNames.length > 0) {
      setPendingUpload({ files: arr, folder, names: collisionNames });
      return;
    }
    performUpload(arr, folder);
  }

  async function performUpload(arr: File[], folder: string) {
    if (!arr.length) return;
    setUploading(true);
    setUploadError(null);
    const fd = new FormData();
    arr.forEach((f) => fd.append("file", f));
    if (folder) fd.append("folder", folder);
    try {
      const data = await fetch("/api/media/upload", { method: "POST", body: fd }).then((r) => r.json());
      if (data.uploaded?.[0]?.src) {
        onChange(data.uploaded[0].src);
        setOpen(false);
      }
      if (data.rejected?.length) {
        setUploadError(data.rejected.map((r: { name: string; reason: string }) => `${r.name} — ${r.reason}`).join("; "));
      }
      await fetchTree();
    } finally { setUploading(false); }
  }

  // "Replace" keeps the file's own (sanitized) name — landing on the exact same path as the
  // file it collides with, so the upload overwrites it in place and every existing reference
  // to that path picks up the new content automatically. "Keep both" renames only the
  // colliding files to be unique.
  async function resolveUploadCollision(choice: "replace" | "keep-both" | "cancel") {
    if (!pendingUpload) return;
    const { files, folder } = pendingUpload;
    setPendingUpload(null);
    if (choice === "cancel") return;

    if (choice === "keep-both") {
      const existingNames = new Set(allImages.filter((f) => fileFolder(f.path) === folder).map((f) => f.name));
      const renamed = files.map((f) => {
        const sanitized = sanitizeFilename(f.name);
        if (!existingNames.has(sanitized)) return f;
        const unique = uniqueFilename(sanitized, existingNames);
        existingNames.add(unique);
        return new File([f], unique, { type: f.type });
      });
      await performUpload(renamed, folder);
    } else {
      await performUpload(files, folder);
    }
  }

  // ── Move ────────────────────────────────────────────────────────────────────
  async function handleMove() {
    if (!previewFile) return;
    setIsMoving(true);
    try {
      const res  = await fetch("/api/media/move", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: previewFile.path, toFolder: movingTo }) });
      const data = await res.json();
      if (data.success) { setPreviewFile(null); setMovingTo(""); await fetchTree(); }
    } finally { setIsMoving(false); }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────
  async function handleDeleteFile() {
    if (!previewFile) return;
    setIsDeletingFile(true);
    try {
      await fetch("/api/media/delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: previewFile.path, type: "file" }) });
      if (value === previewFile.src) onChange(undefined);
      setPreviewFile(null);
      await fetchTree();
    } finally { setIsDeletingFile(false); }
  }

  // ── Bulk select ─────────────────────────────────────────────────────────────
  function toggleSelected(path: string) {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
    setBulkDeleteConfirm(false);
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedPaths(new Set());
    setBulkDeleteConfirm(false);
  }

  const selectedFiles = images.filter((f) => selectedPaths.has(f.path));
  const bulkUsages = selectedFiles.flatMap((f) => findMediaUsage(content, f.src));

  async function handleBulkDelete() {
    if (bulkUsages.length > 0 && !bulkDeleteConfirm) { setBulkDeleteConfirm(true); return; }
    setIsBulkDeleting(true);
    try {
      await Promise.all(
        selectedFiles.map((f) =>
          fetch("/api/media/delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: f.path, type: "file" }) })
        )
      );
      if (selectedFiles.some((f) => f.src === value)) onChange(undefined);
      exitSelectMode();
      await fetchTree();
    } finally { setIsBulkDeleting(false); }
  }

  async function handleBulkMove() {
    setIsBulkMoving(true);
    try {
      await Promise.all(
        selectedFiles.map((f) =>
          fetch("/api/media/move", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: f.path, toFolder: bulkMovingTo }) })
        )
      );
      exitSelectMode();
      setBulkMovingTo("");
      await fetchTree();
    } finally { setIsBulkMoving(false); }
  }

  // ── Replace — repoint every reference (across the whole CMS) at newSrc, then delete
  //    the old file. Also updates this field's own bound value directly, in case it was
  //    pointing at the old file, rather than waiting on a content round-trip. ────────────
  async function applyReplace(oldFile: MediaFile, newSrc: string) {
    if (newSrc === oldFile.src) return;
    setIsReplacing(true);
    try {
      const updated = replaceMediaUsage(content, oldFile.src, newSrc);
      updateContent(updated);
      persistContent(updated);
      if (value === oldFile.src) onChange(newSrc);
      await fetch("/api/media/delete", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: oldFile.path, type: "file" }) });
      setPreviewFile(null);
      setShowReplacePicker(false);
      await fetchTree();
    } finally { setIsReplacing(false); }
  }

  async function handleReplaceWithUpload(oldFile: MediaFile, file: File) {
    setIsReplacing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      // Upload into the same folder the original lived in — omitting this defaults the
      // upload route to the imports root, which silently relocated the replacement.
      const folder = oldFile.path.includes("/") ? oldFile.path.split("/").slice(0, -1).join("/") : "";
      if (folder) fd.append("folder", folder);
      const res = await fetch("/api/media/upload", { method: "POST", body: fd });
      const data = await res.json();
      const newSrc = data.uploaded?.[0]?.src;
      if (!newSrc) return;
      await applyReplace(oldFile, newSrc);
    } finally { setIsReplacing(false); }
  }

  // ── Focal point drag ────────────────────────────────────────────────────────
  function posFromEvent(e: React.MouseEvent) {
    const rect = previewRef.current!.getBoundingClientRect();
    const x = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left)  / rect.width)  * 100)));
    const y = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top)   / rect.height) * 100)));
    onPositionChange?.(`${x}% ${y}%`);
  }

  // ── Modal-wide drag & drop ──────────────────────────────────────────────────
  function handleModalDragEnter(e: React.DragEvent) { e.preventDefault(); modalDragCountRef.current++; setModalDragging(true); }
  function handleModalDragLeave(e: React.DragEvent) { e.preventDefault(); if (--modalDragCountRef.current <= 0) { modalDragCountRef.current = 0; setModalDragging(false); } }
  function handleModalDragOver(e: React.DragEvent) { e.preventDefault(); }
  function handleModalDrop(e: React.DragEvent) { e.preventDefault(); modalDragCountRef.current = 0; setModalDragging(false); if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files); }

  // ── Close modal ─────────────────────────────────────────────────────────────
  function closeModal() { setOpen(false); setPreviewFile(null); setSearchQuery(""); setShowOrphansOnly(false); exitSelectMode(); }

  return (
    <div className="flex flex-col mb-4">
      <label style={LS}>{label}</label>

      {/* ── Trigger / preview ──────────────────────────────────────────────── */}
      {value ? (
        <div style={{ maxWidth: 440 }}>
          {/* previewMaxWidth only caps the preview box below (so a small mark like a favicon
              renders near its true on-site size) — the card itself, including the align/zoom
              controls and Change/Remove buttons, always keeps the standard column width so
              those don't get squeezed down to the same tiny size and wrap. */}
          <div style={{ marginBottom: 4 }}>
            {isTall ? (
              <div
                style={{
                  position: "relative",
                  maxHeight: 380,
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  borderRadius: 8,
                  border: "1px solid rgba(237,232,223,0.1)",
                  background: "#0C1117",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={value} alt="" style={{ width: "100%", height: "auto", display: "block" }} />
              </div>
            ) : (
              <div
                ref={previewRef}
                style={{
                  position: "relative",
                  width: previewMaxWidth ?? "100%",
                  aspectRatio: previewRatio,
                  borderRadius: 8,
                  overflow: "hidden",
                  border: "1px solid rgba(237,232,223,0.1)",
                  cursor: onPositionChange ? "crosshair" : "default",
                  userSelect: "none",
                  background: previewBackground,
                }}
                onMouseDown={(e) => { if (!onPositionChange) return; setDragging(true); posFromEvent(e); }}
                onMouseMove={(e) => { if (dragging) posFromEvent(e); }}
                onMouseUp={() => setDragging(false)}
                onMouseLeave={() => setDragging(false)}
              >
                {/* Background-image div: scale transforms around the focal point (cover) or
                    letterboxes the whole image uncropped (contain, e.g. logos) */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage: `url(${value})`,
                    backgroundSize: previewFit,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: position || "50% 50%",
                    transform: `scale(${scale ?? 1})`,
                    transformOrigin: position || "50% 50%",
                    pointerEvents: "none",
                  }}
                />
                {onPositionChange && (
                  <>
                    <div style={{ position: "absolute", left: `${px}%`, top: `${py}%`, transform: "translate(-50%,-50%)", width: 18, height: 18, borderRadius: "50%", border: "2px solid #fff", boxShadow: "0 0 0 1.5px rgba(0,0,0,0.6)", pointerEvents: "none" }} />
                    <div style={{ position: "absolute", bottom: 6, right: 8, fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: "0.06em", color: "rgba(255,255,255,0.45)", pointerEvents: "none" }}>
                      drag · reposition
                    </div>
                  </>
                )}
              </div>
            )}
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8.5, color: "#EDE8DF", letterSpacing: "0.06em", marginTop: 4 }}>
              {isTall ? "tall image · scrolls on the live site, no crop applied" : `${previewRatio.replace("/", ":")} · preview`}
            </div>
          </div>

          {/* Controls row: align + scale + buttons (tall images skip crop controls — there's nothing to crop) */}
          {isTall && (
            <p style={{ margin: "0 0 8px", fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#8C9AA3", lineHeight: 1.5 }}>
              This image is taller than the recommended 1200×1600. It will display at full size and scroll independently on the live site, so nothing gets cropped.
            </p>
          )}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 6 }}>
            {/* Align 3×3 */}
            {onPositionChange && !isTall && (
              <div style={{ flexShrink: 0 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#EDE8DF", letterSpacing: "0.08em", marginBottom: 3 }}>ALIGN</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 22px)", gap: 2 }}>
                  {PRESETS.map((row, ri) =>
                    row.map((preset, ci) => {
                      const active = position === preset;
                      return (
                        <button
                          key={preset}
                          onClick={() => onPositionChange(preset)}
                          title={preset}
                          style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${active ? "#14ADB5" : "rgba(237,232,223,0.12)"}`, background: active ? "rgba(20,173,181,0.15)" : "rgba(237,232,223,0.03)", cursor: "pointer", fontSize: 10, color: active ? "#14ADB5" : "rgba(237,232,223,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}
                        >
                          {PRESET_LABELS[ri][ci]}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Scale slider */}
            {onScaleChange && !isTall && (
              <div style={{ flexShrink: 0, minWidth: 90 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#EDE8DF", letterSpacing: "0.08em", marginBottom: 3 }}>
                  ZOOM · {Math.round((scale ?? 1) * 100)}%
                </div>
                <input
                  type="range"
                  min={1}
                  max={2}
                  step={0.05}
                  value={scale ?? 1}
                  onChange={(e) => onScaleChange(parseFloat(e.target.value))}
                  style={{ width: "100%", accentColor: "#14ADB5", cursor: "pointer" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Mono', monospace", fontSize: 7.5, color: "#EDE8DF", marginTop: 2 }}>
                  <span>1×</span><span>2×</span>
                </div>
              </div>
            )}

            {/* Change / Remove */}
            <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
              <button onClick={() => setOpen(true)} style={{ width: "100%", fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.08em", color: "#EDE8DF", background: "rgba(237,232,223,0.05)", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 6, padding: "6px 10px", cursor: "pointer", textAlign: "left" }}>
                Change image
              </button>
              <button onClick={() => onChange(undefined)} style={{ width: "100%", fontFamily: "'DM Mono', monospace", fontSize: "10px", letterSpacing: "0.08em", color: "#EDE8DF", background: "none", border: "1px solid rgba(237,232,223,0.06)", borderRadius: 6, padding: "6px 10px", cursor: "pointer", textAlign: "left" }}>
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "22px 16px", border: "1px dashed rgba(20,173,181,0.3)", borderRadius: 8, background: "rgba(20,173,181,0.04)", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: "11px", letterSpacing: "0.08em", color: "#14ADB5" }}
        >
          <Image size={14} />
          Select from image library
        </button>
      )}

      {/* ── Library modal ──────────────────────────────────────────────────── */}
      {open && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={closeModal} />

          <div
            style={{ position: "absolute", top: "4%", left: "4%", right: "4%", bottom: "4%", background: "#0F1519", borderRadius: 16, border: "1px solid rgba(237,232,223,0.08)", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,0.8)" }}
            onDragEnter={handleModalDragEnter}
            onDragLeave={handleModalDragLeave}
            onDragOver={handleModalDragOver}
            onDrop={handleModalDrop}
          >

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "16px 20px", borderBottom: "1px solid rgba(237,232,223,0.07)", flexShrink: 0 }}>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 15, fontWeight: 400, color: "#EDE8DF", flexShrink: 0 }}>Select Image</span>
              <div style={{ position: "relative", flex: 1, maxWidth: 320 }}>
                <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#6B7E8A", pointerEvents: "none" }} />
                <input
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) setShowOrphansOnly(false); }}
                  placeholder="Search all files…"
                  style={{ width: "100%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 8, padding: "7px 10px 7px 28px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#EDE8DF", outline: "none" }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.1)")}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: 2, display: "flex" }}>
                    <X size={11} />
                  </button>
                )}
              </div>
              <button onClick={closeModal} style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", display: "flex", flexShrink: 0 }}><X size={16} /></button>
            </div>

            {/* Body: sidebar | grid | info panel */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}>

              {/* Drop overlay */}
              {modalDragging && (
                <div style={{ position: "absolute", inset: 0, zIndex: 5, borderRadius: 8, border: "2px dashed #14ADB5", background: "rgba(20,173,181,0.07)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <div style={{ textAlign: "center" }}>
                    <Upload size={28} style={{ color: "#14ADB5", margin: "0 auto 8px" }} />
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#14ADB5", letterSpacing: "0.08em" }}>
                      Drop to upload into {folderFilter === "all" ? "root" : folderFilter}
                    </p>
                  </div>
                </div>
              )}

              {/* Folder sidebar */}
              <div style={{ width: 190, flexShrink: 0, borderRight: "1px solid rgba(237,232,223,0.07)", overflowY: "auto", padding: "12px 8px" }}>
                <button
                  onClick={() => { setFolderFilter("all"); setPreviewFile(null); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left",
                    padding: "7px 10px", background: folderFilter === "all" ? "rgba(20,173,181,0.12)" : "transparent",
                    border: "none", borderRadius: 6, cursor: "pointer",
                    color: folderFilter === "all" ? "#14ADB5" : "#EDE8DF", marginBottom: 1,
                  }}
                >
                  <FolderOpen size={12} style={{ flexShrink: 0, color: folderFilter === "all" ? "#14ADB5" : "#EDE8DF" }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    All images
                  </span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#EDE8DF", flexShrink: 0 }}>
                    {allImages.length}
                  </span>
                </button>
                <ImageFolderTree
                  nodes={tree}
                  folderFilter={folderFilter}
                  onSelect={(p) => { setFolderFilter(p); setPreviewFile(null); }}
                />
              </div>

              {/* Image grid */}
              <div style={{ flex: 1, overflowY: "auto", padding: 16, minWidth: 0 }}>
                {/* Toolbar: Unused · Select · Reload · Upload — matches the Media Library's own */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                  <button
                    onClick={() => { setShowOrphansOnly((v) => !v); setSearchQuery(""); setPreviewFile(null); }}
                    title={folderFilter !== "all" ? `Files nothing on the site currently references, within "${folderFilter}"` : "Files nothing on the site currently references"}
                    className="hover:opacity-80 transition-opacity"
                    style={{ display: "flex", alignItems: "center", gap: 6, background: showOrphansOnly ? "rgba(192,57,43,0.15)" : "none", border: `1px solid ${showOrphansOnly ? "rgba(192,57,43,0.4)" : "rgba(237,232,223,0.1)"}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: showOrphansOnly ? "#E05252" : "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.04em" }}
                  >
                    <AlertTriangle size={12} /> {showOrphansOnly ? `Unused (${orphanedImages.length})` : "Unused"}
                  </button>
                  <button
                    onClick={() => { if (selectMode) { exitSelectMode(); } else { setSelectMode(true); setPreviewFile(null); } }}
                    className="hover:opacity-80 transition-opacity"
                    style={{ display: "flex", alignItems: "center", gap: 6, background: selectMode ? "rgba(20,173,181,0.15)" : "none", border: `1px solid ${selectMode ? "rgba(20,173,181,0.4)" : "rgba(237,232,223,0.1)"}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: selectMode ? "#14ADB5" : "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.04em" }}
                  >
                    <ListChecks size={12} /> {selectMode ? "Cancel" : "Select"}
                  </button>
                  <button onClick={fetchTree} className="hover:opacity-70 transition-opacity" style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: 4 }}><RefreshCw size={13} /></button>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="hover:opacity-80 transition-opacity" style={{ background: "#14ADB5", border: "none", borderRadius: 8, padding: "7px 14px", cursor: uploading ? "default" : "pointer", color: "#0C1117", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Upload
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => { if (e.target.files) handleUpload(e.target.files); e.target.value = ""; }} />
                </div>

                {selectMode && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 12px", background: "rgba(20,173,181,0.06)", border: "1px solid rgba(20,173,181,0.2)", borderRadius: 8, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#14ADB5", letterSpacing: "0.04em" }}>
                      {selectedPaths.size} selected
                    </span>
                    <button
                      onClick={() => { setSelectedPaths(new Set(images.map((f) => f.path))); setBulkDeleteConfirm(false); }}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: 10.5, letterSpacing: "0.04em" }}
                      className="hover:opacity-70 transition-opacity"
                    >
                      Select all
                    </button>
                    {selectedPaths.size > 0 && (
                      <>
                        <button
                          onClick={() => { setSelectedPaths(new Set()); setBulkDeleteConfirm(false); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: 10.5, letterSpacing: "0.04em" }}
                          className="hover:opacity-70 transition-opacity"
                        >
                          Clear
                        </button>
                        <div style={{ flex: 1 }} />
                        <select
                          value={bulkMovingTo}
                          onChange={(e) => setBulkMovingTo(e.target.value)}
                          style={{ background: "#0C1117", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 6, padding: "5px 8px", fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: "#EDE8DF", outline: "none", cursor: "pointer" }}
                        >
                          {allFolderPaths.map((fp) => (
                            <option key={fp} value={fp} style={{ background: "#0C1117" }}>{fp === "" ? "/ root" : `/${fp}`}</option>
                          ))}
                        </select>
                        <button
                          onClick={handleBulkMove}
                          disabled={isBulkMoving}
                          className="hover:opacity-80 transition-opacity"
                          style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(20,173,181,0.12)", border: "1px solid rgba(20,173,181,0.3)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: "#14ADB5", fontFamily: "'DM Mono', monospace", fontSize: 10.5 }}
                        >
                          {isBulkMoving ? <Loader2 size={11} className="animate-spin" /> : <MoveRight size={11} />} Move
                        </button>
                        <button
                          onClick={handleBulkDelete}
                          disabled={isBulkDeleting}
                          className="hover:opacity-80 transition-opacity"
                          style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: "#C0392B", fontFamily: "'DM Mono', monospace", fontSize: 10.5 }}
                        >
                          {isBulkDeleting ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                          {bulkDeleteConfirm ? `Confirm delete (used ${bulkUsages.length}×)` : "Delete"}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {bulkDeleteConfirm && selectedPaths.size > 0 && (
                  <div style={{ background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.25)", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginBottom: 6 }}>
                      <AlertTriangle size={12} style={{ color: "#C0392B", flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, color: "#EDE8DF", lineHeight: 1.4 }}>
                        {bulkUsages.length} of your selected files are still referenced elsewhere. Click Delete again to confirm.
                      </span>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontFamily: "'DM Sans', sans-serif", fontSize: 10.5, color: "#EDE8DF", lineHeight: 1.6 }}>
                      {bulkUsages.map((u, i) => <li key={i}>{u}</li>)}
                    </ul>
                  </div>
                )}

                {uploadError && (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11.5, color: "#E05252", marginTop: -6, marginBottom: 14, lineHeight: 1.5 }}>
                    {uploadError}
                  </p>
                )}

                {showOrphansOnly && !loading && (
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: "#8C9AA3", marginTop: -6, marginBottom: 12 }}>
                    {orphanedImages.length === 0
                      ? `No unused images${folderFilter !== "all" ? ` in /${folderFilter}` : ""} — everything ${folderFilter !== "all" ? "in this folder is" : "in the library is"} referenced somewhere`
                      : <>{orphanedImages.length} image{orphanedImages.length !== 1 ? "s" : ""} nothing on the site currently references{folderFilter !== "all" && ` in /${folderFilter}`}</>}
                  </p>
                )}
                {!showOrphansOnly && isSearching && !loading && (
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10.5, color: "#8C9AA3", marginTop: -6, marginBottom: 12 }}>
                    {images.length} result{images.length !== 1 ? "s" : ""} for &ldquo;{searchQuery.trim()}&rdquo;
                  </p>
                )}
                {loading ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48, color: "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: 12, gap: 8 }}>
                    <Loader2 size={14} className="animate-spin" /> Loading library…
                  </div>
                ) : images.length === 0 ? (
                  showOrphansOnly || isSearching ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48, color: "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                      {showOrphansOnly ? "No unused images" : "No matching images"}
                    </div>
                  ) : (
                    <div onClick={() => fileInputRef.current?.click()} style={{ border: "1.5px dashed rgba(237,232,223,0.1)", borderRadius: 12, padding: "48px 24px", textAlign: "center", cursor: "pointer" }} className="hover:border-teal-500/30 transition-colors">
                      <FileImage size={24} style={{ color: "#6B7E8A", margin: "0 auto 10px" }} />
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#EDE8DF", letterSpacing: "0.06em", marginBottom: 6 }}>No images here yet</p>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#EDE8DF" }}>Drag & drop or click Upload to add images</p>
                    </div>
                  )
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {images.map((img) => {
                      const isSelected  = value === img.src;
                      const isPreviewed = previewFile?.src === img.src;
                      const isChecked   = selectedPaths.has(img.path);
                      const meta = getMeta(img.src);
                      return (
                        <button
                          key={img.path}
                          onClick={() => {
                            if (selectMode) { toggleSelected(img.path); return; }
                            setPreviewFile(img);
                            setMovingTo(fileFolder(img.path));
                          }}
                          style={{ position: "relative", background: isPreviewed ? "rgba(20,173,181,0.08)" : "rgba(237,232,223,0.02)", border: `1.5px solid ${isChecked || isPreviewed ? "#14ADB5" : isSelected ? "rgba(20,173,181,0.4)" : "rgba(237,232,223,0.07)"}`, borderRadius: 8, overflow: "hidden", cursor: "pointer", padding: 0, transition: "border-color 0.15s ease", textAlign: "left" }}
                        >
                          {selectMode && (
                            <div style={{ position: "absolute", top: 5, left: 5, zIndex: 1, background: "rgba(12,17,23,0.7)", borderRadius: 5, display: "flex", padding: 2 }}>
                              {isChecked ? <CheckSquare size={14} style={{ color: "#14ADB5" }} /> : <Square size={14} style={{ color: "#EDE8DF" }} />}
                            </div>
                          )}
                          <img
                            src={img.src}
                            alt={meta.alt || img.name}
                            style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }}
                            onError={(e) => { (e.currentTarget.parentElement as HTMLElement).style.display = "none"; }}
                          />
                          <div style={{ padding: "4px 6px 5px", background: "#0F1519" }}>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8.5, color: "#EDE8DF", letterSpacing: "0.03em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {meta.displayName || img.name}
                            </div>
                            {(isSearching || showOrphansOnly) && (
                              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8C9AA3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                /{fileFolder(img.path) || "root"}
                              </div>
                            )}
                          </div>
                          {isSelected && !isPreviewed && !selectMode && (
                            <div style={{ position: "absolute", top: 5, right: 5, width: 18, height: 18, borderRadius: "50%", background: "rgba(20,173,181,0.8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Check size={10} style={{ color: "#0C1117" }} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Info panel ──────────────────────────────────────────────── */}
              {previewFile && (
                <div style={{ width: 250, flexShrink: 0, borderLeft: "1px solid rgba(237,232,223,0.07)", overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>

                  {/* Use this image button */}
                  <button
                    onClick={() => { onChange(previewFile.src); closeModal(); window.dispatchEvent(new Event("cms_image_selected")); }}
                    style={{ width: "100%", background: "#14ADB5", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: "#0C1117", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                  >
                    <Check size={13} /> Use this image
                  </button>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={LS}>Image Info</span>
                    <button onClick={() => setPreviewFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF" }}><X size={13} /></button>
                  </div>

                  {/* Preview */}
                  <div style={{ aspectRatio: "16/9", borderRadius: 7, overflow: "hidden", background: "#141D24" }}>
                    <img src={previewFile.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>

                  <MediaInfoPanel
                    file={previewFile}
                    meta={getMeta(previewFile.src)}
                    onMetaChange={(patch) => setMeta(previewFile.src, patch)}
                    folderOptions={folders.map((f) => ({ path: f.path, label: f.path }))}
                    currentFolder={fileFolder(previewFile.path)}
                    movingTo={movingTo}
                    onMovingToChange={setMovingTo}
                    onMove={handleMove}
                    isMoving={isMoving}
                    onDelete={handleDeleteFile}
                    isDeleting={isDeletingFile}
                    usages={findMediaUsage(content, previewFile.src)}
                    onReplaceWithUpload={(file) => handleReplaceWithUpload(previewFile, file)}
                    onReplaceFromLibrary={() => setShowReplacePicker(true)}
                    isReplacing={isReplacing}
                  />

                </div>
              )}
            </div>
          </div>

          {showReplacePicker && previewFile && (
            <MediaLibraryModal
              onSelect={(newSrc) => applyReplace(previewFile, newSrc)}
              onClose={() => setShowReplacePicker(false)}
            />
          )}
        </div>
      )}

      {/* Same-name upload collision */}
      {pendingUpload && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(6,9,12,0.7)" }}>
          <div style={{ background: "#141D24", border: "1px solid rgba(192,57,43,0.3)", borderRadius: 16, padding: 28, maxWidth: 440, width: "100%" }}>
            <div className="flex items-center gap-2 mb-3">
              <Image size={16} style={{ color: "#C0392B" }} />
              <p style={{ fontFamily: "'Poppins', sans-serif", fontSize: 16, color: "#EDE8DF", fontWeight: 400, margin: 0 }}>
                {pendingUpload.names.length === 1 ? "A file with this name already exists" : `${pendingUpload.names.length} files already exist`}
              </p>
            </div>
            <ul style={{ margin: "0 0 12px", paddingLeft: 18, fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EDE8DF", lineHeight: 1.7 }}>
              {pendingUpload.names.map((n) => <li key={n}>{n}</li>)}
            </ul>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12.5, color: "#8C9AA3", lineHeight: 1.6, marginBottom: 20 }}>
              <b style={{ color: "#EDE8DF" }}>Replace</b> removes the old file and uses the new one everywhere it was referenced.{" "}
              <b style={{ color: "#EDE8DF" }}>Keep both</b> uploads yours alongside it under a new name, untouched.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => resolveUploadCollision("replace")}
                className="hover:opacity-80 transition-opacity"
                style={{ background: "#C0392B", border: "none", borderRadius: 8, padding: "9px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#fff", letterSpacing: "0.04em" }}
              >
                Replace
              </button>
              <button
                onClick={() => resolveUploadCollision("keep-both")}
                className="hover:opacity-80 transition-opacity"
                style={{ background: "rgba(20,173,181,0.12)", border: "1px solid rgba(20,173,181,0.3)", borderRadius: 8, padding: "9px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#14ADB5", letterSpacing: "0.04em" }}
              >
                Keep both
              </button>
              <button
                onClick={() => resolveUploadCollision("cancel")}
                className="hover:opacity-80 transition-opacity"
                style={{ background: "transparent", border: "1px solid rgba(237,232,223,0.15)", borderRadius: 8, padding: "9px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EDE8DF", letterSpacing: "0.04em" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
