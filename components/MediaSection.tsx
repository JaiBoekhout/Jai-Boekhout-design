"use client";

import { useState, useEffect, useRef, useCallback, DragEvent } from "react";
import {
  FolderOpen, FolderPlus, Upload, X, ChevronRight,
  Loader2, RefreshCw, FileImage, Trash2, MoveRight, AlertTriangle, Film,
  Search, CheckSquare, Square, ListChecks,
} from "lucide-react";
import { useContentStore, findMediaUsage, findOrphanedMedia, replaceMediaUsage } from "@/store/contentStore";
import { MediaInfoPanel } from "@/components/MediaInfoPanel";
import { MediaLibraryModal } from "@/components/MediaLibraryModal";
import { sanitizeFilename, uniqueFilename } from "@/lib/media";
import type { MediaFile, MediaFolder } from "@/app/api/media/route";

type TreeNode = MediaFile | MediaFolder;

function MediaThumb({ file, style }: { file: MediaFile; style?: React.CSSProperties }) {
  if (file.mediaType === "video") {
    return (
      <div style={{ position: "relative", width: "100%", height: "100%", background: "#0C1117", ...style }}>
        <video src={file.src} muted playsInline preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Film size={14} style={{ color: "#EDE8DF" }} />
          </div>
        </div>
      </div>
    );
  }
  return <img src={file.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", ...style }} />;
}

// ─── Tree helpers ─────────────────────────────────────────────────────────────

function getFilesInFolder(tree: TreeNode[], folderPath: string): MediaFile[] {
  if (folderPath === "") return tree.filter((n): n is MediaFile => n.type === "file");
  const parts = folderPath.split("/");
  let current: TreeNode[] = tree;
  for (const part of parts) {
    const dir = current.find((n): n is MediaFolder => n.type === "folder" && n.name === part);
    if (!dir) return [];
    current = dir.children;
  }
  return current.filter((n): n is MediaFile => n.type === "file");
}

function getFolders(tree: TreeNode[], folderPath: string): MediaFolder[] {
  if (folderPath === "") return tree.filter((n): n is MediaFolder => n.type === "folder");
  const parts = folderPath.split("/");
  let current: TreeNode[] = tree;
  for (const part of parts) {
    const dir = current.find((n): n is MediaFolder => n.type === "folder" && n.name === part);
    if (!dir) return [];
    current = dir.children;
  }
  return current.filter((n): n is MediaFolder => n.type === "folder");
}

function countFiles(node: TreeNode): number {
  if (node.type === "file") return 1;
  return node.children.reduce((s, c) => s + countFiles(c), 0);
}

function getAllFiles(nodes: TreeNode[]): MediaFile[] {
  const result: MediaFile[] = [];
  for (const n of nodes) {
    if (n.type === "file") result.push(n);
    else result.push(...getAllFiles(n.children));
  }
  return result;
}

function breadcrumbs(folderPath: string) {
  if (!folderPath) return [];
  return folderPath.split("/").map((p, i, arr) => ({
    label: p,
    path: arr.slice(0, i + 1).join("/"),
  }));
}

// Searches every folder (not just the current one) by filename/path, plus any display
// name saved in mediaMeta — the point of search is finding a file without having to
// remember which folder it's filed under.
function searchFiles(tree: TreeNode[], query: string, mediaMeta: Record<string, { displayName?: string }>): MediaFile[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: MediaFile[] = [];
  function walk(nodes: TreeNode[]) {
    for (const n of nodes) {
      if (n.type === "file") {
        const displayName = mediaMeta[n.src]?.displayName ?? "";
        if (n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q) || displayName.toLowerCase().includes(q)) {
          results.push(n);
        }
      } else {
        walk(n.children);
      }
    }
  }
  walk(tree);
  return results;
}

function getAllFolderPaths(nodes: TreeNode[], prefix = ""): string[] {
  const result: string[] = [];
  for (const n of nodes) {
    if (n.type === "folder") {
      const p = prefix ? `${prefix}/${n.name}` : n.name;
      result.push(p);
      result.push(...getAllFolderPaths(n.children, p));
    }
  }
  return result;
}

