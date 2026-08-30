import "server-only";
import { sql } from "@/lib/db";

// Deliberately untyped (unknown, not CMSContent) — this file must not import shape knowledge
// back from store/contentStore.ts, since store/serverContent.ts's getContent() calls into this
// file. A single singleton row (id always 1) holds the entire CMS content tree as one JSONB
// blob; see store/serverContent.ts's getContent() and store/contentStore.ts's deepMerge() for
// how that blob gets merged against DEFAULT_CONTENT and backfilled once it's read back out.
export async function getStoredContent(): Promise<unknown | null> {
  const rows = (await sql`SELECT data FROM cms_content WHERE id = 1`) as { data: unknown }[];
  return rows.length ? rows[0].data : null;
}

export async function saveStoredContent(data: unknown): Promise<void> {
  await sql`
    INSERT INTO cms_content (id, data, updated_at) VALUES (1, ${JSON.stringify(data)}::jsonb, now())
    ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `;
}
