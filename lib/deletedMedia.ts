import { sql } from "@/lib/db";

// Vercel's serverless functions have a read-only filesystem, so a pre-existing file committed
// under public/imports/ can never actually be unlinked in production — fs.unlinkSync there always
// fails with EACCES/EROFS. Deleting such a file's Blob copy (if it has one) still leaves the
// identical local file sitting on disk, and scanDir() in app/api/media/route.ts will keep
// rediscovering it on every request, making a "successfully deleted" file reappear in the Media
// Library on refresh. This table is the only way to make a delete stick for those files: once a
// path is recorded here, the GET listing permanently excludes it regardless of what's still on
// local disk — the underlying static file remains (harmless, orphaned, unreferenced dead weight),
// but the CMS treats it as gone for good, which is what "delete" actually needs to mean here.
export interface DeletedPath {
  path: string;
  isFolder: boolean;
}

export async function getDeletedPaths(): Promise<DeletedPath[]> {
  const rows = (await sql`SELECT path, is_folder FROM deleted_media_paths`) as { path: string; is_folder: boolean }[];
  return rows.map((r) => ({ path: r.path, isFolder: r.is_folder }));
}

export async function markPathDeleted(path: string, isFolder: boolean): Promise<void> {
  await sql`
    INSERT INTO deleted_media_paths (path, is_folder)
    VALUES (${path}, ${isFolder})
    ON CONFLICT (path) DO NOTHING
  `;
}

// A path is suppressed if it was itself explicitly deleted, or if it lives inside a folder that
// was explicitly deleted (folder deletes only record the folder's own path, not every file under
// it — matching every file/subfolder against that one prefix covers the whole subtree).
export function isPathDeleted(relPath: string, deleted: DeletedPath[]): boolean {
  return deleted.some((d) => d.path === relPath || (d.isFolder && relPath.startsWith(`${d.path}/`)));
}
