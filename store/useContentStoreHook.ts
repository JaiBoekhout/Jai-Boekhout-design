"use client";

import { useState, useEffect } from "react";
import { DEFAULT_CONTENT, deepMerge, archiveHistoryEntry } from "@/store/contentStore";
import type { CMSContent } from "@/store/contentStore";
import { saveCmsContentAction } from "@/app/actions/cms";
import { useInitialContent } from "@/store/ContentProvider";

// Split out of contentStore.ts: this is the one piece of that module that uses React hooks, so
// it needs its own "use client" boundary — contentStore.ts itself stays plain/server-safe (its
// data functions are called directly from Server Components), and re-exports this hook so every
// existing `import { useContentStore } from "@/store/contentStore"` keeps working unchanged.
//
// getContent()/Postgres can't be reached directly from a Client Component (no DB access in the
// browser, and lib/cmsContent.ts is marked "server-only"), so this fetches from
// app/api/content/route.ts instead, and saves via the saveCmsContentAction server action rather
// than a synchronous localStorage write.
//
// Known tradeoff, not a bug: this hook has no cross-tab coordination (no storage event
// listener, no lock). Two browser tabs both holding the CMS open each keep their own
// in-memory draft, and whichever calls persistContent() last silently overwrites the other's
// save with no warning or merge. Acceptable for how this is actually used today — a single
// admin, effectively one active session at a time — so this is intentionally left as-is rather
// than adding real conflict detection. Revisit if that usage pattern ever changes.
async function fetchContent(): Promise<CMSContent> {
  const res = await fetch("/api/content");
  return res.json();
}

export function useContentStore() {
  // Seeded by the root layout's server-side getContent() call (see store/ContentProvider.tsx)
  // — real, current content on the very first render, not the DEFAULT_CONTENT placeholder.
  // Falls back to DEFAULT_CONTENT only if somehow rendered outside that provider.
  const initialContent = useInitialContent();
  const [content, setContentState] = useState<CMSContent>(initialContent ?? DEFAULT_CONTENT);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(!initialContent);

  useEffect(() => {
    let cancelled = false;
    // Only re-fetch on mount when the provider didn't already give us real content — avoids a
    // redundant round trip (and the wrong-then-right flash it used to cause) on every page load.
    if (!initialContent) {
      fetchContent().then((c) => {
        if (cancelled) return;
        setContentState(c);
        setIsLoading(false);
      });
    }
    const handler = () => {
      fetchContent().then((c) => {
        if (cancelled) return;
        setContentState(c);
        setIsDirty(false);
      });
    };
    window.addEventListener("cms_content_updated", handler);
    return () => {
      cancelled = true;
      window.removeEventListener("cms_content_updated", handler);
    };
  }, [initialContent]);

  function updateContent(updates: Partial<CMSContent>) {
    const merged = deepMerge(content, updates);
    setContentState(merged);
    setIsDirty(true);
  }

  // Returns whether the write actually landed — the caller (the Save button) needs this to
  // avoid telling the admin their edit is safe when the database write silently failed. Only
  // clears isDirty and re-fetches content on success, so a failed save correctly leaves the
  // "unsaved changes" state in place rather than pretending nothing changed. "previous" is this
  // hook's own last-known content rather than a fresh read (there's no cheap synchronous way to
  // read the database) — consistent with the cross-tab tradeoff noted above.
  async function persistContent(overrides?: Partial<CMSContent>): Promise<boolean> {
    const previous = content;
    const toSave = overrides ? deepMerge(content, overrides) : content;
    const ok = await saveCmsContentAction(toSave);
    if (ok) {
      // Archive whatever was live right before this save — skipped when nothing actually
      // changed, so re-clicking Save with no edits doesn't pad the list with duplicates.
      if (JSON.stringify(previous) !== JSON.stringify(toSave)) archiveHistoryEntry(previous);
      window.dispatchEvent(new Event("cms_content_updated"));
    }
    return ok;
  }

  return { content, updateContent, persistContent, isDirty, isLoading };
}
