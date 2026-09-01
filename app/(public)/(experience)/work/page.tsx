import type { Metadata } from "next";
import { ExperiencePage } from "@/components/ExperiencePage";
import { ExperienceWork } from "@/components/ExperienceWork";

const description =
  "UX and product design case studies by Jai Boekhout — spanning brand identity, UX and full-stack build, each grounded in solving the right problem first.";

export const metadata: Metadata = {
  title: "Work",
  description,
  alternates: { canonical: "/work" },
  // openGraph isn't deep-merged with the root layout's — a child page providing its own object
  // replaces the parent's entirely, so type/locale/siteName need repeating here too, not just
  // the title/description that actually differ per page (otherwise this page's share preview
  // would silently lose them rather than just fall back to the (wrong) homepage description).
  openGraph: {
    type: "website",
    locale: "en_AU",
    siteName: "Jai Boekhout — UX & Product Design",
    title: "Work — Jai Boekhout",
    description,
  },
};

export default function WorkPage() {
  return <ExperiencePage Component={ExperienceWork} />;
}
