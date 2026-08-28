// Pure tree/search helpers shared by every "browse the media library" surface — the full
// Media Library page (MediaSection), the in-field picker (ImagePicker), and the reusable
// insert/replace modal (MediaLibraryModal). Keeping them here instead of copy-pasted in each
// component is what keeps the three surfaces from silently drifting apart.

import type { MediaFile, MediaFolder } from "@/app/api/media/route";

export function collectImages(items: (MediaFile | MediaFolder)[]): MediaFile[] {
  const result: MediaFile[] = [];
  for (const item of items) {
    if (item.type === "file" && item.mediaType === "image") result.push(item);
    else if (item.type === "folder") result.push(...collectImages(item.children));
  }
  return result;
}

export function collectFolders(items: (MediaFile | MediaFolder)[], depth = 0): { path: string; label: string }[] {
  const result: { path: string; label: string }[] = [];
  for (const item of items) {
    if (item.type === "folder") {
      result.push({ path: item.path, label: "  ".repeat(depth) + item.name });
      result.push(...collectFolders(item.children, depth + 1));
    }
  }
  return result;
}

export function countImages(node: MediaFile | MediaFolder): number {
  if (node.type === "file") return node.mediaType === "image" ? 1 : 0;
  return node.children.reduce((s, c) => s + countImages(c), 0);
}

export function fileFolder(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

// Filename, full path, or saved display name — searches across every folder at once rather
// than just the one currently selected in the sidebar.
export function matchesSearch(img: MediaFile, query: string, mediaMeta: Record<string, { displayName?: string }>): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const displayName = mediaMeta[img.src]?.displayName ?? "";
  return img.name.toLowerCase().includes(q) || img.path.toLowerCase().includes(q) || displayName.toLowerCase().includes(q);
}
