"use client";

import { motion } from "motion/react";
import { PathCTA } from "@/components/PathCTA";
import { FeaturedProjects } from "@/components/FeaturedProjects";
import { ClientsSlider } from "@/components/ClientsSlider";
import { useContentStore, getFeaturedProjects, getMoreProjects, resolveWorkStats, enrichProjectWithCaseStudy } from "@/store/contentStore";
import { STAT_ICON_MAP, DEFAULT_STAT_ICON } from "@/lib/statIcons";

// Same 3 stat ids Evaluate's own "At a Glance" cards make clickable there (the rest are purely
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
      {/* Hero */}
      <div className="px-8 md:px-16 pt-10 pb-8 border-b" style={{ borderColor: "var(--c-border-soft)" }}>
        <motion.h1
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
        </motion.h1>
        <motion.h2
          className={content.work.heroStatementMobile ? "hidden md:block hero-mobile-h2" : "hero-mobile-h2"}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(32px, 5vw, 64px)",
            color: "var(--c-text)",
            lineHeight: 1.1,
            fontWeight: 400,
            maxWidth: "800px",
          }}
          dangerouslySetInnerHTML={{ __html: content.work.heroStatement }}
        />
        {content.work.heroStatementMobile && (
          <motion.h2
            className="block md:hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(32px, 5vw, 64px)",
              color: "var(--c-text)",
              lineHeight: 1.1,
              fontWeight: 400,
              maxWidth: "800px",
            }}
            dangerouslySetInnerHTML={{ __html: content.work.heroStatementMobile }}
          />
        )}
      </div>

      {/* Featured Projects grid */}
      {featuredProjects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          className="px-8 md:px-16 mt-6"
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
          className="px-8 md:px-16 mt-14"
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
            {content.evaluate.clientsHeading || "Clients & Companies"}
          </p>
          <ClientsSlider clients={content.evaluate.clients} speed={content.evaluate.clientSliderSpeed} />
        </motion.div>
      )}

      {/* Stats bar — a selector over Evaluate → At a Glance entries, configured in the Work
          tab admin; only shown when enabled and at least one slot resolves to a live entry.
          Styled to match Evaluate's own "At a Glance" cards exactly (individual bordered
          cards, not one box with dividers) — the 3 stat types Evaluate makes clickable there
          are clickable here too, jumping to that same section on /evaluate. Sits just above
          the "Interested in working together?" CTA. */}
      {homeStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          className="mx-8 md:mx-16 mt-14 grid grid-cols-2 md:grid-cols-3 gap-2.5"
        >
          {homeStats.map(({ id, value, label, sub, icon }) => {
            const anchor = STAT_ID_TO_EVALUATE_ANCHOR[id];
            const isClickable = !!anchor;
            const handleActivate = () => onNavigate("recruit", undefined, anchor);
            const Icon = (icon && STAT_ICON_MAP[icon]) || DEFAULT_STAT_ICON;
            return (
              <div
                key={id}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={isClickable ? handleActivate : undefined}
                onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleActivate(); } } : undefined}
                className="rounded-lg p-3 transition-colors"
                style={{
                  background: "var(--c-bg-card)",
                  border: "1px solid var(--c-border-soft)",
                  cursor: isClickable ? "pointer" : undefined,
                }}
                onMouseEnter={isClickable ? (e) => { e.currentTarget.style.borderColor = "rgba(20,173,181,0.4)"; e.currentTarget.style.background = "var(--c-bg-card-hover, var(--c-bg-card))"; } : undefined}
                onMouseLeave={isClickable ? (e) => { e.currentTarget.style.borderColor = "var(--c-border-soft)"; e.currentTarget.style.background = "var(--c-bg-card)"; } : undefined}
              >
                <div className="flex items-center gap-1.5" style={{ marginBottom: "4px" }}>
                  <Icon size={15} style={{ color: "var(--c-teal)", opacity: 0.7, flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(16px, 1.8vw, 22px)", color: "var(--c-text)", fontWeight: 400, lineHeight: 1 }}>
                    {value}
                  </span>
                </div>
                <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--c-text-muted)", fontWeight: 300 }}>
                  {label}
                </span>
                {sub && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--c-teal)", display: "block", marginTop: "2px" }}>
                    {sub}
                  </span>
                )}
              </div>
            );
          })}
        </motion.div>
      )}

      <PathCTA currentPath="work" onNavigate={onNavigate} />
    </motion.div>
  );
}
