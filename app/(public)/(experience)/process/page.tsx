import type { Metadata } from "next";
import { getContent } from "@/store/contentStore";
import { stripHtml } from "@/lib/utils";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceProcess } from "@/components/ExperienceProcess";

export function generateMetadata(): Metadata {
  const content = getContent();
  return {
    title: "Process",
    description: stripHtml(content.process.heroStatement).slice(0, 160),
    alternates: { canonical: "/process" },
  };
}

export default function ProcessPage() {
  return <ExperiencePage Component={ExperienceProcess} />;
}
