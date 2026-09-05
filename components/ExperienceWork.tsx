"use client";

import { motion } from "motion/react";
import { PathCTA } from "@/components/PathCTA";
import { HeroOverlayLayer } from "@/components/HeroOverlayFields";
import { FeaturedProjects } from "@/components/FeaturedProjects";
import { ClientsSlider } from "@/components/ClientsSlider";
import { StatsBar } from "@/components/StatsBar";
import { useContentStore, getFeaturedProjects, getMoreProjects, resolveWorkStats, enrichProjectWithCaseStudy } from "@/store/contentStore";

// Same 3 stat ids Evaluate's own "At a Glance" row makes clickable there (the rest are purely
// informational, no matching detail section to jump to) — mapped here to the #hash anchors
// those sections expose on Evaluate (see ExperienceRecruiter.tsx's id="..." attributes and its
// on-mount hash-scroll effect), since Work doesn't have these sections itself.
const STAT_ID_TO_EVALUATE_ANCHOR: Record<string, string> = {
  qualifications: "qualifications",
  "years-design": "experience",
  countries: "testimonials",
};

export function ExperienceWork({ onNavigate }: { onNavigate: (path: string, projectId?: string, hash?: string) => void }) {
  const { content } = useContentStore();

  const featuredProjects = getFeaturedProjects(content);
  const moreProjects = getMoreProjects(content);
  const homeStats = resolveWorkStats(content);
  const hasHeroPhoto = !!content.work.heroImageUrl;

  // Enrich projects with case study content when the project has none of its own — see
  // enrichProjectWithCaseStudy in contentStore.ts (also used by the server-rendered
  // /work/[slug] route, so a project's linked case study resolves identically everywhere).
  function enrichWithCaseStudyContent(projects: typeof featuredProjects) {
    return projects.map((p) => enrichProjectWithCaseStudy(p, content.work.caseStudies));
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="min-h-screen pb-32"
      style={{ background: "var(--c-bg)", transition: "background 0.3s ease" }}
    >
      {/* Hero — falls back to today's plain background when no photo is set in the CMS. With a
          photo set, the photo + colour overlay sit behind the hero copy, so text switches to a
          fixed light tone instead of the theme-flipping var(--c-text) — a dark overlay needs
          light text regardless of which site theme is active. Same composited-hero pattern as
          ExperienceStory.tsx/ExperienceRecruiter.tsx. */}
      <div
        className={`relative px-8 md:px-16 ${hasHeroPhoto ? "pt-24 pb-16 md:pt-32 md:pb-20" : "pt-10 pb-8 border-b"} overflow-hidden`}
        style={{ borderColor: hasHeroPhoto ? undefined : "var(--c-border-soft)" }}
      >
        <HeroOverlayLayer data={content.work} />
        {/* Capped and centered independently of the full-bleed photo above, which stays edge to
            edge — see the same pattern in ExperienceStory.tsx/ExperienceProcess.tsx/
            ExperienceRecruiter.tsx. */}
        <div className="relative max-w-[1280px] mx-auto">
          {/* Wayfinding label, not a heading — the real page heading is the statement below.
              (.hero-mobile-h2 below is a Design-System font-size TIER name, unrelated to the
              actual tag; see the comment on buildDesignSystemCss in store/contentStore.ts.) */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--c-teal)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "20px",
            }}
          >
            Path 01 — Work
          </motion.p>
          <motion.h1
            className={content.work.heroStatementMobile ? "hidden md:block hero-mobile-h2" : "hero-mobile-h2"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            style={{
              fontFamily: "var(--font-heading)",
              // Not the actual rendered size — every character of this field's rich-text content
              // always carries its own explicit font-size span, so this only sets the size of the
              // invisible per-line "strut" CSS reserves based on the container's own font/line-
              // height. Left at 64px, a line containing only a smaller trailing span (typed as one
              // paragraph with a manual line break, e.g. a shorter sub-line after the headline)
              // still reserved a 64px-tall line box, leaving a visible gap above that smaller text
              // the CMS editor's own (much smaller-bodied) preview never reproduced. Small and
              // neutral instead, so the strut never exceeds what any real content needs.
              fontSize: "16px",
              color: hasHeroPhoto ? "#F5F1EA" : "var(--c-text)",
              lineHeight: 1.1,
              fontWeight: 400,
              maxWidth: "800px",
            }}
            dangerouslySetInnerHTML={{ __html: content.work.heroStatement }}
          />
          {content.work.heroStatementMobile && (
            <motion.h1
              className="block md:hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(32px, 5vw, 64px)",
                color: hasHeroPhoto ? "#F5F1EA" : "var(--c-text)",
                lineHeight: 1.1,
                fontWeight: 400,
                maxWidth: "800px",
              }}
              dangerouslySetInnerHTML={{ __html: content.work.heroStatementMobile }}
            />
          )}
        </div>
      </div>

      {/* Featured Projects grid */}
      {featuredProjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="px-8 md:px-16 mt-6 max-w-[1280px] mx-auto"
        >
          <FeaturedProjects
            featured={enrichWithCaseStudyContent(featuredProjects)}
            more={enrichWithCaseStudyContent(moreProjects)}
          />
        </motion.div>
      )}

      {/* Clients & Companies */}
      {!content.evaluate.clientsHidden && content.evaluate.clients && content.evaluate.clients.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          className="px-8 md:px-16 mt-14 max-w-[1280px] mx-auto"
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
            {content.evaluate.clientsHeading || "Clients & Companies"}
          </p>
          <ClientsSlider clients={content.evaluate.clients} speed={content.evaluate.clientSliderSpeed} />
        </motion.div>
      )}

      {/* Stats bar — a selector over Evaluate → At a Glance entries, configured in the Work
          tab admin; only shown when enabled and at least one slot resolves to a live entry.
          Shares StatsBar with Evaluate's own "At a Glance" row so both use one visual language.
          The 3 stat types Evaluate makes clickable there are clickable here too, jumping to
          that same section on /evaluate. Sits just above the "Interested in working together?"
          CTA. */}
      {homeStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          className="px-8 md:px-16 mt-14 max-w-[1280px] mx-auto"
        >
          <StatsBar
            stats={homeStats}
            evaluate={content.evaluate}
            isClickable={(id) => !!STAT_ID_TO_EVALUATE_ANCHOR[id]}
            onActivate={(id) => onNavigate("recruit", undefined, STAT_ID_TO_EVALUATE_ANCHOR[id])}
          />
        </motion.div>
      )}

      <PathCTA currentPath="work" onNavigate={onNavigate} />
    </motion.div>
  );
}
