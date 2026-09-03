"use client";

import { useRouter } from "next/navigation";
import { track } from "@vercel/analytics";
import { HomePage } from "@/components/HomePage";
import { useContentStore, DEFAULT_LOGO_URL } from "@/store/contentStore";
import { pathKeyToUrl } from "@/lib/paths";

// The 4 experience paths (Work, Evaluate, Process, Story) are real routes now — see
// app/(public)/(experience)/. This page is just the landing screen; selecting a path is a real
// navigation, not local view state, so the URL, browser back/forward, and hard refresh all work
// the way a fresh visitor (or Google) would expect.
export default function PortfolioPage() {
  const router = useRouter();
  const { content } = useContentStore();
  const logoUrl = content.branding.logoUrl || DEFAULT_LOGO_URL;

  function handleSelect(path: string) {
    track("path_selected", { path });
    router.push(pathKeyToUrl(path));
  }

  return (
    <div className="min-h-screen w-full" style={{ background: "var(--background)", transition: "background 0.3s ease" }}>
      <HomePage onSelect={handleSelect} logoUrl={logoUrl} />
    </div>
  );
}
