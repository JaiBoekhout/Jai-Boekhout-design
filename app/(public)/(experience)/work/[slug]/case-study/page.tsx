import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getPublishedProjects, getPublishedProjectBySlug,
  projectHasLiveCaseStudy, projectUrlSlug, resolveLinkedCaseStudy,
} from "@/store/contentStore";
import { getContent } from "@/store/serverContent";
import { stripHtml, truncateAtWord, breadcrumbJsonLd } from "@/lib/utils";
import { CaseStudyPageView } from "@/components/CaseStudyPageView";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jaiboekhout.nl";

export async function generateStaticParams() {
  const content = await getContent();
  return getPublishedProjects(content)
    .filter((p) => projectHasLiveCaseStudy(p, content.work.caseStudies))
    .map((p) => ({ slug: projectUrlSlug(p) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const content = await getContent();
  const project = getPublishedProjectBySlug(content, slug);
  if (!project || !projectHasLiveCaseStudy(project, content.work.caseStudies)) return {};
  const image = project.fullCaseStudyBannerUrl ?? project.heroImageUrl ?? project.imgs[0];
  const linkedCaseStudy = resolveLinkedCaseStudy(project, content.work.caseStudies);
  const description =
    linkedCaseStudy?.metaDescription ||
    project.metaDescription ||
    truncateAtWord(stripHtml(project.desc), 155);
  return {
    title: `${project.name} — Case Study`,
    description,
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
  const content = await getContent();
  const project = getPublishedProjectBySlug(content, slug);
  if (!project || !projectHasLiveCaseStudy(project, content.work.caseStudies)) notFound();
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Work", url: `${SITE_URL}/work` },
    { name: project.name, url: `${SITE_URL}/work/${slug}` },
    { name: "Case Study", url: `${SITE_URL}/work/${slug}/case-study` },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <CaseStudyPageView slug={slug} />
    </>
  );
}
