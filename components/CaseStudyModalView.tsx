"use client";

import { useEffect, useState } from "react";
import { useContentStore, getPublishedProjectBySlug } from "@/store/contentStore";
import { CaseStudyDetailChrome } from "@/components/CaseStudyDetailChrome";
import { CaseStudyDetailBody } from "@/components/CaseStudyDetailBody";
import { CaseStudyLockGate } from "@/components/CaseStudyLockGate";
import { Lightbox } from "@/components/Lightbox";

// Renders inside work/@modal/(.)[slug]/case-study/page.tsx — reached by clicking "View Full
// Case Study" from the project modal (no extra "(.)" needed: it's a plain child segment of an
// already-intercepted route). Closing goes to /work directly (not router.back()) to match the
// pre-routing behavior of "View Full Case Study" closing the project popup at the same time it
// opened the case study — there's no in-between state to return to.
//
// That "skip a level" close is exactly what makes router.push("/work") unreliable here: this
// view is reached through TWO stacked interceptions (project modal, then this one nested inside
// it), and a soft push back to a plain, uninercepted "/work" doesn't reliably reset both @modal
// layers in one go — the URL updates but this view's own DOM can be left mounted underneath the
// grid instead of unmounting (confirmed live: back/close updated the address bar to /work while
// the case study content stayed on screen). A hard navigation sidesteps the whole parallel-route
// reconciliation and always lands on the real, single-slotted /work.
function goHard(url: string) {
  window.location.href = url;
}

export function CaseStudyModalView({ slug }: { slug: string }) {
  const { content } = useContentStore();
  const [openAttributionId, setOpenAttributionId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);

  function close() {
    goHard("/work");
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (lightbox) setLightbox(null);
      else close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox]);

  const project = getPublishedProjectBySlug(content, slug);
  if (!project) return null;

  if (project.fullCaseStudyLocked && !unlocked) {
    return <CaseStudyLockGate project={project} onClose={close} onUnlocked={() => setUnlocked(true)} />;
  }

  return (
    <>
      <CaseStudyDetailChrome mode="modal" onClose={close}>
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
