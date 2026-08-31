import type { Metadata } from "next";
import { getContent } from "@/store/serverContent";
import { stripHtml, truncateAtWord } from "@/lib/utils";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceStory } from "@/components/ExperienceStory";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getContent();
  return {
    title: "Story",
    description: truncateAtWord(stripHtml(content.story.heroStatement), 160),
    alternates: { canonical: "/story" },
  };
}

export default function StoryPage() {
  return <ExperiencePage Component={ExperienceStory} />;
}
