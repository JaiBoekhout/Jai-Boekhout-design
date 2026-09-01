import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedProjects, getPublishedProjectBySlug, projectHasLiveCaseStudy, projectUrlSlug } from "@/store/contentStore";
import { getContent } from "@/store/serverContent";
import { stripHtml, truncateAtWord, breadcrumbJsonLd } from "@/lib/utils";
import { ProjectPageView } from "@/components/ProjectPageView";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jaiboekhout.nl";

export async function generateStaticParams() {
  return getPublishedProjects(await getContent()).map((p) => ({ slug: projectUrlSlug(p) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const content = await getContent();
  const project = getPublishedProjectBySlug(content, slug);
  if (!project) return {};
  const image = project.heroImageUrl ?? project.coverImageUrl ?? project.imgs[0];
  // A case-study-only entry (no real CMSProject record of its own, synthesized by
  // caseStudyToProject — see contentStore.ts) has project.metaDescription literally sourced from
  // the *same* case study record the deeper /case-study page also reads its own metaDescription
  // from. Using it here too would just duplicate that page's text, so skip it in that situation
  // and fall back to the auto-truncated summary instead — a real, independent project record
  // (like Evolve) has no such collision and can set its own metaDescription freely even when it
  // also has a linked case study.
  const isSyntheticFromCaseStudy = project.id.startsWith("cs-");
  const hasCaseStudy = projectHasLiveCaseStudy(project, content.work.caseStudies);
  const description =
    (!(isSyntheticFromCaseStudy && hasCaseStudy) && project.metaDescription) ||
    truncateAtWord(stripHtml(project.desc), 155);
  return {
    title: project.name,
    description,
    alternates: { canonical: `/work/${slug}` },
    openGraph: image ? { images: [image] } : undefined,
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getPublishedProjectBySlug(await getContent(), slug);
  if (!project) notFound();
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Work", url: `${SITE_URL}/work` },
    { name: project.name, url: `${SITE_URL}/work/${slug}` },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <ProjectPageView slug={slug} />
    </>
  );
}
