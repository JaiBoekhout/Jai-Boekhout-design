// Shared between the media read path (app/api/media/route.ts) and the upload path
// (app/api/media/upload/route.ts) so the two can't silently drift apart — the read path
// deciding what's "media" and the write path deciding what's allowed to be written should
// always be the same list.

export const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".avif", ".ico"]);
export const VIDEO_EXTS = new Set([".mp4", ".mov", ".webm", ".ogg"]);
export const MEDIA_EXTS = new Set([...IMAGE_EXTS, ...VIDEO_EXTS]);

// Generous but not unbounded — images occasionally ship as large, uncompressed screenshots;
// video case-study demos are the only thing that legitimately needs to be much bigger.
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20MB
export const MAX_VIDEO_BYTES = 150 * 1024 * 1024; // 150MB

export function maxBytesFor(ext: string): number {
  return VIDEO_EXTS.has(ext) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

// Mirrors the sanitization app/api/media/upload/route.ts applies server-side — used client-side
// to predict the filename a given File will actually land on, so an upload flow can detect a
// same-name collision in the target folder before ever hitting the network. Keep both in sync.
export function sanitizeFilename(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9._-]/g, "-").replace(/-+/g, "-");
}

// "Keep both" support — appends -1, -2, … before the extension until the name doesn't collide
// with anything in `existingNames` (already-sanitized names already present in the folder).
export function uniqueFilename(name: string, existingNames: Set<string>): string {
  if (!existingNames.has(name)) return name;
  const dot = name.lastIndexOf(".");
  const base = dot === -1 ? name : name.slice(0, dot);
  const ext = dot === -1 ? "" : name.slice(dot);
  let n = 1;
  let candidate = `${base}-${n}${ext}`;
  while (existingNames.has(candidate)) {
    n += 1;
    candidate = `${base}-${n}${ext}`;
  }
  return candidate;
}
