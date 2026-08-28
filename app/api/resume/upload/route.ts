import fs from "fs";
import path from "path";
import { getSession } from "@/lib/auth";

// Deliberately separate from app/api/media/upload/route.ts and its MEDIA_EXTS whitelist: that
// system (and the Media Library UI built on it) is image/video-only, and adding a PDF into that
// shared scan would need every image-grid/thumbnail consumer to also handle a "document" type.
// The resume is a single file for one field, not a browsable library item, so it gets its own
// small, self-contained upload path and storage folder instead.
const RESUME_DIR = path.join(process.cwd(), "public", "resume");
const MAX_BYTES = 10 * 1024 * 1024; // 10MB — generous for a text-based PDF resume

export async function POST(request: Request) {
  if (!(await getSession())) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    if (path.extname(file.name).toLowerCase() !== ".pdf") {
      return Response.json({ error: "Only PDF files are supported" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: `File too large — max is ${MAX_BYTES / (1024 * 1024)}MB` }, { status: 400 });
    }

    fs.mkdirSync(RESUME_DIR, { recursive: true });
    // Fixed filename — a new upload replaces the previous resume rather than accumulating old
    // versions, since only one is ever linked at a time.
    const bytes = await file.arrayBuffer();
    fs.writeFileSync(path.join(RESUME_DIR, "resume.pdf"), Buffer.from(bytes));

    // Cache-busting query param so a re-upload is immediately visible instead of serving a
    // browser- or CDN-cached copy of the old file at the same URL.
    return Response.json({ success: true, src: `/resume/resume.pdf?v=${Date.now()}` });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
