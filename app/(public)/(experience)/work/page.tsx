import type { Metadata } from "next";
import { getContent } from "@/store/contentStore";
import { stripHtml } from "@/lib/utils";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceWork } from "@/components/ExperienceWork";

export function generateMetadata(): Metadata {
  const content = getContent();
  return {
    title: "Work",
    description: stripHtml(content.work.heroStatement).slice(0, 160),
    alternates: { canonical: "/work" },
  };
}

export default function WorkPage() {
  return <ExperiencePage Component={ExperienceWork} />;
}
