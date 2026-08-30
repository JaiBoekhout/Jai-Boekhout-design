import fs from "fs";
import path from "path";
import { list, put, del, rename, createFolder, type ListBlobResultBlob } from "@vercel/blob";
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

// Everything new lives in Vercel Blob under this prefix — Vercel's serverless functions have a
// read-only filesystem in production, so `fs.writeFileSync`/`mkdirSync`/`unlinkSync` against
// public/imports only ever worked in local dev, never on the deployed site. The pre-existing
// files already in public/imports (committed to the repo) keep being scanned from disk exactly
// as before; scanBlob() below covers everything uploaded since. GET merges both into one tree,
// and each write operation (upload, move, folder-create, delete) tries the operation that
// actually applies to a given path rather than assuming one backend or the other.
const BLOB_PREFIX = "imports";

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

function sortEntries(items: (MediaFile | MediaFolder)[]): (MediaFile | MediaFolder)[] {
  return items.sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
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

    return sortEntries(result);
  } catch {
    return [];
  }
}

// Vercel Blob has no real folder concept — a folder is just a pathname prefix, optionally with
// an explicit empty placeholder blob (from createFolder(), pathname ending in "/") so it shows
// up even with nothing in it yet. Reconstructs the same nested shape scanDir() produces from
// the flat list `list()` returns.
interface TreeNode {
  type: "folder";
  name: string;
  path: string;
  children: (MediaFile | TreeNode)[];
  childFolders: Map<string, TreeNode>;
}

function toMediaFolder(node: TreeNode): MediaFolder {
  return {
    type: "folder",
    name: node.name,
    path: node.path,
    children: sortEntries(node.children.map((c) => (c.type === "folder" ? toMediaFolder(c) : c))),
  };
}

async function scanBlob(): Promise<(MediaFile | MediaFolder)[]> {
  let blobs: ListBlobResultBlob[];
  try {
    ({ blobs } = await list({ prefix: `${BLOB_PREFIX}/` }));
  } catch {
    // Not configured yet (no BLOB_READ_WRITE_TOKEN, e.g. local dev before setup) — degrade to
    // "no blob-stored files" rather than breaking the whole listing.
    return [];
  }

  const root: TreeNode = { type: "folder", name: "", path: "", children: [], childFolders: new Map() };

  function folderAt(parent: TreeNode, name: string, folderPath: string): TreeNode {
    const existing = parent.childFolders.get(name);
    if (existing) return existing;
    const node: TreeNode = { type: "folder", name, path: folderPath, children: [], childFolders: new Map() };
    parent.childFolders.set(name, node);
    parent.children.push(node);
    return node;
  }

  for (const blob of blobs) {
    const rel = blob.pathname.slice(BLOB_PREFIX.length + 1); // strip "imports/"
    if (!rel) continue;
    const isFolderPlaceholder = rel.endsWith("/");
    const segments = rel.split("/").filter(Boolean);
    if (!segments.length) continue;

    let current = root;
    for (let i = 0; i < segments.length - (isFolderPlaceholder ? 0 : 1); i++) {
      current = folderAt(current, segments[i], segments.slice(0, i + 1).join("/"));
    }
    if (isFolderPlaceholder) continue;

    const fileName = segments[segments.length - 1];
    const ext = path.extname(fileName).toLowerCase();
    if (!MEDIA_EXTS.has(ext)) continue;
    current.children.push({
      type: "file",
      name: fileName,
      path: rel,
      src: blob.url,
      sizeKb: Math.round(blob.size / 1024),
      ext: ext.slice(1),
      mediaType: VIDEO_EXTS.has(ext) ? "video" : "image",
    });
  }

  return sortEntries(root.children.map((c) => (c.type === "folder" ? toMediaFolder(c) : c)));
}

// Combines the local (pre-existing, git-committed) tree with the blob (newly uploaded) tree
// into one — folders present in both are merged by name/path rather than shown twice.
function mergeTrees(a: (MediaFile | MediaFolder)[], b: (MediaFile | MediaFolder)[]): (MediaFile | MediaFolder)[] {
  const folders = new Map<string, MediaFolder>();
  const files: MediaFile[] = [];
  const order: (MediaFile | MediaFolder)[] = [];

  for (const item of [...a, ...b]) {
    if (item.type === "file") {
      files.push(item);
      continue;
    }
    const existing = folders.get(item.name);
    if (existing) {
      existing.children = mergeTrees(existing.children, item.children);
    } else {
      const copy: MediaFolder = { type: "folder", name: item.name, path: item.path, children: item.children };
      folders.set(item.name, copy);
      order.push(copy);
    }
  }
  order.push(...files);
  return sortEntries(order);
}

