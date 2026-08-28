import { CaseStudyModalView } from "@/components/CaseStudyModalView";

export default async function InterceptedCaseStudyModal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <CaseStudyModalView slug={slug} />;
}
