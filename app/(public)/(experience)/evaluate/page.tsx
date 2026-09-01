import type { Metadata } from "next";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceRecruiter } from "@/components/ExperienceRecruiter";

const description =
  "Evaluating Jai Boekhout for a UX/Product Design role? Experience, qualifications and process in one place — built for hiring managers and recruiters.";

export const metadata: Metadata = {
  title: "Evaluate Me",
  description,
  alternates: { canonical: "/evaluate" },
  // openGraph isn't deep-merged with the root layout's — a child page providing its own object
  // replaces the parent's entirely, so type/locale/siteName need repeating here too.
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Jai Boekhout — UX & Product Design",
    title: "Evaluate Me — Jai Boekhout",
    description,
  },
};

export default function EvaluatePage() {
  return <ExperiencePage Component={ExperienceRecruiter} />;
}
