// The one mapping between internal path keys (used throughout the CMS/content model —
// content.homepage.cards, PathCTA's NEXT map, onNavigate() calls) and their real URLs.
// "recruit" is the odd one out: its internal key predates this routing work and doesn't
// match its URL ("/evaluate") — every other key equals its URL segment.
export type PathKey = "work" | "recruit" | "process" | "story";

export const PATH_URLS: Record<PathKey, string> = {
  work: "/work",
  recruit: "/evaluate",
  process: "/process",
  story: "/story",
};

export function pathKeyToUrl(key: string): string {
  return PATH_URLS[key as PathKey] ?? "/";
}

// Display name for each path — matches the "Path 0X — Name" eyebrow each experience page
// renders (ExperienceWork.tsx etc.), so PathSwitcher's "Current Path" pill names the same
// thing rather than showing that card's marketing question text.
export const PATH_DISPLAY_NAMES: Record<PathKey, string> = {
  work: "Work",
  recruit: "Evaluate",
  process: "Process",
  story: "Story",
};

const URL_TO_KEY: Record<string, PathKey> = {
  "/work": "work",
  "/evaluate": "recruit",
  "/process": "process",
  "/story": "story",
};

// Derives the active PathKey from a pathname (e.g. usePathname()) — matches any path that
// starts with a known experience segment, so it still resolves correctly from nested routes
// like /work/[slug] or /work/[slug]/case-study, not just the exact top-level path.
export function pathKeyFromPathname(pathname: string): PathKey | null {
  for (const [prefix, key] of Object.entries(URL_TO_KEY)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return key;
  }
  return null;
}
