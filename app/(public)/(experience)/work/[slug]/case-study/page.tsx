import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getContent, getPublishedProjects, getPublishedProjectBySlug,
  projectHasLiveCaseStudy, projectUrlSlug,
} from "@/store/contentStore";
import { stripHtml } from "@/lib/utils";
import { CaseStudyPageView } from "@/components/CaseStudyPageView";

export async function generateStaticParams() {
  const content = getContent();
  return getPublishedProjects(content)
    .filter((p) => projectHasLiveCaseStudy(p, content.work.caseStudies))
    .map((p) => ({ slug: projectUrlSlug(p) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const content = getContent();
  const project = getPublishedProjectBySlug(content, slug);
  if (!project || !projectHasLiveCaseStudy(project, content.work.caseStudies)) return {};
  const image = project.fullCaseStudyBannerUrl ?? project.heroImageUrl ?? project.imgs[0];
  return {
    title: `${project.name} — Case Study`,
    description: stripHtml(project.desc).slice(0, 160),
    alternates: { canonical: `/work/${slug}/case-study` },
    openGraph: image ? { images: [image] } : undefined,
    // A locked case study still gets a real, rendering page (the password gate itself is a
    // client-side UI concern, unchanged from the pre-routing popup) — it just shouldn't be
    // offered to search results, since Google can't get past the gate either.
    ...(project.fullCaseStudyLocked ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function CaseStudyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getContent();
  const project = getPublishedProjectBySlug(content, slug);
  if (!project || !projectHasLiveCaseStudy(project, content.work.caseStudies)) notFound();
  return <CaseStudyPageView slug={slug} />;
}
