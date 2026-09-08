import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedProjects, getPublishedProjectBySlug, projectUrlSlug } from "@/store/contentStore";
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
  const description = project.metaDescription || truncateAtWord(stripHtml(project.desc), 155);
  return {
    title: project.name,
    description,
    alternates: { canonical: `/work/${slug}` },
    openGraph: image ? { images: [image] } : undefined,
    // A locked project's whole page is now gated behind the password prompt — nothing to index.
    ...(project.fullCaseStudyLocked ? { robots: { index: false, follow: false } } : {}),
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
