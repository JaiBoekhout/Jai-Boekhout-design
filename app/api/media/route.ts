import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";
import { MEDIA_EXTS, VIDEO_EXTS, maxBytesFor, uniqueFilename } from "@/lib/media";

// Every media/resume admin operation lives in this one route file — GET for listing, POST for
// upload/move/folder-create (dispatched by ?action=), DELETE for removal — rather than each in
// its own route.ts. Vercel counts one serverless function per route regardless of how many HTTP
// methods it exports, and the Hobby plan caps a deployment at 12 total; 6 separate media/resume
// routes alone used to burn half that budget for what's really one feature.

const IMPORTS_DIR = path.join(process.cwd(), "public", "imports");
const RESUME_DIR = path.join(process.cwd(), "public", "resume");
const RESUME_MAX_BYTES = 10 * 1024 * 1024; // 10MB — generous for a text-based PDF resume

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

function safePath(folder: string): string | null {
  const resolved = path.resolve(IMPORTS_DIR, folder);
  if (!resolved.startsWith(IMPORTS_DIR)) return null;
  return resolved;
}

function formatBytes(bytes: number): string {
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10}MB`;
}

async function handleUpload(request: Request): Promise<Response> {
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

  // Validate every file before writing any of them — the extension whitelist mirrors what the
  // library actually displays (MEDIA_EXTS), and the size cap exists because this writes straight
  // to disk with no other limit in front of it.
  const uploaded: { name: string; path: string; src: string }[] = [];
  const rejected: { name: string; reason: string }[] = [];

  fs.mkdirSync(targetDir, { recursive: true });
  // Never write over an existing file, even one with a matching sanitized name from a
  // different-case original — next/image's own optimizer cache has no invalidation mechanism
  // (see next.config.ts), so a same-path overwrite used to just mean a browser might briefly
  // show a stale image; now it means the old, now-wrong image can keep being served for hours
  // regardless of what's actually on disk. Guaranteeing every upload lands on a URL nothing has
  // cached yet closes that gap entirely, rather than trying to bust a cache Next itself says it
  // can't invalidate.
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
}

async function handleMove(request: Request): Promise<Response> {
  const { from, toFolder } = (await request.json()) as { from: string; toFolder: string };

  const fromFull = path.resolve(IMPORTS_DIR, from);
  const fileName = path.basename(fromFull);
  const toDirFull = path.resolve(IMPORTS_DIR, toFolder);
  const toFull = path.join(toDirFull, fileName);

  if (!fromFull.startsWith(IMPORTS_DIR) || !toDirFull.startsWith(IMPORTS_DIR)) {
    return Response.json({ error: "Invalid path" }, { status: 400 });
  }

  if (fromFull === toFull) {
    return Response.json({ error: "Source and destination are the same" }, { status: 400 });
  }

  fs.mkdirSync(toDirFull, { recursive: true });
  fs.renameSync(fromFull, toFull);

  const newRelPath = path.relative(IMPORTS_DIR, toFull).replace(/\\/g, "/");
  return Response.json({ success: true, path: newRelPath, src: `/imports/${newRelPath}` });
}

async function handleFolderCreate(request: Request): Promise<Response> {
  const { folder } = (await request.json()) as { folder: string };

  if (!folder || folder.includes("..") || /[<>:"|?*]/.test(folder)) {
    return Response.json({ error: "Invalid folder name" }, { status: 400 });
  }

  const fullPath = path.resolve(IMPORTS_DIR, folder);
  if (!fullPath.startsWith(IMPORTS_DIR)) {
    return Response.json({ error: "Path traversal not allowed" }, { status: 400 });
  }

  fs.mkdirSync(fullPath, { recursive: true });
  return Response.json({ success: true, path: folder });
}

// Deliberately kept out of the MEDIA_EXTS whitelist and its own directory: the Media Library UI
// this route otherwise serves is image/video-only, and adding a PDF into that shared scan would
// need every image-grid/thumbnail consumer to also handle a "document" type. The resume is a
// single file for one field, not a browsable library item — same route file for the function-
// count budget, but its own small, self-contained handler and storage folder.
async function handleResumeUpload(request: Request): Promise<Response> {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return Response.json({ error: "No file provided" }, { status: 400 });
  }
  if (path.extname(file.name).toLowerCase() !== ".pdf") {
    return Response.json({ error: "Only PDF files are supported" }, { status: 400 });
  }
  if (file.size > RESUME_MAX_BYTES) {
    return Response.json({ error: `File too large — max is ${RESUME_MAX_BYTES / (1024 * 1024)}MB` }, { status: 400 });
  }

  fs.mkdirSync(RESUME_DIR, { recursive: true });
  // Fixed filename — a new upload replaces the previous resume rather than accumulating old
  // versions, since only one is ever linked at a time.
  const bytes = await file.arrayBuffer();
  fs.writeFileSync(path.join(RESUME_DIR, "resume.pdf"), Buffer.from(bytes));

  // Cache-busting query param so a re-upload is immediately visible instead of serving a
  // browser- or CDN-cached copy of the old file at the same URL.
  return Response.json({ success: true, src: `/resume/resume.pdf?v=${Date.now()}` });
}

export async function POST(request: Request) {
  if (!(await getSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const action = new URL(request.url).searchParams.get("action");
  try {
    switch (action) {
      case "move": return await handleMove(request);
      case "folder": return await handleFolderCreate(request);
      case "resume": return await handleResumeUpload(request);
      case "upload": default: return await handleUpload(request);
    }
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await getSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { path: itemPath, type } = (await request.json()) as { path: string; type: "file" | "folder" };

    const fullPath = path.resolve(IMPORTS_DIR, itemPath);

    if (!fullPath.startsWith(IMPORTS_DIR + path.sep) && fullPath !== IMPORTS_DIR) {
      return Response.json({ error: "Invalid path" }, { status: 400 });
    }

    if (type === "folder") {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(fullPath);
    }

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
