"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Download } from "lucide-react";
import { FaLinkedin } from "react-icons/fa6";
import { useContentStore, resolveExperienceProjects, projectUrlSlug } from "@/store/contentStore";
import type { CMSProject, CMSFaqItem } from "@/store/contentStore";
import { PathCTA } from "@/components/PathCTA";
import { HeroOverlayLayer } from "@/components/HeroOverlayFields";
import { StatsBar } from "@/components/StatsBar";
import { ClientsSlider } from "@/components/ClientsSlider";
import { SkillNetwork } from "@/components/SkillNetwork";
import { MissingImagePlaceholder } from "@/components/MissingImagePlaceholder";

const TEAL = "var(--c-teal)";
// Matches the public top bar's rendered height (app/(public)/(experience)/layout.tsx) —
// reserved as scroll-margin so the Qualifications stat card's scroll-to-section jump doesn't
// land underneath it.
const TOP_BAR_HEIGHT = 64;

// Summary is stored as rich-text HTML; strip tags for the compact card blurb — same helper
// as FeaturedProjects.tsx's grid card uses, kept local since it isn't exported from there.
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Single-project "card" display mode — the same rich image-card treatment as a tile in the
// Work page's featured grid (cover image, gradient, tags/year, name, description), just
// standalone rather than part of a 9-up grid.
function ExperienceProjectCard({ project, onNavigate }: { project: CMSProject; onNavigate: () => void }) {
  const coverSrc = project.coverImageUrl || project.imgs?.[0] || null;
  const year = project.client.match(/\d{4}/)?.[0] ?? null;
  return (
    <button
      type="button"
      onClick={onNavigate}
      className="group relative w-full text-left overflow-hidden"
      style={{
        aspectRatio: "16/9",
        borderRadius: 16,
        background: "var(--c-bg-card)",
        border: "0.5px solid var(--c-border-soft)",
        cursor: "pointer",
        display: "block",
        padding: 0,
      }}
    >
      {coverSrc ? (
        <>
          <div
            className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            style={{
              backgroundImage: `url(${coverSrc})`,
              backgroundSize: "cover",
              backgroundPosition: project.coverImagePosition || "center",
              transform: `scale(${project.coverImageScale ?? 1})`,
              transformOrigin: project.coverImagePosition || "center",
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(6,9,12,0.97) 0%, rgba(6,9,12,0.72) 32%, rgba(6,9,12,0.12) 62%, transparent 100%)" }}
          />
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <MissingImagePlaceholder logoWidth="38%" logoMaxWidth={120} />
        </div>
      )}

      <div className="absolute left-5 right-5 bottom-5" style={{ zIndex: 2 }}>
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.12em", color: TEAL, textTransform: "uppercase" }}>
            {project.tags.slice(0, 2).join(" · ")}
          </span>
          {year && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "rgba(255,255,255,0.28)", letterSpacing: "0.06em" }}>
              {year}
            </span>
          )}
        </div>
        <div
          style={{
            fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 500, color: "#fff", lineHeight: 1.2,
            marginBottom: 7, letterSpacing: "-0.01em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}
        >
          {project.name}
        </div>
        <div
          style={{
            fontFamily: "var(--font-body)", fontSize: 12, color: "rgba(255,255,255,0.48)", lineHeight: 1.55, marginBottom: 11,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}
        >
          {stripHtml(project.desc)}
        </div>
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", color: TEAL, display: "flex", alignItems: "center", gap: 5 }}>
          VIEW PROJECT <span>→</span>
        </div>
      </div>
    </button>
  );
}

export function ExperienceRecruiter({ onNavigate }: { onNavigate: (path: string, projectId?: string) => void }) {
  // A Set (not a single index) — each entry opens/closes independently, so opening one never
  // closes another. A shared single-open-index used to mean opening any entry below an
  // already-open one collapsed that other entry at the same instant, yanking the just-clicked
  // entry (and everything below it) upward as the space above it disappeared.
  const [openJobs, setOpenJobs] = useState<Set<number>>(() => new Set([0]));
  const [openFaqs, setOpenFaqs] = useState<Set<number>>(() => new Set());
  const [showAllFaqs, setShowAllFaqs] = useState(false);
  // "all" (the built-in, always-first tab) or a CMSFaqCategory id — only meaningful when
  // faqLayoutMode is "tabs"; list mode never changes this away from its default.
  const [activeFaqTab, setActiveFaqTab] = useState<string>("all");
  function selectFaqTab(id: string) {
    setActiveFaqTab(id);
    // Both are keyed against whichever item set is currently visible, so switching tabs starts
    // that tab fresh rather than carrying over open/expanded state that no longer lines up.
    setShowAllFaqs(false);
    setOpenFaqs(new Set());
  }
  // Tracked in JS (not left to a CSS breakpoint) so the FAQ column split below can collapse to a
  // single column on mobile — otherwise "2 columns" would still split items into two arrays that
  // then just stack in the wrong order (all of column 1, then all of column 2) once the layout
  // goes single-column.
  const [faqDesktop, setFaqDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setFaqDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  function toggleFaq(i: number) {
    setOpenFaqs((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }
  function toggleJob(i: number) {
    setOpenJobs((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }
  // Roving-tabindex arrow key navigation between FAQ tabs (Home/End jump to the first/last) —
  // only the active tab is in the regular tab order (tabIndex 0), so Tab itself moves focus past
  // the whole bar in one step, matching standard tablist behavior.
  function handleFaqTabKeyDown(e: React.KeyboardEvent<HTMLButtonElement>, tabIds: string[], currentIndex: number) {
    if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const nextIndex =
      e.key === "ArrowRight" ? (currentIndex + 1) % tabIds.length
      : e.key === "ArrowLeft" ? (currentIndex - 1 + tabIds.length) % tabIds.length
      : e.key === "Home" ? 0
      : tabIds.length - 1;
    const nextId = tabIds[nextIndex];
    const container = e.currentTarget.parentElement;
    selectFaqTab(nextId);
    requestAnimationFrame(() => {
      container?.querySelector<HTMLButtonElement>(`[data-faq-tab="${nextId}"]`)?.focus();
    });
  }
  const { content } = useContentStore();
  const cms = content.evaluate;
  const hasHeroPhoto = !!cms.heroImageUrl;
  const publishedFaqs = [...(cms.faqItems ?? [])].filter((f) => f.published).sort((a, b) => a.order - b.order);
  const faqLayoutMode = cms.faqLayoutMode ?? "list";
  const faqCategoriesSorted = [...(cms.faqCategories ?? [])].sort((a, b) => a.order - b.order);
  // A tab with nothing published in it hides itself from the row entirely, rather than being
  // selectable into an empty panel.
  const nonEmptyFaqCategories = faqCategoriesSorted.filter((cat) => publishedFaqs.some((f) => f.category === cat.id));
  // If the active tab's last item gets unpublished (or the tab itself deleted) out from under it,
  // fall back to "All" rather than silently showing nothing.
  useEffect(() => {
    if (activeFaqTab !== "all" && !nonEmptyFaqCategories.some((c) => c.id === activeFaqTab)) {
      setActiveFaqTab("all");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faqLayoutMode, nonEmptyFaqCategories.map((c) => c.id).join(",")]);
  const tabFilteredFaqs = faqLayoutMode === "tabs" && activeFaqTab !== "all"
    ? publishedFaqs.filter((f) => f.category === activeFaqTab)
    : publishedFaqs;
  const faqColumns = cms.faqColumns ?? 2;
  const faqVisibleCount = faqColumns * (cms.faqRows ?? 3);
  const visibleFaqs = showAllFaqs ? tabFilteredFaqs : tabFilteredFaqs.slice(0, faqVisibleCount);
  // Independent columns rather than a CSS grid: a grid's rows are shared across both columns, so
  // opening a card on the left grows that whole row and shoves every card to its right down too.
  // Splitting into separate arrays up front (one flex column each) means each column's own
  // content height is all that ever moves it — the other column never reflows. The split itself
  // is fixed by array position (i % columns), not by current open/closed height, so cards never
  // jump between columns as they expand.
  const effectiveFaqColumns = faqDesktop ? faqColumns : 1;
  const faqColumnGroups: { faq: CMSFaqItem; idx: number }[][] = Array.from({ length: effectiveFaqColumns }, () => []);
  visibleFaqs.forEach((faq, i) => faqColumnGroups[i % effectiveFaqColumns].push({ faq, idx: i }));
  // Pins the grid's height to whatever "All" needs, so switching to a tab with fewer questions
  // doesn't shrink the section and jolt everything below it upward — only remeasured while
  // actually on "All" (the only tab whose full item set is ever in the DOM to measure), which
  // is also the default landing tab, so a baseline exists before any tab switch can happen.
  const faqGridRef = useRef<HTMLDivElement>(null);
  const [faqAllHeight, setFaqAllHeight] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    if (activeFaqTab !== "all") return;
    const el = faqGridRef.current;
    if (el) setFaqAllHeight(el.scrollHeight);
  }, [activeFaqTab, showAllFaqs, openFaqs, effectiveFaqColumns, visibleFaqs.length]);
  const qualificationsRef = useRef<HTMLDivElement>(null);
  const experienceRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  // Keyed by the stat's stable id, not its (admin-editable) label — "countries" started life as
  // "Countries Worked In" and is now relabeled "Testimonials" on the live site, which would have
  // silently broken a label-based match. Every other stat stays purely informational, no
  // hover/click treatment. Shared by the "At a Glance" StatsBar below.
  const statScrollTargets: Record<string, React.RefObject<HTMLDivElement | null>> = {
    qualifications: qualificationsRef,
    "years-design": experienceRef,
    countries: testimonialsRef,
  };

  // Lands on a specific section when arriving via a #hash — e.g. the Work page's stat cards
  // link here as /evaluate#qualifications. Sections above the target keep reflowing for a
  // while after first paint (staggered entrance transitions, font swap), which shifts the
  // target further down mid-scroll — a single scrollIntoView call reliably undershoots it.
  // Re-issuing an instant (not smooth — a smooth scroll fighting a moving target looks worse
  // than a clean snap) correction every frame until the target's position stops changing
  // handles that regardless of exactly what's still settling or how long it takes.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    const target = ({ experience: experienceRef, qualifications: qualificationsRef, testimonials: testimonialsRef } as Record<string, React.RefObject<HTMLDivElement | null>>)[hash];
    if (!target) return;
    const start = performance.now();
    let lastTop: number | null = null;
    let stableFrames = 0;
    let rafId: number;
    function tick() {
      const el = target?.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      stableFrames = lastTop !== null && Math.abs(top - lastTop) < 1 ? stableFrames + 1 : 0;
      lastTop = top;
      el.scrollIntoView({ behavior: "auto", block: "start" });
      // A brief plateau mid-reflow can look "stable" for a handful of frames before shifting
      // again — requiring both a longer stable streak AND a minimum elapsed time avoids
      // mistaking that plateau for the real settle point.
      if (stableFrames < 20 || performance.now() - start < 800) rafId = requestAnimationFrame(tick);
    }
    rafId = requestAnimationFrame(tick);
    const stopId = window.setTimeout(() => cancelAnimationFrame(rafId), 3000);
    return () => { cancelAnimationFrame(rafId); clearTimeout(stopId); };
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen pb-32"
      style={{ background: "var(--c-bg)", transition: "background 0.3s ease" }}
    >
      {/* Hero — falls back to today's plain background when no photo is set in the CMS. With a
          photo set, the photo + colour overlay sit behind the hero copy (not a separate banner
          below it), so text switches to a fixed light tone instead of the theme-flipping
          var(--c-text) — a dark overlay needs light text regardless of which site theme is
          active. Same composited-hero pattern as ExperienceStory.tsx. */}
      <div
        className={`relative px-8 md:px-16 ${hasHeroPhoto ? "pt-32 pb-20 md:pt-44 md:pb-24" : "pt-20 pb-16 border-b"} overflow-hidden`}
        style={{ borderColor: hasHeroPhoto ? undefined : "var(--c-border-soft)" }}
      >
        <HeroOverlayLayer data={cms} />
        <div className="relative max-w-[1280px] mx-auto">
          <PathCTA
            currentPath="recruit"
            onNavigate={onNavigate}
            compact
            heroContent={
              <>
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
                  Path 02 — Evaluate
                </motion.p>
                <motion.h1
                  className={cms.heroStatementMobile ? "hidden md:block hero-mobile-h2" : "hero-mobile-h2"}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  style={{
                    fontFamily: "var(--font-heading)",
                    // Not the actual rendered size (every span in this rich-text field carries its
                    // own explicit font-size) — small and neutral so it never inflates the
                    // invisible per-line "strut" CSS reserves for a line whose real content is
                    // smaller than this. See the matching comment in ExperienceWork.tsx.
                    fontSize: "16px",
                    color: hasHeroPhoto ? "#F5F1EA" : "var(--c-text)",
                    lineHeight: 1.1,
                    fontWeight: 400,
                  }}
                  dangerouslySetInnerHTML={{ __html: cms.heroStatement }}
                />
                {cms.heroStatementMobile && (
                  <motion.h1
                    className="block md:hidden"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "clamp(28px, 4.5vw, 58px)",
                      color: hasHeroPhoto ? "#F5F1EA" : "var(--c-text)",
                      lineHeight: 1.1,
                      fontWeight: 400,
                    }}
                    dangerouslySetInnerHTML={{ __html: cms.heroStatementMobile }}
                  />
                )}
              </>
            }
          />
        </div>
      </div>

      <div className="px-8 md:px-16 max-w-[1280px] mx-auto">

        {/* Section 1 — Professional Snapshot */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-14 grid md:grid-cols-2 gap-10 pb-10"
        >
          <div>
            <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px" }}>
              {cms.bioHeading || "About Me"}
            </h2>
            <div
              className={cms.bioMobile ? "rte-content hidden md:block" : "rte-content"}
              style={{ fontSize: "16px", color: "var(--c-text-body)" }}
              dangerouslySetInnerHTML={{ __html: cms.bio }}
            />
            {cms.bioMobile && (
              <div
                className="rte-content block md:hidden"
                style={{ fontSize: "16px", color: "var(--c-text-body)" }}
                dangerouslySetInnerHTML={{ __html: cms.bioMobile }}
              />
            )}
          </div>
          <div>
            <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px" }}>
              {cms.industriesHeading || "Industries"}
            </h2>
            <div className="flex flex-wrap gap-2">
              {cms.industries.map((ind) => (
                <span
                  key={ind}
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "13px",
                    color: "var(--c-text)",
                    border: "1px solid rgba(20,173,181,0.2)",
                    borderRadius: 999,
                    padding: "6px 14px",
                    background: "rgba(20,173,181,0.05)",
                  }}
                >
                  {ind}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Section 1b — At a Glance: a full-width single-row stats bar beneath the About Me /
            Industries columns (previously a boxed 2/3-column grid squeezed into the Industries
            column) — shares StatsBar with the Work page's own stats bar so both use one visual
            language. Download Resume now sits directly under it. */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="mb-14 pb-14 border-b"
          style={{ borderColor: "var(--c-border-soft)" }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px" }}>
            {cms.statsHeading || "At a Glance"}
          </p>
          <StatsBar
            stats={cms.stats}
            evaluate={cms}
            isClickable={(id) => !!statScrollTargets[id]}
            onActivate={(id) => statScrollTargets[id]?.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
          />
          {cms.resumeUrl && (
            <a
              href={cms.resumeUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              style={{
                display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "20px",
                fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.04em",
                background: "var(--btn-color)", color: "var(--c-bg)", border: "1px solid var(--btn-color)",
                borderRadius: "8px", padding: "9px 16px", textDecoration: "none",
              }}
            >
              <Download size={13} /> Download Resume
            </a>
          )}
        </motion.div>

        {/* Section 3 — Professional Experience */}
        <motion.div
          id="experience"
          ref={experienceRef}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-14 pb-14 border-b"
          style={{ borderColor: "var(--c-border-soft)", scrollMarginTop: TOP_BAR_HEIGHT + 16 }}
        >
          <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
            {cms.experienceHeading || "Professional Experience"}
          </h2>
          {/* Flush divided list — a table-like row per job (date / role+org / expand toggle)
              instead of individual bordered cards, matching the flush-divider treatment already
              used for the Stats bar and Skills section. */}
          <div style={{ borderTop: "0.5px solid var(--c-divider)" }}>
            {cms.experience.map((job, i) => (
              <div key={job.org + i} style={{ borderBottom: "0.5px solid var(--c-divider)" }}>
                <button
                  className="w-full text-left flex flex-col md:flex-row md:items-center gap-1 md:gap-6 py-5"
                  onClick={() => toggleJob(i)}
                >
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--c-text-muted)", whiteSpace: "nowrap", flexShrink: 0, width: 110 }}>
                    {job.period}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "18px", color: "var(--c-text)", fontWeight: 400, marginBottom: "3px" }}>
                      {job.role}
                    </h3>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--c-text-muted)", fontWeight: 300 }}>
                      {job.org}
                    </span>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "17px", color: "var(--c-text-muted)", flexShrink: 0, width: 16, textAlign: "center", lineHeight: 1 }}>
                    {openJobs.has(i) ? "−" : "+"}
                  </span>
                </button>

                <AnimatePresence>
                  {openJobs.has(i) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="pb-6" style={{ borderTop: "0.5px solid rgba(237,232,223,0.05)" }}>
                        <div className="pt-5 experience-overview">
                          {job.description && (
                            <>
                              <div
                                className={`rte-content ${job.descriptionMobile ? "hidden md:block" : ""}`}
                                style={{ fontSize: "16px", color: "var(--c-text-body)", marginBottom: "20px", maxWidth: "none" }}
                                dangerouslySetInnerHTML={{ __html: job.description }}
                              />
                              {job.descriptionMobile && (
                                <div
                                  className="rte-content block md:hidden"
                                  style={{ fontSize: "16px", color: "var(--c-text-body)", marginBottom: "20px", maxWidth: "none" }}
                                  dangerouslySetInnerHTML={{ __html: job.descriptionMobile }}
                                />
                              )}
                            </>
                          )}
                          {job.tags.length > 0 && (
                            <>
                              <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
                                Key Skills
                              </p>
                              <div className="flex flex-wrap gap-2 mb-6">
                                {job.tags.map((t, ti) => (
                                  <span
                                    key={`${t}-${ti}`}
                                    className="pro-exp-outline"
                                    style={{
                                      fontFamily: "var(--font-body)",
                                      fontSize: "12px",
                                      color: "var(--c-text-muted)",
                                      borderRadius: 0,
                                      padding: "6px 14px",
                                    }}
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </>
                          )}
                          {job.highlights.map((h, hi) => (
                            <div key={hi} className="flex items-start gap-2 mb-2.5">
                              <span style={{ color: "var(--c-teal)", fontSize: "12px", marginTop: "3px", flexShrink: 0 }}>→</span>
                              <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--c-text-body)", fontWeight: 300, lineHeight: 1.6 }}>
                                {h}
                              </span>
                            </div>
                          ))}

                          {(() => {
                            // Matches the "published only" rule FeaturedProjects.tsx enforces before
                            // opening a project's popup — without this, a draft/unpublished project
                            // could show here as a clickable row that silently fails to open.
                            const jobProjects = resolveExperienceProjects(content, job).filter((p) => !p.status || p.status === "published");
                            if (jobProjects.length === 0) return null;

                            if (job.projectsDisplayMode === "card") {
                              const featured = jobProjects.find((p) => p.id === job.projectsFeaturedId) ?? jobProjects[0];
                              return (
                                <div className="mt-6">
                                  <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
                                    Projects
                                  </p>
                                  <ExperienceProjectCard project={featured} onNavigate={() => onNavigate("work", projectUrlSlug(featured))} />
                                </div>
                              );
                            }

                            return (
                              <div className="mt-6">
                                <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
                                  Projects
                                </p>
                                <div className="flex flex-col gap-2">
                                  {jobProjects.map((p) => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => onNavigate("work", projectUrlSlug(p))}
                                      className="group flex items-center gap-3 w-full text-left transition-opacity hover:opacity-75 pro-exp-outline"
                                      style={{ background: "var(--c-bg-card)", borderRadius: "8px", padding: "6px", cursor: "pointer" }}
                                    >
                                      {(p.coverImageUrl || p.heroImageUrl || p.imgs[0]) ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={p.coverImageUrl || p.heroImageUrl || p.imgs[0]} alt="" style={{ width: 44, height: 32, borderRadius: 5, objectFit: "cover", flexShrink: 0 }} />
                                      ) : (
                                        <div style={{ width: 44, height: 32, borderRadius: 5, background: "var(--c-border-soft)", flexShrink: 0 }} />
                                      )}
                                      {/* Swap the name for "View Project" on hover — relative/absolute stack keeps
                                          both in the same box so the row's height never jumps between states. */}
                                      <span style={{ position: "relative", flex: 1, minWidth: 0, height: 16 }}>
                                        <span
                                          className="transition-opacity duration-150 group-hover:opacity-0"
                                          style={{ position: "absolute", inset: 0, fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--c-text)", fontWeight: 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                                        >
                                          {p.name}
                                        </span>
                                        <span
                                          className="opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                                          style={{ position: "absolute", inset: 0, fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--c-teal)", letterSpacing: "0.04em", whiteSpace: "nowrap" }}
                                        >
                                          View Project
                                        </span>
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Section 4 — Core Strengths */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.53 }}
          className="mb-14 pb-14 border-b"
          style={{ borderColor: "var(--c-border-soft)" }}
        >
          <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
            {cms.skillsHeading || "Core Strengths"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {cms.skills.map((group) => (
              <div key={group.title} className="text-left">
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "16px", color: "var(--c-teal)", fontWeight: 600, marginBottom: "12px" }}>
                  {group.title}
                </h3>
                <div className="flex flex-col">
                  {group.skills.map((skill, si) => (
                    <span
                      key={`${skill}-${si}`}
                      style={{
                        fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--c-text-muted)", fontWeight: 300,
                        padding: "10px 0",
                        borderBottom: si < group.skills.length - 1 ? "1px solid var(--c-border-soft)" : "none",
                      }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Section 4b — Skill Network — same cms.skills data as Core Strengths above, just an
            interactive visualization of it; nothing separate to maintain. */}
        {!cms.skillNetworkHidden && cms.skills.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.54 }}
            className="mb-14 pb-14 border-b"
            style={{ borderColor: "var(--c-border-soft)" }}
          >
            <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
              {cms.skillNetworkHeading || "Skill Network"}
            </h2>
            <SkillNetwork groups={cms.skills} />
          </motion.div>
        )}

        {/* Section 5 — Clients & Companies */}
        {!cms.clientsHidden && cms.clients && cms.clients.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="mb-14 pb-14 border-b"
            style={{ borderColor: "var(--c-border-soft)" }}
          >
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
              {cms.clientsHeading || "Clients & Companies"}
            </p>
            <ClientsSlider clients={cms.clients} speed={cms.clientSliderSpeed} />
          </motion.div>
        )}

        {/* Section 5 — Education & Qualifications */}
        <motion.div
          id="qualifications"
          ref={qualificationsRef}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-14 pb-14 border-b"
          style={{ borderColor: "var(--c-border-soft)", scrollMarginTop: TOP_BAR_HEIGHT + 16 }}
        >
          <h2 style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
            {cms.qualificationsHeading || "Education & Qualifications"}
          </h2>
          {/* Flush divided list — same table-like row treatment as Professional Experience
              (date column, title as the primary heading with institution/major/minor below),
              instead of individually bordered/backgrounded cards. */}
          <div className="mb-6" style={{ borderTop: "0.5px solid var(--c-divider)" }}>
            {cms.qualifications.map((q, i) => {
              const subtitle = [q.org, q.major && `Major: ${q.major}`, q.minor && `Minor: ${q.minor}`]
                .filter(Boolean)
                .join(" — ");
              return (
                <div key={i} className="flex flex-col md:flex-row md:items-start gap-1 md:gap-6 py-5" style={{ borderBottom: "0.5px solid var(--c-divider)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--c-text-muted)", whiteSpace: "nowrap", flexShrink: 0, width: 110 }}>
                    {q.year}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "18px", color: "var(--c-text)", fontWeight: 400, marginBottom: "3px" }}>
                      {q.title}
                    </h3>
                    {subtitle && (
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--c-text-muted)", fontWeight: 300 }}>
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
              Additional Background
            </p>
            <div className="flex flex-wrap gap-2">
              {cms.additional.map((a) => (
                <span
                  key={a}
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "12px",
                    color: "var(--c-text)",
                    border: "1px solid rgba(20,173,181,0.2)",
                    borderRadius: 0,
                    padding: "6px 14px",
                    background: "rgba(20,173,181,0.05)",
                  }}
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Section 6 — Testimonials */}
        <motion.div
          id="testimonials"
          ref={testimonialsRef}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="mb-14 pb-14 border-b"
          style={{ borderColor: "var(--c-border-soft)", scrollMarginTop: TOP_BAR_HEIGHT + 16 }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
            {cms.testimonialsHeading || "Why Teams Like Working With Me"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cms.testimonials.map((t, i) => (
              <div
                key={i}
                className="rounded-xl p-6"
                style={{ background: "var(--c-bg-card)", border: "1px solid var(--c-border-soft)" }}
              >
                {t.eyebrow ? (
                  // A fact about what Jai was trusted to do, not a quote from someone else — no
                  // name attribution, so it never reads as a quote from a named person. The
                  // eyebrow caption sits right above the tags (mirroring where the testimonial
                  // branch's Role/Company caption lands below) so the headline + copy — the
                  // actual substance — leads the card instead.
                  <>
                    {t.headline && (
                      <p style={{ fontFamily: "var(--font-heading)", fontSize: "16px", color: "var(--c-text)", fontWeight: 500, marginBottom: "12px" }}>
                        {t.headline}
                      </p>
                    )}
                    <div
                      className={`rte-content testimonial-card-body ${t.quoteMobile ? "hidden md:block" : ""}`}
                      style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--c-text-muted)", lineHeight: 1.6, marginBottom: "30px" }}
                      dangerouslySetInnerHTML={{ __html: t.quote }}
                    />
                    {t.quoteMobile && (
                      <div
                        className="rte-content testimonial-card-body block md:hidden"
                        style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--c-text-muted)", lineHeight: 1.6, marginBottom: "30px" }}
                        dangerouslySetInnerHTML={{ __html: t.quoteMobile }}
                      />
                    )}
                    <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
                      {t.eyebrow}
                    </p>
                  </>
                ) : (
                  <>
                    <div
                      className={`rte-content quote-color-fix testimonial-card-body ${t.quoteMobile ? "hidden md:block" : ""}`}
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "13px",
                        color: "var(--c-quote-emphasis)",
                        lineHeight: 1.6,
                        marginBottom: "30px",
                      }}
                      dangerouslySetInnerHTML={{ __html: t.quote }}
                    />
                    {t.quoteMobile && (
                      <div
                        className="rte-content quote-color-fix testimonial-card-body block md:hidden"
                        style={{
                          fontFamily: "var(--font-body)",
                          fontSize: "13px",
                          color: "var(--c-quote-emphasis)",
                          lineHeight: 1.6,
                          marginBottom: "30px",
                        }}
                        dangerouslySetInnerHTML={{ __html: t.quoteMobile }}
                      />
                    )}
                    <div className="flex items-center gap-2.5" style={{ marginBottom: (t.role || t.company) ? "4px" : "12px" }}>
                      {t.photoUrl && (
                        <img
                          src={t.photoUrl}
                          alt=""
                          width={36}
                          height={36}
                          style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }}
                        />
                      )}
                      <p className="flex items-center gap-1.5" style={{ fontFamily: "var(--font-heading)", fontSize: "16px", color: "var(--c-text)", fontWeight: 500, margin: 0 }}>
                        <span>{t.name}</span>
                        {t.linkedInUrl && (
                          <a href={t.linkedInUrl} target="_blank" rel="noopener noreferrer" aria-label={`${t.name} on LinkedIn`} className="hover:opacity-70 transition-opacity" style={{ display: "inline-flex", color: "var(--c-teal)", flexShrink: 0 }}>
                            <FaLinkedin size={13} />
                          </a>
                        )}
                      </p>
                    </div>
                    {(t.role || t.company) && (
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
                        {t.role && t.company ? `${t.role} at ${t.company}` : t.role || t.company}
                      </p>
                    )}
                  </>
                )}
                <div className="flex flex-wrap gap-2">
                  {t.highlights.map((h, hi) => (
                    <span
                      key={`${h}-${hi}`}
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "11px",
                        color: "var(--c-teal)",
                        border: "1px solid rgba(20,173,181,0.2)",
                        borderRadius: 999,
                        padding: "6px 14px",
                        background: "rgba(20,173,181,0.05)",
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Section 6.5 — FAQ. Gated on the faqSectionEnabled master switch (not just "are there
            any published items") — matches the same gate the FAQPage JSON-LD in
            evaluate/page.tsx checks, so the section and its structured data can never disagree
            about whether this content is actually live. Individually-published items only, so
            drafted questions don't appear the moment the master switch flips. */}
        {cms.faqSectionEnabled && publishedFaqs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.68 }}
            className="mb-14 pb-14 border-b"
            style={{ borderColor: "var(--c-border-soft)" }}
          >
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
              {cms.faqHeading || "Frequently Asked Questions"}
            </p>
            {faqLayoutMode === "tabs" && (() => {
              const tabIds = ["all", ...nonEmptyFaqCategories.map((c) => c.id)];
              return (
                <div
                  role="tablist"
                  aria-label="FAQ categories"
                  className="flex gap-2 overflow-x-auto"
                  style={{ marginBottom: 20, paddingBottom: 4 }}
                >
                  {tabIds.map((id, ti) => {
                    const label = id === "all" ? "All" : nonEmptyFaqCategories.find((c) => c.id === id)?.name ?? "";
                    const active = activeFaqTab === id;
                    return (
                      <button
                        key={id}
                        role="tab"
                        data-faq-tab={id}
                        aria-selected={active}
                        aria-controls="faq-tabpanel"
                        id={`faq-tab-${id}`}
                        tabIndex={active ? 0 : -1}
                        onClick={() => selectFaqTab(id)}
                        onKeyDown={(e) => handleFaqTabKeyDown(e, tabIds, ti)}
                        style={{
                          flexShrink: 0,
                          fontFamily: "var(--font-mono)",
                          fontSize: 12,
                          letterSpacing: "0.04em",
                          padding: "9px 16px",
                          borderRadius: 999,
                          cursor: "pointer",
                          background: active ? "rgba(20,173,181,0.15)" : "var(--c-bg-card)",
                          border: `1px solid ${active ? "rgba(20,173,181,0.4)" : "var(--c-border-soft)"}`,
                          color: active ? "var(--c-teal)" : "var(--c-text-muted)",
                          transition: "all 0.2s ease",
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              );
            })()}
            <div
              ref={faqGridRef}
              className="flex gap-3 items-start"
              style={faqLayoutMode === "tabs" ? { minHeight: faqAllHeight } : undefined}
              {...(faqLayoutMode === "tabs" ? { role: "tabpanel" as const, id: "faq-tabpanel", "aria-labelledby": `faq-tab-${activeFaqTab}` } : {})}
            >
              {faqColumnGroups.map((col, ci) => (
                <div key={ci} className="flex flex-col gap-3" style={{ flex: 1, minWidth: 0 }}>
                  {col.map(({ faq, idx }) => (
                    <div
                      key={faq.id}
                      className="rounded-xl border overflow-hidden"
                      style={{
                        background: "var(--c-bg-card)",
                        borderColor: openFaqs.has(idx) ? "rgba(20,173,181,0.25)" : "var(--c-border-soft)",
                        transition: "border-color 0.3s",
                      }}
                    >
                      <button
                        className="w-full text-left flex items-center justify-between gap-4 p-5"
                        onClick={() => toggleFaq(idx)}
                      >
                        <span style={{ fontFamily: "var(--font-heading)", fontSize: "15px", color: "var(--c-text)", fontWeight: 400 }}>
                          {faq.question}
                        </span>
                        <motion.div animate={{ rotate: openFaqs.has(idx) ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0 }}>
                          <ChevronDown size={15} style={{ color: "var(--c-text-muted)" }} />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {openFaqs.has(idx) && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div
                              className={`rte-content ${faq.answerMobile ? "hidden md:block" : ""}`}
                              style={{ padding: "0 20px 20px", fontSize: "13.5px", color: "var(--c-text-muted)" }}
                              dangerouslySetInnerHTML={{ __html: faq.answer }}
                            />
                            {faq.answerMobile && (
                              <div
                                className="rte-content block md:hidden"
                                style={{ padding: "0 20px 20px", fontSize: "13.5px", color: "var(--c-text-muted)" }}
                                dangerouslySetInnerHTML={{ __html: faq.answerMobile }}
                              />
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {!showAllFaqs && tabFilteredFaqs.length > faqVisibleCount && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
                <button
                  onClick={() => setShowAllFaqs(true)}
                  className="hover:opacity-70 transition-opacity"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.06em", color: "var(--c-text)", background: "none", border: "0.5px solid var(--c-border-med)", borderRadius: 999, padding: "11px 24px", cursor: "pointer" }}
                >
                  Show All
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* Section 7 — Beyond Design */}
        {!cms.beyondDesignHidden && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-14 pb-14 border-b"
            style={{ borderColor: "var(--c-border-soft)" }}
          >
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px" }}>
              {cms.beyondDesignHeading || "Beyond Design"}
            </p>
            <div
              className={cms.beyondDesignMobile ? "rte-content hidden md:block" : "rte-content"}
              style={{ fontSize: "16px", color: "var(--c-text-body)", maxWidth: "600px" }}
              dangerouslySetInnerHTML={{ __html: cms.beyondDesign }}
            />
            {cms.beyondDesignMobile && (
              <div
                className="rte-content block md:hidden"
                style={{ fontSize: "16px", color: "var(--c-text-body)", maxWidth: "600px" }}
                dangerouslySetInnerHTML={{ __html: cms.beyondDesignMobile }}
              />
            )}
          </motion.div>
        )}

      </div>

      {/* Sits outside the px-8 wrapper above — PathCTA's own full-mode layout applies its own
          px-8 md:px-16 padding (matching how the other 3 experience pages render it), so
          nesting it inside this page's padding too was doubling the horizontal inset and
          making the CTA/form noticeably narrower than the rest of the page's content. */}
      <PathCTA currentPath="recruit" onNavigate={onNavigate} />
    </motion.div>
  );
}
