"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useContentStore, getPublishedProjects, getPublishedProjectBySlug, resolveViewMore, projectUrlSlug,
} from "@/store/contentStore";
import type { CMSProject } from "@/store/contentStore";
import { ProjectDetailChrome } from "@/components/ProjectDetailChrome";
import { ProjectDetailBody } from "@/components/ProjectDetailBody";
import { CaseStudyLockGate } from "@/components/CaseStudyLockGate";
import { Lightbox } from "@/components/Lightbox";

// Any client-side navigation to another /work/[slug] or /work/[slug]/case-study — even from
// this real page — matches the @modal intercepting-route convention (interception only cares
// that the destination pattern matches from within the work/ layout, not whether the page it's
// leaving is itself a modal or a real page). router.push() here would leave this page mounted
// as the "children" slot while the destination renders into "@modal" on top of it — the exact
// duplicate-content bug this was hit for. A real browser navigation is the documented way past
// that (see node_modules/next/dist/docs/.../intercepting-routes.md: "navigating ... by refreshing
// the page, the entire photo page should render instead of the modal" — interception is a
// client-router-only concept, so a hard navigation always resolves the real, unintercepted tree.
function goHard(url: string) {
  window.location.href = url;
}

// Client-side rendering for a real /work/[slug] page. The server page.tsx already gated
// existence/publication via getPublishedProjectBySlug(await getContent(), slug) for
// generateStaticParams/generateMetadata/notFound() — this re-resolves the same project from
// the live useContentStore() so an in-progress admin edit (saved but not yet reflected in a
// regenerated static page) still previews immediately, exactly like every other CMS-driven
// view on this site.
export function ProjectPageView({ slug }: { slug: string }) {
  const router = useRouter();
  const { content } = useContentStore();
  const [openAttributionId, setOpenAttributionId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  // Only shown once the visitor actively clicks "View Full Case Study" — a locked project's
  // own page must stay fully visible/crawlable; only the case study behind it is gated.
  const [lockGateProject, setLockGateProject] = useState<CMSProject | null>(null);

  const project = getPublishedProjectBySlug(content, slug);
  if (!project) {
    // Only reachable if this exact project was unpublished from another tab after this page
    // loaded — the server component already gated on DEFAULT_CONTENT via notFound().
    return null;
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
      <ProjectDetailChrome project={project} mode="page" onClose={() => router.push("/work")}>
        <ProjectDetailBody
          project={project}
          mode="page"
          onClose={() => router.push("/work")}
          onSelectProject={(id) => goHard(`/work/${id}`)}
          onViewCaseStudy={(p) => {
            if (p.fullCaseStudyLocked) setLockGateProject(p);
            else goHard(`/work/${projectUrlSlug(p)}/case-study`);
          }}
          onOpenLightbox={setLightbox}
          viewMoreProjects={viewMoreProjects}
          showExtras
          openAttributionId={openAttributionId}
          onToggleAttribution={setOpenAttributionId}
        />
      </ProjectDetailChrome>

      {lockGateProject && (
        <CaseStudyLockGate
          project={lockGateProject}
          onClose={() => setLockGateProject(null)}
          onUnlocked={() => goHard(`/work/${projectUrlSlug(lockGateProject)}/case-study`)}
        />
      )}

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} fallbackAlt={`${project.name} — enlarged`} />
    </>
  );
}
