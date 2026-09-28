"use client";

import { useRef } from "react";
import type { CMSContent, CMSMediaMeta } from "@/store/contentStore";

// The Media Library's Display Name / Alt Text / Caption fields used to call persistContent() —
// a full-content network save — on every single keystroke. Typing faster than a save round trip
// left multiple saves in flight at once with no guarantee they'd resolve in the order they were
// sent; whichever slower, older save landed last overwrote local state with its own (by then
// stale) snapshot, visibly deleting characters typed after it had already fired. This debounces
// the actual persistContent() write until typing pauses, while still updating local state (via
// updateContent) on every keystroke so the field itself stays instantly responsive.
//
// pendingRef accumulates the merged mediaMeta across keystrokes that land before the timer
// fires, so the eventual save always carries the latest text — not whatever content looked like
// one render behind, which is what persistContent()'s own closed-over `content` would otherwise
// reflect (see store/useContentStoreHook.ts).
export function useDebouncedMediaMetaSave(
  content: CMSContent,
  updateContent: (updates: Partial<CMSContent>) => void,
  persistContent: (overrides?: Partial<CMSContent>) => Promise<boolean>,
  delayMs = 600
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Record<string, CMSMediaMeta> | null>(null);

  function getMeta(src: string): CMSMediaMeta {
    return (pendingRef.current ?? content.mediaMeta)?.[src] ?? {};
  }

  function setMeta(src: string, patch: Partial<CMSMediaMeta>) {
    const base = pendingRef.current ?? content.mediaMeta ?? {};
    const updated = { ...base, [src]: { ...(base[src] ?? {}), ...patch } };
    pendingRef.current = updated;
    updateContent({ mediaMeta: updated });

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const toSave = pendingRef.current;
      pendingRef.current = null;
      timerRef.current = null;
      if (toSave) persistContent({ mediaMeta: toSave });
    }, delayMs);
  }

  return { getMeta, setMeta };
}
