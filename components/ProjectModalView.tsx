"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  useContentStore, getPublishedProjects, getPublishedProjectBySlug, resolveViewMore,
} from "@/store/contentStore";
import { ProjectDetailChrome } from "@/components/ProjectDetailChrome";
import { ProjectDetailBody } from "@/components/ProjectDetailBody";
import { CaseStudyLockGate } from "@/components/CaseStudyLockGate";
import { Lightbox } from "@/components/Lightbox";

// Renders inside work/@modal/(.)[slug]/page.tsx — an intercepted route, so this only ever
// mounts for an in-app link click (the grid, a "View More" card, an Evaluate project link);
// a hard navigation/refresh/crawler hits work/[slug]/page.tsx's real full-page view instead.
// router.back() (not push("/work")) closes it, so it returns to wherever the visitor actually
// came from rather than always landing on the grid.
export function ProjectModalView({ slug }: { slug: string }) {
  const router = useRouter();
  const { content } = useContentStore();
  const [openAttributionId, setOpenAttributionId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  // No persisted "remembered unlock" — reopening this modal fresh always re-asks for the
  // password if still locked, matching the pre-merge case-study modal.
  const [unlocked, setUnlocked] = useState(false);

  function close() {
    router.back();
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

  // Published-only and enriched (case study status included) — an unpublished project must
  // never show up in another project's "View More" list, whether pinned by id or auto-filled.
  const pool = getPublishedProjects(content);
  const viewMoreProjects = resolveViewMore(pool, {
    pinnedIds: project.viewMorePinnedIds,
    category: project.viewMoreCategory,
    sort: project.viewMoreSort,
  }, project.id);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        style={{ position: "fixed", inset: 0, background: "rgba(6,9,12,0.82)", zIndex: 40, backdropFilter: "blur(4px)" }}
        onClick={close}
      />
      <ProjectDetailChrome project={project} mode="modal" onClose={close}>
        <ProjectDetailBody
          project={project}
          mode="modal"
          onClose={close}
          // Replace, not push — this is a modal-to-modal hop (View More card inside an already-
          // open modal), so it must not add its own entry to the history stack. Otherwise
          // chaining through several "View More" cards stacks one entry per hop, and close()'s
          // router.back() only ever undoes one hop at a time instead of returning to wherever
          // the visitor actually started (the grid, an Evaluate link, etc.) in a single click.
          onSelectProject={(id) => router.replace(`/work/${id}`)}
          onOpenLightbox={setLightbox}
          viewMoreProjects={viewMoreProjects}
          showExtras
          openAttributionId={openAttributionId}
          onToggleAttribution={setOpenAttributionId}
        />
      </ProjectDetailChrome>

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} fallbackAlt={`${project.name} — enlarged`} />
    </>
  );
}
