"use client";

import { motion } from "motion/react";
import { PathCTA } from "@/components/PathCTA";
import { FeaturedProjects } from "@/components/FeaturedProjects";
import { ClientsSlider } from "@/components/ClientsSlider";
import { useContentStore, getFeaturedProjects, getMoreProjects, resolveWorkStats, enrichProjectWithCaseStudy } from "@/store/contentStore";
import { STAT_ICON_MAP, DEFAULT_STAT_ICON } from "@/lib/statIcons";

// Literal Tailwind class strings (not built via template interpolation) so the JIT scanner
// picks them up — the resolved stat count (1-6) selects the grid to use.
const STATS_GRID_CLASS: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-5",
  6: "grid-cols-1 md:grid-cols-3 lg:grid-cols-6",
};

export function ExperienceWork({ onNavigate }: { onNavigate: (path: string) => void }) {
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
        <motion.span
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
        </motion.span>
        <motion.h1
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
          <motion.h1
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
          Sits just above the "Interested in working together?" CTA. */}
      {homeStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          className={`mx-8 md:mx-16 mt-14 p-6 rounded-2xl border grid gap-6 ${STATS_GRID_CLASS[homeStats.length] ?? STATS_GRID_CLASS[3]}`}
          style={{ background: "var(--c-bg-card)", borderColor: "var(--c-border-soft)" }}
        >
          {homeStats.map(({ id, value, label, icon }) => {
            const Icon = (icon && STAT_ICON_MAP[icon]) || DEFAULT_STAT_ICON;
            return (
              <div key={id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Icon size={18} style={{ color: "var(--c-teal)", opacity: 0.7, flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--c-text-muted)" }}>
                    {label}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "32px",
                    color: "var(--c-text)",
                    lineHeight: 1,
                  }}
                >
                  {value}
                </span>
              </div>
            );
          })}
        </motion.div>
      )}

      <PathCTA currentPath="work" onNavigate={onNavigate} />
    </motion.div>
  );
}
