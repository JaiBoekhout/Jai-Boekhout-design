import type { Metadata } from "next";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceRecruiter } from "@/components/ExperienceRecruiter";

export const metadata: Metadata = {
  title: "Evaluate Me",
  description:
    "Evaluating Jai Boekhout for a UX/Product Design role? Experience, qualifications and process in one place — built for hiring managers and recruiters.",
  alternates: { canonical: "/evaluate" },
};

export default function EvaluatePage() {
  return <ExperiencePage Component={ExperienceRecruiter} />;
}
