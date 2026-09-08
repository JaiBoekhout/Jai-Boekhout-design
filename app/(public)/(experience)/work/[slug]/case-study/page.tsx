import { redirect } from "next/navigation";

// Projects and case studies were merged into one page per project — this route used to be a
// separate "full case study" deep-dive, now folded into /work/[slug] itself. Kept as an
// unconditional redirect (rather than deleted outright) so any old shared/bookmarked/indexed
// /case-study links still land somewhere real instead of 404ing.
export default async function CaseStudyRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/work/${slug}`);
}
