import type { Metadata } from "next";
import { getContent } from "@/store/serverContent";
import { stripHtml } from "@/lib/utils";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceWork } from "@/components/ExperienceWork";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getContent();
  return {
    title: "Work",
    description: stripHtml(content.work.heroStatement).slice(0, 160),
    alternates: { canonical: "/work" },
  };
}

export default function WorkPage() {
  return <ExperiencePage Component={ExperienceWork} />;
}
