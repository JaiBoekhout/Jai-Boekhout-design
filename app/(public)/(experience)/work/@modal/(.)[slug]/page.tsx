import { ProjectModalView } from "@/components/ProjectModalView";

export default async function InterceptedProjectModal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ProjectModalView slug={slug} />;
}