export async function GET() {
  if (!(await getSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const [localTree, blobTree] = await Promise.all([
    Promise.resolve(scanDir(IMPORTS_DIR)),
    scanBlob(),
  ]);
  return Response.json({ tree: mergeTrees(localTree, blobTree) });
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
  if (folder.includes("..")) {
    return Response.json({ error: "Invalid folder" }, { status: 400 });
  }

  // Existing-name collisions are checked across BOTH backends — a folder can hold a mix of
  // pre-existing local files and newly uploaded blob files, and the uniqueness guarantee needs
  // to hold across all of them, not just whichever one a given upload happens to land in.
  const localDir = path.join(IMPORTS_DIR, folder);
  let localNames: string[] = [];
  try {
    localNames = fs.readdirSync(localDir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
  } catch { /* folder doesn't exist locally (or read-only fs in production) — fine */ }

  const blobPrefix = folder ? `${BLOB_PREFIX}/${folder}/` : `${BLOB_PREFIX}/`;
  let blobNames: string[] = [];
  try {
    const { blobs } = await list({ prefix: blobPrefix });
    blobNames = blobs
      .map((b) => b.pathname.slice(blobPrefix.length))
      .filter((rest) => rest && !rest.includes("/"));
  } catch { /* blob store not configured yet — fine, just means no collisions from that side */ }

  const existingNames = new Set([...localNames, ...blobNames].map((n) => n.toLowerCase()));

  const uploaded: { name: string; path: string; src: string }[] = [];
  const rejected: { name: string; reason: string }[] = [];

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

    let blob;
    try {
      const bytes = await file.arrayBuffer();
      blob = await put(`${blobPrefix}${safeName}`, Buffer.from(bytes), { access: "public", addRandomSuffix: false });
    } catch (e) {
      rejected.push({
        name: file.name,
        reason: process.env.BLOB_READ_WRITE_TOKEN
          ? `upload failed (${String(e)})`
          : "Blob storage isn't set up yet — add BLOB_READ_WRITE_TOKEN to the environment",
      });
      continue;
    }

    const relPath = folder ? `${folder}/${safeName}` : safeName;
    uploaded.push({ name: safeName, path: relPath, src: blob.url });
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

  // Try local first (pre-existing files) — real files outside a writable local dev filesystem
  // simply won't be found here, so this is a no-op fallthrough to blob in production.
  try {
    fs.mkdirSync(toDirFull, { recursive: true });
    fs.renameSync(fromFull, toFull);
    const newRelPath = path.relative(IMPORTS_DIR, toFull).replace(/\\/g, "/");
    return Response.json({ success: true, path: newRelPath, src: `/imports/${newRelPath}` });
  } catch { /* not a local file (or read-only fs) — try blob */ }

  const fromBlobPath = `${BLOB_PREFIX}/${from}`;
  const newRelPath = toFolder ? `${toFolder}/${fileName}` : fileName;
  const toBlobPath = `${BLOB_PREFIX}/${newRelPath}`;
  const result = await rename(fromBlobPath, toBlobPath, { access: "public" });
  return Response.json({ success: true, path: newRelPath, src: result.url });
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

  // Local mkdir always fails on the deployed site's read-only filesystem — harmless; the blob
  // placeholder below is what actually makes the folder show up there.
  try { fs.mkdirSync(fullPath, { recursive: true }); } catch {}
  try { await createFolder(`${BLOB_PREFIX}/${folder}/`, { access: "public" }); } catch {}

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

  const bytes = await file.arrayBuffer();
  // Fixed pathname, overwritten in place — a new upload replaces the previous resume rather
  // than accumulating old versions, since only one is ever linked at a time. allowOverwrite is
  // required for that (put() otherwise throws when the pathname already exists).
  const blob = await put("resume/resume.pdf", Buffer.from(bytes), { access: "public", addRandomSuffix: false, allowOverwrite: true });

  // Cache-busting query param so a re-upload is immediately visible instead of serving a
  // browser- or CDN-cached copy of the old file at the same URL.
  return Response.json({ success: true, src: `${blob.url}?v=${Date.now()}` });
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

    // Local: best-effort. A real permission/read-only failure (as opposed to "not found here,
    // it's blob-only") is worth surfacing rather than silently reporting success on a file nothing
    // actually removed — pre-existing git-committed files can't be deleted on the deployed site's
    // read-only filesystem at all, and pretending otherwise would just have it reappear on refresh.
    let localFailure: unknown = null;
    try {
      if (type === "folder") fs.rmSync(fullPath, { recursive: true, force: true });
      else fs.unlinkSync(fullPath);
    } catch (e) {
      if ((e as NodeJS.ErrnoException)?.code !== "ENOENT") localFailure = e;
    }

    const blobPrefix = `${BLOB_PREFIX}/${itemPath}`;
    let blobDeleted = false;
    try {
      if (type === "folder") {
        const { blobs } = await list({ prefix: `${blobPrefix}/` });
        if (blobs.length) {
          await del(blobs.map((b) => b.pathname));
          blobDeleted = true;
        }
      } else {
        await del(blobPrefix);
        blobDeleted = true;
      }
    } catch { /* nothing at that path in blob storage either — fine if local succeeded */ }

    if (localFailure && !blobDeleted) {
      return Response.json({
        error: "This is one of the site's built-in files and can't be deleted from the live site — remove it from the project repository instead.",
      }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
