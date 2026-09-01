import type { Metadata } from "next";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceProcess } from "@/components/ExperienceProcess";

export const metadata: Metadata = {
  title: "Process",
  description:
    "How Jai Boekhout approaches UX and product design — research, strategy, design and testing, adapted to each project rather than a fixed template.",
  alternates: { canonical: "/process" },
};

export default function ProcessPage() {
  return <ExperiencePage Component={ExperienceProcess} />;
}
