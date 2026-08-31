import type { Metadata } from "next";
import { getContent } from "@/store/serverContent";
import { stripHtml, truncateAtWord } from "@/lib/utils";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceRecruiter } from "@/components/ExperienceRecruiter";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getContent();
  return {
    title: "Evaluate Me",
    description: truncateAtWord(stripHtml(content.evaluate.heroStatement), 160),
    alternates: { canonical: "/evaluate" },
  };
}

export default function EvaluatePage() {
  return <ExperiencePage Component={ExperienceRecruiter} />;
}
