import type { Metadata } from "next";
import { getContent } from "@/store/serverContent";
import { stripHtml, truncateAtWord } from "@/lib/utils";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceProcess } from "@/components/ExperienceProcess";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getContent();
  return {
    title: "Process",
    description: truncateAtWord(stripHtml(content.process.heroStatement), 160),
    alternates: { canonical: "/process" },
  };
}

export default function ProcessPage() {
  return <ExperiencePage Component={ExperienceProcess} />;
}
