import "server-only";
import { sql } from "@/lib/db";

// Deliberately untyped content (unknown, not CMSContent) — same reasoning as lib/cmsContent.ts:
// this file must not import shape knowledge back from store/contentStore.ts.
export interface StoredHistoryEntry {
  id: string;
  timestamp: string;
  content: unknown;
}

const MAX_HISTORY_ENTRIES = 20;

export async function getStoredHistory(): Promise<StoredHistoryEntry[]> {
  const rows = (await sql`
    SELECT id, content, created_at FROM cms_history ORDER BY created_at DESC LIMIT ${MAX_HISTORY_ENTRIES}
  `) as { id: number; content: unknown; created_at: string }[];
  return rows.map((r) => ({ id: String(r.id), timestamp: r.created_at, content: r.content }));
}

// Called from saveCmsContentAction with whatever was live immediately before that save
// overwrites it — trims to the most recent MAX_HISTORY_ENTRIES on every insert so the table
// never grows unbounded (mirrors the old localStorage version's .slice(0, 20)).
export async function archiveHistoryEntry(content: unknown): Promise<void> {
  await sql`INSERT INTO cms_history (content) VALUES (${JSON.stringify(content)}::jsonb)`;
  await sql`
    DELETE FROM cms_history
    WHERE id NOT IN (SELECT id FROM cms_history ORDER BY created_at DESC LIMIT ${MAX_HISTORY_ENTRIES})
  `;
}
