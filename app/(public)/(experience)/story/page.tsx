import type { Metadata } from "next";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceStory } from "@/components/ExperienceStory";

const description =
  "The journey behind UX & Product Designer Jai Boekhout — from a curious kid who liked figuring out how things work to 10+ years designing real products.";

export const metadata: Metadata = {
  title: "Story",
  description,
  alternates: { canonical: "/story" },
  // openGraph isn't deep-merged with the root layout's — a child page providing its own object
  // replaces the parent's entirely, so type/locale/siteName need repeating here too.
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Jai Boekhout — UX & Product Design",
    title: "Story — Jai Boekhout",
    description,
  },
};

export default function StoryPage() {
  return <ExperiencePage Component={ExperienceStory} />;
}
