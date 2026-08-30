"use server";

import { getSession } from "@/lib/auth";
import { getStoredContent, saveStoredContent } from "@/lib/cmsContent";
import { archiveHistoryEntry, getStoredHistory, type StoredHistoryEntry } from "@/lib/cmsHistory";
import { revalidatePath } from "next/cache";

// Auth-gated the same way deleteEnquiryAction/clearEnquiriesAction (app/actions/contact.ts)
// already are — without this check, anyone who found this action's endpoint could overwrite
// live site content directly, bypassing the admin login UI entirely.
export async function saveCmsContentAction(content: unknown): Promise<boolean> {
  if (!(await getSession())) return false;
  try {
    // Archives whatever is actually live in the database right now, not whatever the calling
    // browser last happened to have in memory — correct even if a different device/tab made
    // the last save, unlike the old client-tracked "previous" value this replaced.
    const previous = await getStoredContent();
    if (previous && JSON.stringify(previous) !== JSON.stringify(content)) {
      await archiveHistoryEntry(previous);
    }
    await saveStoredContent(content);
  } catch {
    // Mirrors the old localStorage saveContent()'s quota-error handling — callers (some of
    // them intentionally fire-and-forget) expect a graceful `false`, never a thrown/rejected
    // promise, on write failure.
    return false;
  }
  // Invalidates every statically-generated page under the root layout in one call, so a Save
  // in the admin goes live for real visitors immediately rather than only on the next redeploy.
  revalidatePath("/", "layout");
  return true;
}

// Version history now lives in Postgres (cms_history table) instead of localStorage — see
// lib/cmsHistory.ts. Auth-gated even though the content itself isn't especially sensitive,
// since there's no other reason for this to be reachable by a non-admin.
export async function getHistoryAction(): Promise<StoredHistoryEntry[]> {
  if (!(await getSession())) return [];
  return getStoredHistory();
}
