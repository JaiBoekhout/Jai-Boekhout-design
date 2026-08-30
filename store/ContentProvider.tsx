"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CMSContent } from "@/store/contentStore";

// Seeded once by the root layout (a Server Component, which can reach Postgres directly) so
// every useContentStore() call starts from real, current content instead of the hardcoded
// DEFAULT_CONTENT — see store/useContentStoreHook.ts. Without this, every hard refresh
// rendered DEFAULT_CONTENT's stale snapshot first, then replaced it with fetched content a
// moment later once the client mounted, producing a visible "wrong content, then right
// content" flash on every page load.
const InitialContentContext = createContext<CMSContent | null>(null);

export function ContentProvider({ initialContent, children }: { initialContent: CMSContent; children: ReactNode }) {
  return <InitialContentContext.Provider value={initialContent}>{children}</InitialContentContext.Provider>;
}

export function useInitialContent(): CMSContent | null {
  return useContext(InitialContentContext);
}
