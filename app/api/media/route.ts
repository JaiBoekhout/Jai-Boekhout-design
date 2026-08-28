import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";
import { MEDIA_EXTS, VIDEO_EXTS } from "@/lib/media";

const IMPORTS_DIR = path.join(process.cwd(), "public", "imports");

export interface MediaFile {
  type: "file";
  name: string;
  path: string;
  src: string;
  sizeKb: number;
  ext: string;
  mediaType: "image" | "video";
}

export interface MediaFolder {
  type: "folder";
  name: string;
  path: string;
  children: (MediaFile | MediaFolder)[];
}

function scanDir(dirPath: string, relPath = ""): (MediaFile | MediaFolder)[] {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const result: (MediaFile | MediaFolder)[] = [];

    for (const entry of entries) {
      if (entry.name.startsWith(".")) continue;
      const fullPath = path.join(dirPath, entry.name);
      const entryRel = relPath ? `${relPath}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        result.push({
          type: "folder",
          name: entry.name,
          path: entryRel,
          children: scanDir(fullPath, entryRel),
        });
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!MEDIA_EXTS.has(ext)) continue;
        let sizeKb = 0;
        try { sizeKb = Math.round(fs.statSync(fullPath).size / 1024); } catch {}
        result.push({
          type: "file",
          name: entry.name,
          path: entryRel,
          src: `/imports/${entryRel}`,
          sizeKb,
          ext: ext.slice(1),
          mediaType: VIDEO_EXTS.has(ext) ? "video" : "image",
        });
      }
    }

    result.sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  } catch {
    return [];
  }
}

export async function GET() {
  if (!(await getSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const tree = scanDir(IMPORTS_DIR);
  return Response.json({ tree });
}
