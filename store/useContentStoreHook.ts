"use client";

import { useState, useEffect } from "react";
import { DEFAULT_CONTENT, deepMerge } from "@/store/contentStore";
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
  // Mirrors whatever's actually in Postgres right now — untouched by in-progress edits, only
  // ever replaced wholesale when a save/fetch actually lands. Fields/cards compare their own
  // live value against the same slice of this snapshot to show an "unsaved" outline; see
  // components/CMSFields.tsx and the per-tab dot in components/AdminCMS.tsx.
  const [savedContent, setSavedContent] = useState<CMSContent>(initialContent ?? DEFAULT_CONTENT);
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
        setSavedContent(c);
        setIsLoading(false);
      });
    }
    const handler = () => {
      fetchContent().then((c) => {
        if (cancelled) return;
        setContentState(c);
        setSavedContent(c);
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
  // "unsaved changes" state in place rather than pretending nothing changed. Version-history
  // archiving happens server-side inside saveCmsContentAction itself now (it reads the true
  // current database state right before overwriting it), not here — see app/actions/cms.ts.
  //
  // saveCmsContentAction itself already catches DB-level failures and resolves to false, but a
  // dropped connection or any other transport-level hiccup calling a Server Action throws
  // instead of resolving — without this try/catch that exception had nowhere to go (every
  // caller just does `const ok = await persistContent()`), so it silently killed whatever this
  // call was part of: the caller's own "saving…"/error state update never ran, callers awaiting
  // it inside a loop never continued, and the admin saw no error at all — just a save that
  // appeared to do nothing.
  //
  // Updates THIS hook instance's own content/savedContent/isDirty synchronously the moment the
  // save actually lands, rather than waiting on the "cms_content_updated" listener's own
  // fetchContent() round trip below (that event still fires too, for any *other* independent
  // useContentStore() instance elsewhere in the tree — e.g. HistorySection, MediaSection — to
  // catch up, since each call to this hook holds its own separate state). Without this, isDirty
  // stayed true for the length of that extra network round trip after a successful save, so the
  // Save button flipped back to its orange "unsaved" look for a moment before settling on
  // "Saved!" — reading as though the save had silently failed and prompting another click.
  async function persistContent(overrides?: Partial<CMSContent>): Promise<boolean> {
    const toSave = overrides ? deepMerge(content, overrides) : content;
    try {
      const ok = await saveCmsContentAction(toSave);
      if (ok) {
        setContentState(toSave);
        setSavedContent(toSave);
        setIsDirty(false);
        window.dispatchEvent(new Event("cms_content_updated"));
      }
      return ok;
    } catch {
      return false;
    }
  }

  return { content, updateContent, persistContent, isDirty, isLoading, savedContent };
}
