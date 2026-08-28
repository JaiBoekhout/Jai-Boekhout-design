"use client";

import { FolderOpen } from "lucide-react";
import type { MediaFile, MediaFolder } from "@/app/api/media/route";
import { countImages } from "@/lib/mediaTree";

// Nested, expand-on-select folder tree — a subfolder only appears once its parent is the
// active filter, matching Media Library's own sidebar exactly (including per-folder image
// counts), so browsing feels identical everywhere an image can be picked from the library.
export function ImageFolderTree({ nodes, folderFilter, onSelect, depth = 0 }: {
  nodes: (MediaFile | MediaFolder)[];
  folderFilter: string;
  onSelect: (path: string) => void;
  depth?: number;
}) {
  const folders = nodes.filter((n): n is MediaFolder => n.type === "folder");
  return (
    <>
      {folders.map((f) => {
        const isOpen = folderFilter === f.path || folderFilter.startsWith(f.path + "/");
        const isActive = folderFilter === f.path;
        return (
          <div key={f.path}>
            <button
              onClick={() => onSelect(f.path)}
              style={{
                display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left",
                paddingLeft: 10 + depth * 14, paddingTop: 7, paddingBottom: 7, paddingRight: 8,
                background: isActive ? "rgba(20,173,181,0.12)" : "transparent",
                border: "none", borderRadius: 6, cursor: "pointer",
                color: isActive ? "#14ADB5" : "#EDE8DF", marginBottom: 1,
              }}
            >
              <FolderOpen size={12} style={{ flexShrink: 0, color: isActive ? "#14ADB5" : "#EDE8DF" }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.name}
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#EDE8DF", flexShrink: 0 }}>
                {countImages(f)}
              </span>
            </button>
            {isOpen && f.children.some((c) => c.type === "folder") && (
              <ImageFolderTree nodes={f.children} folderFilter={folderFilter} onSelect={onSelect} depth={depth + 1} />
            )}
          </div>
        );
      })}
    </>
  );
}
