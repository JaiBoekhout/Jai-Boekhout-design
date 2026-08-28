import type { Metadata } from "next";
import { getContent } from "@/store/contentStore";
import { stripHtml } from "@/lib/utils";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceStory } from "@/components/ExperienceStory";

export function generateMetadata(): Metadata {
  const content = getContent();
  return {
    title: "Story",
    description: stripHtml(content.story.heroStatement).slice(0, 160),
    alternates: { canonical: "/story" },
  };
}

export default function StoryPage() {
  return <ExperiencePage Component={ExperienceStory} />;
}
