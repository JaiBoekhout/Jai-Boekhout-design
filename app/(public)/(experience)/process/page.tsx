import type { Metadata } from "next";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceProcess } from "@/components/ExperienceProcess";

const description =
  "How Jai Boekhout approaches UX and product design — research, strategy, design and testing, adapted to each project rather than a fixed template.";

export const metadata: Metadata = {
  title: "Process",
  description,
  alternates: { canonical: "/process" },
  // openGraph isn't deep-merged with the root layout's — a child page providing its own object
  // replaces the parent's entirely, so type/locale/siteName need repeating here too.
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Jai Boekhout — UX & Product Design",
    title: "Process — Jai Boekhout",
    description,
  },
};

export default function ProcessPage() {
  return <ExperiencePage Component={ExperienceProcess} />;
}
