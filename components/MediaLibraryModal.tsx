"use client";

import { useState, useEffect, useRef } from "react";
import {
  Upload, X, Check, Loader2, Search, FolderOpen,
  RefreshCw, ListChecks, CheckSquare, Square, MoveRight, AlertTriangle, Trash2, FileImage,
} from "lucide-react";
import type { MediaFile, MediaFolder } from "@/app/api/media/route";
import { useContentStore, findMediaUsage, findOrphanedMedia } from "@/store/contentStore";
import { MediaInfoPanel } from "@/components/MediaInfoPanel";
import { ImageFolderTree } from "@/components/ImageFolderTree";
import { collectImages, collectFolders, fileFolder, matchesSearch } from "@/lib/mediaTree";

const LS: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  color: "#14ADB5",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "6px",
};

interface Props {
  onSelect: (src: string, alt: string) => void;
  onClose: () => void;
}

// The reusable "pick an existing image" modal — used for inserting/replacing images in the
// rich text editor, and for the "replace from library" flow off ImagePicker/MediaSection's own
// file panels. Same toolbar (search, unused filter, bulk select, reload, upload) and the same
// shared ImageFolderTree/MediaInfoPanel as the full Media Library page and ImagePicker's own
// in-field modal, so browsing feels identical no matter where an image gets picked from.
export function MediaLibraryModal({ onSelect, onClose }: Props) {
  const { content, updateContent, persistContent } = useContentStore();

  const [tree, setTree]                       = useState<(MediaFile | MediaFolder)[]>([]);
  const [loading, setLoading]                 = useState(false);
  const [uploading, setUploading]             = useState(false);
  const [folderFilter, setFolderFilter]       = useState<string>("all");
  const [searchQuery, setSearchQuery]         = useState("");
  const [showOrphansOnly, setShowOrphansOnly] = useState(false);
  const [selectMode, setSelectMode]           = useState(false);
  const [selectedPaths, setSelectedPaths]     = useState<Set<string>>(new Set());
  const [bulkMovingTo, setBulkMovingTo]       = useState("");
  const [isBulkMoving, setIsBulkMoving]       = useState(false);
  const [isBulkDeleting, setIsBulkDeleting]   = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [modalDragging, setModalDragging]     = useState(false);
  const [previewFile, setPreviewFile]         = useState<MediaFile | null>(null);
  const [movingTo, setMovingTo]               = useState("");
  const [isMoving, setIsMoving]               = useState(false);
  const [isDeletingFile, setIsDeletingFile]   = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalDragCountRef = useRef(0);

  async function fetchTree() {
    setLoading(true);
    try {
      const data = await fetch("/api/media").then((r) => r.json());
      setTree(data.tree ?? []);
    } finally { setLoading(false); }
  }

  useEffect(() => { fetchTree(); }, []);

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

  function getMeta(src: string) { return content.mediaMeta?.[src] ?? {}; }
  async function setMeta(src: string, patch: Partial<{ displayName: string; alt: string; description: string }>) {
    const updated = { ...content.mediaMeta, [src]: { ...getMeta(src), ...patch } };
    updateContent({ mediaMeta: updated });
    await persistContent({ mediaMeta: updated });
  }

  async function handleUpload(files: FileList) {
    if (!files.length) return;
    setUploading(true);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("file", f));
    if (folderFilter !== "all") fd.append("folder", folderFilter);
    try {
      await fetch("/api/media?action=upload", { method: "POST", body: fd }).then((r) => r.json());
      await fetchTree();
    } finally { setUploading(false); }
  }

  function handleModalDragEnter(e: React.DragEvent) { e.preventDefault(); modalDragCountRef.current++; setModalDragging(true); }
  function handleModalDragLeave(e: React.DragEvent) { e.preventDefault(); if (--modalDragCountRef.current <= 0) { modalDragCountRef.current = 0; setModalDragging(false); } }
  function handleModalDragOver(e: React.DragEvent) { e.preventDefault(); }
  function handleModalDrop(e: React.DragEvent) { e.preventDefault(); modalDragCountRef.current = 0; setModalDragging(false); if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files); }

  async function handleMove() {
    if (!previewFile) return;
    setIsMoving(true);
    try {
      const res  = await fetch("/api/media?action=move", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: previewFile.path, toFolder: movingTo }) });
      const data = await res.json();
      if (data.success) { setPreviewFile(null); setMovingTo(""); await fetchTree(); }
    } finally { setIsMoving(false); }
  }

  async function handleDeleteFile() {
    if (!previewFile) return;
    setIsDeletingFile(true);
    try {
      await fetch("/api/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: previewFile.path, type: "file" }) });
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
          fetch("/api/media", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path: f.path, type: "file" }) })
        )
      );
      exitSelectMode();
      await fetchTree();
    } finally { setIsBulkDeleting(false); }
  }

  async function handleBulkMove() {
    setIsBulkMoving(true);
    try {
      await Promise.all(
        selectedFiles.map((f) =>
          fetch("/api/media?action=move", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: f.path, toFolder: bulkMovingTo }) })
        )
      );
      exitSelectMode();
      setBulkMovingTo("");
      await fetchTree();
    } finally { setIsBulkMoving(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={onClose} />

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
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", display: "flex", flexShrink: 0 }}><X size={16} /></button>
        </div>

        {/* Body: sidebar | grid | info panel — stacked on mobile (each capped to a scrollable
            strip so the grid still gets most of the vertical space), side by side at md: up */}
        <div className="flex flex-col md:flex-row" style={{ flex: 1, overflow: "hidden", position: "relative", minHeight: 0 }}>

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
          <div className="w-full md:w-[190px] max-h-36 md:max-h-none border-b md:border-b-0 md:border-r" style={{ flexShrink: 0, borderColor: "rgba(237,232,223,0.07)", overflowY: "auto", padding: "12px 8px" }}>
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
          <div style={{ flex: 1, overflowY: "auto", padding: 16, minWidth: 0, minHeight: 0 }}>
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
                      style={{ position: "relative", background: isPreviewed ? "rgba(20,173,181,0.08)" : "rgba(237,232,223,0.02)", border: `1.5px solid ${isChecked || isPreviewed ? "#14ADB5" : "rgba(237,232,223,0.07)"}`, borderRadius: 8, overflow: "hidden", cursor: "pointer", padding: 0, transition: "border-color 0.15s ease", textAlign: "left" }}
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
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Info panel */}
          {previewFile && (
            <div className="w-full md:w-[250px] max-h-64 md:max-h-none border-t md:border-t-0 md:border-l" style={{ flexShrink: 0, borderColor: "rgba(237,232,223,0.07)", overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>

              <button
                onClick={() => { onSelect(previewFile.src, getMeta(previewFile.src).alt ?? ""); onClose(); }}
                style={{ width: "100%", background: "#14ADB5", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: "#0C1117", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
              >
                <Check size={13} /> Use this image
              </button>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={LS}>Image Info</span>
                <button onClick={() => setPreviewFile(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF" }}><X size={13} /></button>
              </div>

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
              />

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
