"use client";

import { useState, useEffect } from "react";
import {
  DEFAULT_CONTENT, getContent, saveContent, deepMerge, archiveHistoryEntry,
} from "@/store/contentStore";
import type { CMSContent } from "@/store/contentStore";

// Split out of contentStore.ts: this is the one piece of that module that uses React hooks, so
// it needs its own "use client" boundary — contentStore.ts itself stays plain/server-safe (its
// data functions are called directly from Server Components), and re-exports this hook so every
// existing `import { useContentStore } from "@/store/contentStore"` keeps working unchanged.
//
// Known tradeoff, not a bug: this hook has no cross-tab coordination (no storage event
// listener, no lock). Two browser tabs both holding the CMS open each keep their own
// in-memory draft, and whichever calls persistContent() last silently overwrites the other's
// save with no warning or merge. Acceptable for how this is actually used today — a single
// admin, effectively one active session at a time — so this is intentionally left as-is rather
// than adding real conflict detection. Revisit if that usage pattern ever changes.
export function useContentStore() {
  const [content, setContentState] = useState<CMSContent>(DEFAULT_CONTENT);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setContentState(getContent());
    const handler = () => {
      setContentState(getContent());
      setIsDirty(false);
    };
    window.addEventListener("cms_content_updated", handler);
    return () => window.removeEventListener("cms_content_updated", handler);
  }, []);

  function updateContent(updates: Partial<CMSContent>) {
    const merged = deepMerge(content, updates);
    setContentState(merged);
    setIsDirty(true);
  }

  // Returns whether the write actually landed — the caller (the Save button) needs this to
  // avoid telling the admin their edit is safe when localStorage.setItem silently failed (the
  // realistic case is quota exceeded, since a case study's rich text can accumulate quickly).
  // Only clears isDirty and re-reads content on success, so a failed save correctly leaves the
  // "unsaved changes" state in place rather than pretending nothing changed.
  function persistContent(overrides?: Partial<CMSContent>): boolean {
    const toSave = overrides ? deepMerge(content, overrides) : content;
    const previous = getContent();
    const ok = saveContent(toSave);
    if (ok) {
      // Archive whatever was live right before this save — skipped when nothing actually
      // changed, so re-clicking Save with no edits doesn't pad the list with duplicates.
      if (JSON.stringify(previous) !== JSON.stringify(toSave)) archiveHistoryEntry(previous);
      window.dispatchEvent(new Event("cms_content_updated"));
    }
    return ok;
  }

  return { content, updateContent, persistContent, isDirty };
}
