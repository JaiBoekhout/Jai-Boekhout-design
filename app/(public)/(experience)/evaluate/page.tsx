import type { Metadata } from "next";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceRecruiter } from "@/components/ExperienceRecruiter";
import { getContent } from "@/store/serverContent";
import { stripHtml } from "@/lib/utils";

const description =
  "Evaluating Jai Boekhout for a UX/Product Design role? Experience, qualifications and process in one place — built for hiring managers and recruiters.";

export const metadata: Metadata = {
  title: "Evaluate Me",
  description,
  alternates: { canonical: "/evaluate" },
  // openGraph isn't deep-merged with the root layout's — a child page providing its own object
  // replaces the parent's entirely, so type/locale/siteName need repeating here too.
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Jai Boekhout — UX & Product Design",
    title: "Evaluate Me — Jai Boekhout",
    description,
  },
};

export default async function EvaluatePage() {
  const content = await getContent();
  const evaluate = content.evaluate;
  // Checks the *same* master switch (and the same per-item published filter) the FAQ section
  // component itself uses — Google's structured-data guidelines treat schema for content that
  // isn't actually visible on the page as cloaking, which can trigger a manual action against
  // the whole domain, not just this page. So this can never legitimately disagree with what the
  // section actually renders: while the switch is off, zero FAQPage schema, full stop.
  const publishedFaqs = evaluate.faqSectionEnabled
    ? [...(evaluate.faqItems ?? [])].filter((f) => f.published).sort((a, b) => a.order - b.order)
    : [];
  const faqJsonLd = publishedFaqs.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: publishedFaqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: stripHtml(f.answer) },
        })),
      }
    : null;

  return (
    <>
      {faqJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      )}
      <ExperiencePage Component={ExperienceRecruiter} />
    </>
  );
}
