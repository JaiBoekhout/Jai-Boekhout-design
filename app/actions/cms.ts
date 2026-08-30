"use server";

import { getSession } from "@/lib/auth";
import { saveStoredContent } from "@/lib/cmsContent";
import { revalidatePath } from "next/cache";

// Auth-gated the same way deleteEnquiryAction/clearEnquiriesAction (app/actions/contact.ts)
// already are — without this check, anyone who found this action's endpoint could overwrite
// live site content directly, bypassing the admin login UI entirely.
export async function saveCmsContentAction(content: unknown): Promise<boolean> {
  if (!(await getSession())) return false;
  try {
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