// ─── Folder tree sidebar ──────────────────────────────────────────────────────

function FolderTree({
  nodes,
  currentFolder,
  onSelect,
  onDelete,
  confirmDelete,
  onConfirm,
  onCancel,
  depth = 0,
}: {
  nodes: TreeNode[];
  currentFolder: string;
  onSelect: (p: string) => void;
  onDelete: (p: string) => void;
  confirmDelete: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  depth?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const folders = nodes.filter((n): n is MediaFolder => n.type === "folder");

  return (
    <>
      {folders.map((f) => {
        const isOpen = currentFolder === f.path || currentFolder.startsWith(f.path + "/");
        const isActive = currentFolder === f.path;
        const isConfirming = confirmDelete === f.path;

        return (
          <div key={f.path}>
            {isConfirming ? (
              <div style={{ paddingLeft: 8 + depth * 14, paddingRight: 8, paddingTop: 6, paddingBottom: 6 }}>
                <div style={{ background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: 7, padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                    <AlertTriangle size={11} style={{ color: "#C0392B", flexShrink: 0 }} />
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#EDE8DF", lineHeight: 1.3 }}>
                      Delete <strong>{f.name}</strong> and all its contents?
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={onConfirm} style={{ flex: 1, background: "#C0392B", border: "none", borderRadius: 5, padding: "5px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#fff" }}>
                      Delete
                    </button>
                    <button onClick={onCancel} style={{ flex: 1, background: "transparent", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 5, padding: "5px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#EDE8DF" }}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{ position: "relative" }}
                onMouseEnter={() => setHovered(f.path)}
                onMouseLeave={() => setHovered(null)}
              >
                <button
                  onClick={() => onSelect(f.path)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left",
                    paddingLeft: 8 + depth * 14, paddingTop: 7, paddingBottom: 7, paddingRight: hovered === f.path ? 28 : 8,
                    background: isActive ? "rgba(20,173,181,0.12)" : "transparent",
                    border: "none", borderRadius: 6, cursor: "pointer",
                    color: isActive ? "#14ADB5" : "#EDE8DF",
                    transition: "background 0.15s ease",
                  }}
                >
                  <FolderOpen size={12} style={{ flexShrink: 0, color: isActive ? "#14ADB5" : "#EDE8DF" }} />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.name}
                  </span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#EDE8DF", flexShrink: 0 }}>
                    {countFiles(f)}
                  </span>
                </button>
                {hovered === f.path && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(f.path); }}
                    title="Delete folder"
                    style={{
                      position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", color: "#EDE8DF",
                      display: "flex", alignItems: "center", padding: 3, borderRadius: 4,
                    }}
                    className="hover:text-[#C0392B] transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            )}

            {isOpen && f.children.some(c => c.type === "folder") && (
              <FolderTree
                nodes={f.children}
                currentFolder={currentFolder}
                onSelect={onSelect}
                onDelete={onDelete}
                confirmDelete={confirmDelete}
                onConfirm={onConfirm}
                onCancel={onCancel}
                depth={depth + 1}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontFamily: "'DM Mono', monospace",
  fontSize: "10px",
  color: "#14ADB5",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: "6px",
};

export function MediaSection() {
  const { content, updateContent, persistContent } = useContentStore();
  const [tree, setTree]                   = useState<TreeNode[]>([]);
  const [loading, setLoading]             = useState(true);
  const [currentFolder, setCurrentFolder] = useState("");
  const [selected, setSelected]           = useState<MediaFile | null>(null);
  const [dragging, setDragging]           = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [uploadMsg, setUploadMsg]         = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParent, setNewFolderParent] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [movingTo, setMovingTo]           = useState("");
  const [isMoving, setIsMoving]           = useState(false);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [searchQuery, setSearchQuery]     = useState("");
  const [showOrphansOnly, setShowOrphansOnly] = useState(false);
  const [isReplacing, setIsReplacing]     = useState(false);
  const [showReplacePicker, setShowReplacePicker] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{ files: File[]; folder: string; names: string[] } | null>(null);
  const [selectMode, setSelectMode]       = useState(false);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [bulkMovingTo, setBulkMovingTo]   = useState("");
  const [isBulkMoving, setIsBulkMoving]   = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCountRef = useRef(0);

  const fetchTree = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/media");
      const data = await res.json();
      setTree(data.tree ?? []);
    } catch { setTree([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  const isSearching       = searchQuery.trim().length > 0;
  // Search always flattens across the whole library — the point is finding something without
  // already knowing where it lives. Orphan mode instead scopes to whatever folder is currently
  // selected (including its subfolders), so "Unused" answers "what in THIS folder is unused"
  // rather than always flattening to the whole site — unless you're at the root, where there's
  // no folder to scope to and it naturally covers everything.
  const orphanScope       = currentFolder ? getAllFiles(tree).filter((f) => f.path.startsWith(currentFolder + "/")) : getAllFiles(tree);
  const orphanedFiles     = showOrphansOnly ? findOrphanedMedia(content, orphanScope) : [];
  const currentFiles      = showOrphansOnly ? orphanedFiles : isSearching ? searchFiles(tree, searchQuery, content.mediaMeta ?? {}) : getFilesInFolder(tree, currentFolder);
  const currentSubfolders = (isSearching || showOrphansOnly) ? [] : getFolders(tree, currentFolder);
  const allFolderPaths    = ["", ...getAllFolderPaths(tree)];
  const folderOptions     = allFolderPaths.filter((p) => p !== "").map((p) => ({ path: p, label: p }));

  // ── Upload ──────────────────────────────────────────────────────────────────

  // Entry point for every upload (picker, drag & drop). Checks the target folder for filename
  // collisions first — a silent overwrite is how a photo used to get permanently lost with zero
  // warning. Clean uploads go straight through; anything colliding pauses for the "same name"
  // confirmation dialog below instead.
  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    if (!arr.length) return;
    const existingNames = new Set(getFilesInFolder(tree, currentFolder).map((f) => f.name));
    const collisionNames = arr
      .map((f) => sanitizeFilename(f.name))
      .filter((name) => existingNames.has(name));
    if (collisionNames.length > 0) {
      setPendingUpload({ files: arr, folder: currentFolder, names: collisionNames });
      return;
    }
    await performUpload(arr, currentFolder);
  }

  async function performUpload(arr: File[], folder: string) {
    setUploading(true);
    setUploadMsg(`Uploading ${arr.length} file${arr.length > 1 ? "s" : ""}…`);
    const fd = new FormData();
    arr.forEach(f => fd.append("file", f));
    fd.append("folder", folder);
    try {
      const res  = await fetch("/api/media/upload", { method: "POST", body: fd });
      const data = await res.json();
      const rejectedCount: number = data.rejected?.length ?? 0;
      if (data.uploaded?.length) await fetchTree();

      if (rejectedCount > 0) {
        const firstReason = data.rejected[0].reason;
        setUploadMsg(
          data.uploaded?.length
            ? `✓ ${data.uploaded.length} uploaded, ${rejectedCount} skipped (${firstReason}${rejectedCount > 1 ? ", …" : ""})`
            : `Nothing uploaded — ${firstReason}`
        );
      } else if (data.success) {
        setUploadMsg(`✓ ${data.uploaded.length} uploaded`);
      } else {
        setUploadMsg("Upload failed");
      }
    } catch { setUploadMsg("Upload failed"); }
    finally { setUploading(false); setTimeout(() => setUploadMsg(""), 4000); }
  }

  // "Replace" keeps every file's own (sanitized) name — landing on the exact same path as the
  // file it collides with, so the upload overwrites it in place and every existing reference to
  // that path (cover images, rich text embeds, anywhere) picks up the new content automatically,
  // with no content rewrite needed. "Keep both" renames only the colliding files to be unique
  // (untouched files in the same batch upload under their own name as normal).
  async function resolveUploadCollision(choice: "replace" | "keep-both" | "cancel") {
    if (!pendingUpload) return;
    const { files, folder } = pendingUpload;
    setPendingUpload(null);
    if (choice === "cancel") return;

    if (choice === "keep-both") {
      const existingNames = new Set(getFilesInFolder(tree, folder).map((f) => f.name));
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

  function handleDragEnter(e: DragEvent) { e.preventDefault(); dragCountRef.current++; setDragging(true); }
  function handleDragLeave(e: DragEvent) { e.preventDefault(); if (--dragCountRef.current <= 0) { dragCountRef.current = 0; setDragging(false); } }
  function handleDragOver(e: DragEvent)  { e.preventDefault(); }
  function handleDrop(e: DragEvent)      { e.preventDefault(); dragCountRef.current = 0; setDragging(false); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); }

  // ── New folder ──────────────────────────────────────────────────────────────

  async function handleCreateFolder() {
    const name = newFolderName.trim().replace(/[^a-zA-Z0-9_-]/g, "-");
    if (!name) return;
    setCreatingFolder(true);
    const fp = newFolderParent ? `${newFolderParent}/${name}` : name;
    try {
      await fetch("/api/media/folder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ folder: fp }) });
      await fetchTree();
      setCurrentFolder(fp);
    } finally { setCreatingFolder(false); setNewFolderName(""); setShowNewFolder(false); }
  }

  // ── Delete folder ───────────────────────────────────────────────────────────

  async function handleDeleteFolder(folderPath: string) {
    try {
      await fetch("/api/media/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: folderPath, type: "folder" }),
      });
      if (currentFolder === folderPath || currentFolder.startsWith(folderPath + "/")) {
        setCurrentFolder("");
      }
      await fetchTree();
    } finally { setConfirmDelete(null); }
  }

  // ── Delete file ─────────────────────────────────────────────────────────────

  async function handleDeleteFile(file: MediaFile) {
    setIsDeletingFile(true);
    try {
      await fetch("/api/media/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: file.path, type: "file" }),
      });
      setSelected(null);
      await fetchTree();
    } finally { setIsDeletingFile(false); }
  }

  // ── Replace file — repoint every reference at newSrc, then delete the old file ──────────

  async function applyReplace(oldFile: MediaFile, newSrc: string) {
    if (newSrc === oldFile.src) return;
    setIsReplacing(true);
    try {
      const updated = replaceMediaUsage(content, oldFile.src, newSrc);
      updateContent(updated);
      persistContent(updated);
      await fetch("/api/media/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: oldFile.path, type: "file" }),
      });
      setSelected(null);
      setShowReplacePicker(false);
      setUploadMsg("✓ Replaced everywhere and removed the old file");
      setTimeout(() => setUploadMsg(""), 4000);
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
      if (!newSrc) {
        setUploadMsg(data.rejected?.[0]?.reason ? `Replacement not uploaded — ${data.rejected[0].reason}` : "Replacement upload failed");
        setTimeout(() => setUploadMsg(""), 4000);
        return;
      }
      await applyReplace(oldFile, newSrc);
    } finally { setIsReplacing(false); }
  }

  // ── Move file ───────────────────────────────────────────────────────────────

  async function handleMove(file: MediaFile) {
    if (movingTo === "" && currentFolder === "") return;
    const targetFolder = movingTo;
    setIsMoving(true);
    try {
      const res  = await fetch("/api/media/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: file.path, toFolder: targetFolder }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.src && data.src !== file.src) {
          const updated = replaceMediaUsage(content, file.src, data.src);
          updateContent(updated);
          persistContent(updated);
        }
        setSelected(null);
        setMovingTo("");
        await fetchTree();
      }
    } finally { setIsMoving(false); }
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

  const selectedFiles = currentFiles.filter((f) => selectedPaths.has(f.path));
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
      exitSelectMode();
      await fetchTree();
    } finally { setIsBulkDeleting(false); }
  }

  async function handleBulkMove() {
    setIsBulkMoving(true);
    try {
      const results = await Promise.all(
        selectedFiles.map(async (f) => {
          const res = await fetch("/api/media/move", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: f.path, toFolder: bulkMovingTo }) });
          const data = await res.json();
          return { file: f, data };
        })
      );
      let updated = content;
      for (const { file, data } of results) {
        if (data.success && data.src && data.src !== file.src) updated = replaceMediaUsage(updated, file.src, data.src);
      }
      if (updated !== content) {
        updateContent(updated);
        persistContent(updated);
      }
      exitSelectMode();
      setBulkMovingTo("");
      await fetchTree();
    } finally { setIsBulkMoving(false); }
  }

  // ── Metadata ────────────────────────────────────────────────────────────────

  function getMeta(src: string) { return content.mediaMeta?.[src] ?? {}; }
  function setMeta(src: string, patch: Partial<{ displayName: string; alt: string; description: string }>) {
    const updated = { ...content.mediaMeta, [src]: { ...getMeta(src), ...patch } };
    updateContent({ mediaMeta: updated });
    persistContent({ mediaMeta: updated });
  }

  const crumbs = breadcrumbs(currentFolder);

  return (
    <div
      className="flex h-full relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Same-name upload collision */}
      {pendingUpload && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(6,9,12,0.7)" }}>
          <div style={{ background: "#141D24", border: "1px solid rgba(192,57,43,0.3)", borderRadius: 16, padding: 28, maxWidth: 440, width: "100%" }}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} style={{ color: "#C0392B" }} />
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

      {/* Drop overlay */}
      {dragging && (
        <div style={{ position: "absolute", inset: 0, zIndex: 20, borderRadius: 14, border: "2px dashed #14ADB5", background: "rgba(20,173,181,0.07)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          <div style={{ textAlign: "center" }}>
            <Upload size={28} style={{ color: "#14ADB5", margin: "0 auto 8px" }} />
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "#14ADB5", letterSpacing: "0.08em" }}>
              Drop to upload into {currentFolder || "root"}
            </p>
          </div>
        </div>
      )}

      {/* ── Folder sidebar ─────────────────────────────────────────────────── */}
      <div style={{ width: 200, flexShrink: 0, borderRight: "1px solid rgba(237,232,223,0.06)", paddingRight: 12, marginRight: 20, display: "flex", flexDirection: "column" }}>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9.5, letterSpacing: "0.14em", color: "#EDE8DF", textTransform: "uppercase", marginBottom: 10 }}>Folders</p>

        {/* Root */}
        <button
          onClick={() => setCurrentFolder("")}
          style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", padding: "7px 8px", background: currentFolder === "" ? "rgba(20,173,181,0.12)" : "transparent", border: "none", borderRadius: 6, cursor: "pointer", color: currentFolder === "" ? "#14ADB5" : "#EDE8DF" }}
          className="hover:text-[#EDE8DF] transition-colors"
        >
          <FolderOpen size={12} style={{ color: currentFolder === "" ? "#14ADB5" : "#EDE8DF" }} />
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, flex: 1 }}>All files</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#EDE8DF" }}>
            {tree.filter(n => n.type === "file").length}
          </span>
        </button>

        <FolderTree
          nodes={tree}
          currentFolder={currentFolder}
          onSelect={(p) => { setCurrentFolder(p); setShowOrphansOnly(false); }}
          onDelete={(p) => setConfirmDelete(p)}
          confirmDelete={confirmDelete}
          onConfirm={() => confirmDelete && handleDeleteFolder(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />

        {/* New folder */}
        {showNewFolder ? (
          <div style={{ marginTop: 10, background: "rgba(20,173,181,0.05)", border: "1px solid rgba(20,173,181,0.15)", borderRadius: 8, padding: "10px 10px 8px" }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: "0.12em", color: "#14ADB5", textTransform: "uppercase", marginBottom: 8 }}>New folder</p>

            {/* Parent picker */}
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#EDE8DF", marginBottom: 4, letterSpacing: "0.06em" }}>Location</p>
            <select
              value={newFolderParent}
              onChange={e => setNewFolderParent(e.target.value)}
              style={{ width: "100%", background: "#0C1117", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 6, padding: "6px 8px", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#EDE8DF", outline: "none", cursor: "pointer", marginBottom: 8 }}
            >
              <option value="" style={{ background: "#0C1117" }}>/ root</option>
              {getAllFolderPaths(tree).map(fp => (
                <option key={fp} value={fp} style={{ background: "#0C1117" }}>/{fp}</option>
              ))}
            </select>

            {/* Name input */}
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#EDE8DF", marginBottom: 4, letterSpacing: "0.06em" }}>Name</p>
            <input
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreateFolder(); if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); } }}
              placeholder="folder-name"
              style={{ width: "100%", background: "rgba(237,232,223,0.04)", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 6, padding: "6px 8px", fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#EDE8DF", outline: "none", marginBottom: 8 }}
              onFocus={e => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
              onBlur={e => (e.target.style.borderColor = "rgba(237,232,223,0.1)")}
            />

            {/* Preview path */}
            {newFolderName.trim() && (
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#EDE8DF", marginBottom: 8, lineHeight: 1.4 }}>
                /{newFolderParent ? `${newFolderParent}/` : ""}{newFolderName.trim().replace(/[^a-zA-Z0-9_-]/g, "-")}
              </p>
            )}

            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()} style={{ flex: 1, background: "#14ADB5", border: "none", borderRadius: 5, padding: "6px 0", cursor: "pointer", fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#0C1117", opacity: !newFolderName.trim() ? 0.4 : 1 }}>
                {creatingFolder ? "…" : "Create"}
              </button>
              <button onClick={() => { setShowNewFolder(false); setNewFolderName(""); }} style={{ background: "transparent", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 5, padding: "6px 8px", cursor: "pointer", color: "#EDE8DF" }}>
                <X size={11} />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { setNewFolderParent(currentFolder); setShowNewFolder(true); }}
            className="flex items-center gap-1.5 hover:text-[#EDE8DF] transition-colors mt-3"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: "0.06em", padding: "4px 8px" }}
          >
            <FolderPlus size={11} /> New folder
          </button>
        )}
      </div>

      {/* ── Main area ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
            <button onClick={() => { setCurrentFolder(""); setShowOrphansOnly(false); }} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: currentFolder ? "#EDE8DF" : "#14ADB5", background: "none", border: "none", cursor: "pointer", padding: 0 }} className="hover:text-[#EDE8DF] transition-colors">imports</button>
            {crumbs.map((c, i) => (
              <span key={c.path} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <ChevronRight size={10} style={{ color: "#EDE8DF" }} />
                <button onClick={() => { setCurrentFolder(c.path); setShowOrphansOnly(false); }} style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: i === crumbs.length - 1 ? "#14ADB5" : "#EDE8DF", background: "none", border: "none", cursor: "pointer", padding: 0 }} className="hover:text-[#EDE8DF] transition-colors">{c.label}</button>
              </span>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {uploadMsg && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: uploadMsg.startsWith("✓") ? "#14ADB5" : "#EDE8DF" }}>{uploadMsg}</span>}
            <div style={{ position: "relative" }}>
              <Search size={12} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "#6B7E8A", pointerEvents: "none" }} />
              <input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value) setShowOrphansOnly(false); }}
                placeholder="Search all files…"
                style={{ width: 170, background: "#0C1117", border: "1px solid rgba(237,232,223,0.1)", borderRadius: 8, padding: "7px 10px 7px 28px", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#EDE8DF", outline: "none" }}
                onFocus={(e) => (e.target.style.borderColor = "rgba(20,173,181,0.4)")}
                onBlur={(e) => (e.target.style.borderColor = "rgba(237,232,223,0.1)")}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: 2, display: "flex" }}>
                  <X size={11} />
                </button>
              )}
            </div>
            <button
              onClick={() => { setShowOrphansOnly((v) => !v); setSearchQuery(""); setSelected(null); }}
              title={currentFolder ? `Files nothing on the site currently references, within "${currentFolder}"` : "Files nothing on the site currently references"}
              className="hover:opacity-80 transition-opacity"
              style={{ display: "flex", alignItems: "center", gap: 6, background: showOrphansOnly ? "rgba(192,57,43,0.15)" : "none", border: `1px solid ${showOrphansOnly ? "rgba(192,57,43,0.4)" : "rgba(237,232,223,0.1)"}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: showOrphansOnly ? "#E05252" : "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.04em" }}
            >
              <AlertTriangle size={12} /> {showOrphansOnly ? `Unused (${orphanedFiles.length})` : "Unused"}
            </button>
            <button
              onClick={() => { if (selectMode) { exitSelectMode(); } else { setSelectMode(true); setSelected(null); } }}
              className="hover:opacity-80 transition-opacity"
              style={{ display: "flex", alignItems: "center", gap: 6, background: selectMode ? "rgba(20,173,181,0.15)" : "none", border: `1px solid ${selectMode ? "rgba(20,173,181,0.4)" : "rgba(237,232,223,0.1)"}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", color: selectMode ? "#14ADB5" : "#EDE8DF", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.04em" }}
            >
              <ListChecks size={12} /> {selectMode ? "Cancel" : "Select"}
            </button>
            <button onClick={fetchTree} className="hover:opacity-70 transition-opacity" style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF", padding: 4 }}><RefreshCw size={13} /></button>
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="hover:opacity-80 transition-opacity" style={{ background: "#14ADB5", border: "none", borderRadius: 8, padding: "7px 14px", cursor: uploading ? "default" : "pointer", color: "#0C1117", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 6 }}>
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Upload
            </button>
            <input ref={fileInputRef} type="file" multiple accept="image/*,.gif,.svg,video/*,.mp4,.mov,.webm,.ogg" style={{ display: "none" }} onChange={e => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ""; }} />
          </div>
        </div>

        {selectMode && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 12px", background: "rgba(20,173,181,0.06)", border: "1px solid rgba(20,173,181,0.2)", borderRadius: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#14ADB5", letterSpacing: "0.04em" }}>
              {selectedPaths.size} selected
            </span>
            <button
              onClick={() => { setSelectedPaths(new Set(currentFiles.map((f) => f.path))); setBulkDeleteConfirm(false); }}
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

        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9.5, color: "#EDE8DF", letterSpacing: "0.08em", marginBottom: 14 }}>
          {showOrphansOnly ? (
            orphanedFiles.length === 0
              ? `No unused files${currentFolder ? ` in /${currentFolder}` : ""} — everything ${currentFolder ? "in this folder is" : "in the library is"} referenced somewhere`
              : <>{orphanedFiles.length} file{orphanedFiles.length !== 1 ? "s" : ""} nothing on the site currently references{currentFolder && ` in /${currentFolder}`}</>
          ) : isSearching ? (
            <>{currentFiles.length} result{currentFiles.length !== 1 ? "s" : ""} for &ldquo;{searchQuery.trim()}&rdquo;</>
          ) : (
            <>
              {currentFiles.length} file{currentFiles.length !== 1 ? "s" : ""}
              {currentSubfolders.length > 0 && ` · ${currentSubfolders.length} folder${currentSubfolders.length > 1 ? "s" : ""}`}
              {currentFolder && ` in /${currentFolder}`}
            </>
          )}
        </p>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, gap: 10 }}>
            <Loader2 size={18} style={{ color: "#14ADB5" }} className="animate-spin" />
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#EDE8DF" }}>Scanning media library…</span>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 16, flex: 1, minHeight: 0 }}>

            {/* Image grid */}
            <div style={{ flex: 1, minWidth: 0, overflowY: "auto" }}>
              {currentSubfolders.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  {currentSubfolders.map(f => (
                    <button key={f.path} onClick={() => setCurrentFolder(f.path)} className="hover:border-teal-500/40 hover:text-[#EDE8DF] transition-all" style={{ display: "flex", alignItems: "center", gap: 6, background: "#141D24", border: "1px solid rgba(237,232,223,0.08)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#EDE8DF" }}>
                      <FolderOpen size={12} style={{ color: "#EDE8DF" }} />
                      {f.name}
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#EDE8DF" }}>{countFiles(f)}</span>
                    </button>
                  ))}
                </div>
              )}

              {currentFiles.length === 0 ? (
                <div onClick={() => fileInputRef.current?.click()} style={{ border: "1.5px dashed rgba(237,232,223,0.1)", borderRadius: 12, padding: "48px 24px", textAlign: "center", cursor: "pointer" }} className="hover:border-teal-500/30 transition-colors">
                  <FileImage size={24} style={{ color: "#6B7E8A", margin: "0 auto 10px" }} />
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "#EDE8DF", letterSpacing: "0.06em", marginBottom: 6 }}>No images here yet</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#EDE8DF" }}>Drag & drop or click Upload to add images</p>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                  {currentFiles.map(file => {
                    const meta = getMeta(file.src);
                    const isSelected = selected?.src === file.src;
                    const isChecked = selectedPaths.has(file.path);
                    const fileFolder = file.path.split("/").slice(0, -1).join("/");
                    return (
                      <div
                        key={file.path}
                        onClick={() => {
                          if (selectMode) { toggleSelected(file.path); return; }
                          setSelected(isSelected ? null : file);
                          setMovingTo(isSearching ? fileFolder : currentFolder);
                        }}
                        style={{ position: "relative", borderRadius: 10, overflow: "hidden", cursor: "pointer", background: "#141D24", border: isChecked ? "1.5px solid #14ADB5" : isSelected ? "1.5px solid #14ADB5" : "1px solid rgba(237,232,223,0.06)", transition: "border-color 0.2s ease" }}
                        className="hover:border-[rgba(20,173,181,0.4)]"
                      >
                        {selectMode && (
                          <div style={{ position: "absolute", top: 6, left: 6, zIndex: 1, background: "rgba(12,17,23,0.7)", borderRadius: 5, display: "flex", padding: 2 }}>
                            {isChecked ? <CheckSquare size={16} style={{ color: "#14ADB5" }} /> : <Square size={16} style={{ color: "#EDE8DF" }} />}
                          </div>
                        )}
                        <div style={{ aspectRatio: "16/9", background: "#0C1117", overflow: "hidden" }}>
                          <MediaThumb file={file} />
                        </div>
                        <div style={{ padding: "8px 10px" }}>
                          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#EDE8DF", marginBottom: 2, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {meta.displayName || file.name}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8.5, color: "#EDE8DF", letterSpacing: "0.04em", textTransform: "uppercase" }}>{file.ext}</span>
                            {file.sizeKb > 0 && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8.5, color: "#EDE8DF" }}>{file.sizeKb}KB</span>}
                            {meta.alt && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#14ADB5", background: "rgba(20,173,181,0.08)", borderRadius: 4, padding: "1px 5px" }}>ALT</span>}
                            {isSearching && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#8C9AA3" }}>/{fileFolder || "root"}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Metadata / actions panel ───────────────────────────────── */}
            {selected && (
              <div style={{ width: 240, flexShrink: 0, background: "#0C1117", border: "1px solid rgba(237,232,223,0.06)", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", gap: 14, alignSelf: "flex-start", position: "sticky", top: 0 }}>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={labelStyle}>Image Info</span>
                  <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#EDE8DF" }}><X size={13} /></button>
                </div>

                {/* Preview */}
                <div style={{ aspectRatio: "16/9", borderRadius: 8, overflow: "hidden", background: "#141D24" }}>
                  {selected.mediaType === "video"
                    ? <video src={selected.src} controls muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    : <img src={selected.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  }
                </div>

                <MediaInfoPanel
                  file={selected}
                  meta={getMeta(selected.src)}
                  onMetaChange={(patch) => setMeta(selected.src, patch)}
                  folderOptions={folderOptions}
                  currentFolder={selected.path.split("/").slice(0, -1).join("/")}
                  movingTo={movingTo}
                  onMovingToChange={setMovingTo}
                  onMove={() => handleMove(selected)}
                  isMoving={isMoving}
                  onDelete={() => handleDeleteFile(selected)}
                  isDeleting={isDeletingFile}
                  usages={findMediaUsage(content, selected.src)}
                  onReplaceWithUpload={(file) => handleReplaceWithUpload(selected, file)}
                  onReplaceFromLibrary={() => setShowReplacePicker(true)}
                  isReplacing={isReplacing}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {showReplacePicker && selected && (
        <MediaLibraryModal
          onSelect={(newSrc) => applyReplace(selected, newSrc)}
          onClose={() => setShowReplacePicker(false)}
        />
      )}
    </div>
  );
}
