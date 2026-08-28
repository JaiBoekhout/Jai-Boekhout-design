import type { Metadata } from "next";
import { getContent } from "@/store/contentStore";
import { stripHtml } from "@/lib/utils";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceRecruiter } from "@/components/ExperienceRecruiter";

export function generateMetadata(): Metadata {
  const content = getContent();
  return {
    title: "Evaluate Me",
    description: stripHtml(content.evaluate.heroStatement).slice(0, 160),
    alternates: { canonical: "/evaluate" },
  };
}

export default function EvaluatePage() {
  return <ExperiencePage Component={ExperienceRecruiter} />;
}
