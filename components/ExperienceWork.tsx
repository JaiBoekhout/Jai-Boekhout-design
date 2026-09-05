"use client";

import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { PathCTA } from "@/components/PathCTA";
import { FeaturedProjects } from "@/components/FeaturedProjects";
import { ClientsSlider } from "@/components/ClientsSlider";
import { useContentStore, getFeaturedProjects, getMoreProjects, resolveWorkStats, enrichProjectWithCaseStudy, resolveStatValue } from "@/store/contentStore";
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

// Literal Tailwind class strings (not built via template interpolation) so the JIT scanner
// picks them up — the resolved stat count (1-6) selects how many columns fit on one row at
// lg: and up, so all of them sit on a single row rather than wrapping into a 2-column grid.
const STATS_LG_COLS: Record<number, string> = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
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
          A flush divider-line row (full-width top/bottom rule, a vertical rule between each
          item) rather than Evaluate's own bordered/backgrounded "At a Glance" cards, though it
          borrows that same icon + "View section" CTA treatment. Unlike Evaluate, the value
          itself stays the page's plain text colour rather than the highlight colour. The 3
          stat types Evaluate makes clickable there are clickable here too, jumping to that
          same section on /evaluate. Sits just above the "Interested in working together?" CTA. */}
      {homeStats.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.5 }}
          className={`mx-8 md:mx-16 mt-14 grid grid-cols-2 ${STATS_LG_COLS[homeStats.length] ?? STATS_LG_COLS[4]}`}
          style={{ borderTop: "0.5px solid var(--c-divider)", borderBottom: "0.5px solid var(--c-divider)" }}
        >
          {homeStats.map((stat, i) => {
            const { id, label, sub, icon } = stat;
            const value = resolveStatValue(stat, content.evaluate);
            const anchor = STAT_ID_TO_EVALUATE_ANCHOR[id];
            const isClickable = !!anchor;
            const handleActivate = () => onNavigate("recruit", undefined, anchor);
            const isLast = i === homeStats.length - 1;
            const Icon = (icon && STAT_ICON_MAP[icon]) || DEFAULT_STAT_ICON;
            const labelBlock = (
              <div>
                <span style={{ fontFamily: "var(--font-body)", fontSize: "11.5px", color: "var(--c-text)", fontWeight: 300 }}>
                  {label}
                </span>
                {sub && (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "9px", color: "var(--c-text)", display: "block", marginTop: "4px" }}>
                    {sub}
                  </span>
                )}
              </div>
            );
            return (
              <div
                key={id}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onClick={isClickable ? handleActivate : undefined}
                onKeyDown={isClickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleActivate(); } } : undefined}
                className="transition-colors"
                style={{
                  padding: "26px 22px",
                  borderRight: isLast ? "none" : "0.5px solid var(--c-divider)",
                  cursor: isClickable ? "pointer" : undefined,
                }}
                onMouseEnter={isClickable ? (e) => { e.currentTarget.style.background = "rgba(20,173,181,0.05)"; } : undefined}
                onMouseLeave={isClickable ? (e) => { e.currentTarget.style.background = "transparent"; } : undefined}
              >
                <div className="flex items-center gap-1.5" style={{ marginBottom: 9 }}>
                  <Icon size={16} style={{ color: "var(--c-teal)", flexShrink: 0 }} />
                  <div style={{ fontFamily: "var(--font-secondary)", fontStyle: "italic", fontSize: "clamp(22px, 2.6vw, 32px)", color: "var(--c-text)", fontWeight: 400, lineHeight: 1 }}>
                    {value}
                  </div>
                </div>
                {isClickable ? (
                  <div className="flex items-end justify-between gap-2">
                    {labelBlock}
                    <span
                      className="flex items-center gap-1"
                      style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-text)", letterSpacing: "0.02em", whiteSpace: "nowrap", flexShrink: 0 }}
                    >
                      View section <ArrowRight size={11} />
                    </span>
                  </div>
                ) : (
                  labelBlock
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
