import type { Metadata } from "next";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceWork } from "@/components/ExperienceWork";

export const metadata: Metadata = {
  title: "Work",
  description:
    "UX and product design case studies by Jai Boekhout — spanning brand identity, UX and full-stack build, each grounded in solving the right problem first.",
  alternates: { canonical: "/work" },
};

export default function WorkPage() {
  return <ExperiencePage Component={ExperienceWork} />;
}
