import type { MetadataRoute } from "next";
import {
  getContent, getFeaturedProjects, getMoreProjects, projectUrlSlug, projectHasLiveCaseStudy,
} from "@/store/contentStore";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jaiboekhout.nl";

function toDate(iso: string | undefined): Date {
  if (!iso) return new Date();
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

// Enumerates every real URL on the site: the landing page, the 4 experience paths, and every
// published project/case study's own /work/[slug] (+ /case-study) page — all driven from the
// same DEFAULT_CONTENT + getFeaturedProjects/getMoreProjects/projectUrlSlug the actual routes
// use, so this can never drift from what generateStaticParams builds. A locked case study is
// excluded entirely (matches its page's own robots: noindex) — there's no point offering search
// engines a link they can't get past the password gate on.
export default function sitemap(): MetadataRoute.Sitemap {
  const content = getContent();
  const projects = [...getFeaturedProjects(content), ...getMoreProjects(content)]
    .filter((p) => !p.status || p.status === "published");

  const experiencePaths: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/work`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/evaluate`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/process`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/story`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  ];

  const projectPages: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${SITE_URL}/work/${projectUrlSlug(p)}`,
    lastModified: toDate(p.updatedAt),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const caseStudyPages: MetadataRoute.Sitemap = projects
    .filter((p) => projectHasLiveCaseStudy(p, content.work.caseStudies) && !p.fullCaseStudyLocked)
    .map((p) => ({
      url: `${SITE_URL}/work/${projectUrlSlug(p)}/case-study`,
      lastModified: toDate(p.updatedAt),
      changeFrequency: "monthly",
      priority: 0.7,
    }));

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
    ...experiencePaths,
    ...projectPages,
    ...caseStudyPages,
  ];
}
