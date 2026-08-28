"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useContentStore, getPublishedProjectBySlug } from "@/store/contentStore";
import { CaseStudyDetailChrome } from "@/components/CaseStudyDetailChrome";
import { CaseStudyDetailBody } from "@/components/CaseStudyDetailBody";
import { CaseStudyLockGate } from "@/components/CaseStudyLockGate";
import { Lightbox } from "@/components/Lightbox";

// A soft nav to /work/[slug] from here matches the @modal (.)[slug] interceptor the same way
// described in ProjectPageView.tsx's goHard() — it would leave this page mounted underneath an
// intercepted project modal instead of actually landing on the real project page. Hard nav
// bypasses interception entirely (client-router-only concept, per intercepting-routes.md).
function goHard(url: string) {
  window.location.href = url;
}

// Client-side rendering for a real /work/[slug]/case-study page — mirrors ProjectPageView's
// server/client split (server page.tsx gates existence/publication from DEFAULT_CONTENT; this
// re-resolves from the live useContentStore() so local edits still preview immediately).
//
// A locked case study has no persisted "remembered unlock" (matching the pre-routing popup,
// which also re-prompted every time "View Full Case Study" was clicked) — arriving at this URL
// fresh (typed, refreshed, bookmarked) always re-asks for the password if still locked.
export function CaseStudyPageView({ slug }: { slug: string }) {
  const router = useRouter();
  const { content } = useContentStore();
  const [openAttributionId, setOpenAttributionId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  const project = getPublishedProjectBySlug(content, slug);
  if (!project) return null;

  if (project.fullCaseStudyLocked && !unlocked) {
    return (
      <CaseStudyLockGate
        project={project}
        onClose={() => goHard(`/work/${slug}`)}
        onUnlocked={() => setUnlocked(true)}
      />
    );
  }

  return (
    <>
      <CaseStudyDetailChrome mode="page" onClose={() => router.push("/work")}>
        <CaseStudyDetailBody
          project={project}
          onOpenLightbox={setLightbox}
          openAttributionId={openAttributionId}
          onToggleAttribution={setOpenAttributionId}
        />
      </CaseStudyDetailChrome>
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} fallbackAlt={`${project.name} — enlarged`} />
    </>
  );
}
