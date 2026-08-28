import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";
import { MEDIA_EXTS, maxBytesFor, uniqueFilename } from "@/lib/media";

const IMPORTS_DIR = path.join(process.cwd(), "public", "imports");

function safePath(folder: string): string | null {
  const resolved = path.resolve(IMPORTS_DIR, folder);
  if (!resolved.startsWith(IMPORTS_DIR)) return null;
  return resolved;
}

function formatBytes(bytes: number): string {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
}

export async function POST(request: Request) {
  if (!(await getSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const files = formData.getAll("file") as File[];
    const folder = ((formData.get("folder") as string) || "").replace(/^\/+|\/+$/g, "");

    if (!files.length) {
      return Response.json({ error: "No files provided" }, { status: 400 });
    }

    const targetDir = safePath(folder);
    if (!targetDir) {
      return Response.json({ error: "Invalid folder" }, { status: 400 });
    }

    // Validate every file before writing any of them — the extension whitelist mirrors what
    // the library actually displays (MEDIA_EXTS), and the size cap exists because this writes
    // straight to disk with no other limit in front of it.
    const uploaded: { name: string; path: string; src: string }[] = [];
    const rejected: { name: string; reason: string }[] = [];

    fs.mkdirSync(targetDir, { recursive: true });
    // Never write over an existing file, even one with a matching sanitized name from a
    // different-case original — next/image's own optimizer cache has no invalidation mechanism
    // (see next.config.ts), so a same-path overwrite used to just mean a browser might briefly
    // show a stale image; now it means the old, now-wrong image can keep being served for hours
    // regardless of what's actually on disk. Guaranteeing every upload lands on a URL nothing
    // has cached yet closes that gap entirely, rather than trying to bust a cache Next itself
    // says it can't invalidate.
    const existingNames = new Set(
      fs.readdirSync(targetDir, { withFileTypes: true })
        .filter((e) => e.isFile())
        .map((e) => e.name.toLowerCase())
    );

    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase();
      if (!MEDIA_EXTS.has(ext)) {
        rejected.push({ name: file.name, reason: `"${ext || "no extension"}" isn't a supported media type` });
        continue;
      }
      const limit = maxBytesFor(ext);
      if (file.size > limit) {
        rejected.push({ name: file.name, reason: `too large (${formatBytes(file.size)}) — max is ${formatBytes(limit)}` });
        continue;
      }

      const sanitized = file.name
        .toLowerCase()
        .replace(/[^a-z0-9._-]/g, "-")
        .replace(/-+/g, "-");
      const safeName = uniqueFilename(sanitized, existingNames);
      existingNames.add(safeName);

      const bytes = await file.arrayBuffer();
      fs.writeFileSync(path.join(targetDir, safeName), Buffer.from(bytes));

      const relPath = folder ? `${folder}/${safeName}` : safeName;
      uploaded.push({ name: safeName, path: relPath, src: `/imports/${relPath}` });
    }

    return Response.json({ success: uploaded.length > 0, uploaded, rejected });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
