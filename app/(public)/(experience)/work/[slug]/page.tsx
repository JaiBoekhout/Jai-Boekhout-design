import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContent, getPublishedProjects, getPublishedProjectBySlug, projectUrlSlug } from "@/store/contentStore";
import { stripHtml } from "@/lib/utils";
import { ProjectPageView } from "@/components/ProjectPageView";

export async function generateStaticParams() {
  return getPublishedProjects(getContent()).map((p) => ({ slug: projectUrlSlug(p) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const project = getPublishedProjectBySlug(getContent(), slug);
  if (!project) return {};
  const image = project.heroImageUrl ?? project.coverImageUrl ?? project.imgs[0];
  return {
    title: project.name,
    description: stripHtml(project.desc).slice(0, 160),
    alternates: { canonical: `/work/${slug}` },
    openGraph: image ? { images: [image] } : undefined,
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getPublishedProjectBySlug(getContent(), slug);
  if (!project) notFound();
  return <ProjectPageView slug={slug} />;
}
