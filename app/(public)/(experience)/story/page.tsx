import type { Metadata } from "next";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceStory } from "@/components/ExperienceStory";

export const metadata: Metadata = {
  title: "Story",
  description:
    "The journey behind UX & Product Designer Jai Boekhout — from a curious kid who liked figuring out how things work to 10+ years designing real products.",
  alternates: { canonical: "/story" },
};

export default function StoryPage() {
  return <ExperiencePage Component={ExperienceStory} />;
}
