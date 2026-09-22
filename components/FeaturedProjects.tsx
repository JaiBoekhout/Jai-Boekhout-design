"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { getImageProps } from "next/image";
import type { CMSProject } from "@/store/contentStore";
import { useContentStore, resolveLinkedCaseStudy, projectUrlSlug, DEFAULT_LOGO_URL } from "@/store/contentStore";
import { ProjectCard, ProjectCardPlaceholder } from "@/components/ProjectCard";

const TEAL = "var(--c-teal)";
const GRID_SIZE = 9;

// Warms the browser's cache for a project's hero image before its page/modal ever mounts —
// called on card hover/focus, well before a click. Computes the exact optimized URL next/image
// would request (same src/fill/sizes the popup uses) via getImageProps, rather than prefetching
// the raw original file, so the request that lands is the same small resized one the popup will
// actually use. A plain hidden Image() (not the React component) is enough to trigger the fetch.
function prefetchHeroImage(src: string | null | undefined) {
  if (!src || typeof window === "undefined") return;
  const { props } = getImageProps({
    src,
    alt: "",
    fill: true,
    sizes: "(min-width: 1024px) 44vw, 100vw",
  });
  const img = new window.Image();
  img.src = props.src;
}

export interface FeaturedProjectsProps {
  featured: CMSProject[];
  more: CMSProject[];
}

// The 9-card featured grid + filterable "view more" list. Every project links to its own real
// /work/[slug] URL — a same-app click gets intercepted into the modal popup (see
// app/(public)/(experience)/work/@modal), while a hard navigation, refresh, or crawler lands on
// the full page at work/[slug]/page.tsx. This component itself no longer owns any popup/case
// study/lock-gate state; all of that now lives at the route level (ProjectModalView/
// ProjectPageView and friends), reached via these links.
export function FeaturedProjects({ featured, more }: FeaturedProjectsProps) {
  const [listOpen, setListOpen]       = useState(false);
  const [featuredFilter, setFeaturedFilter] = useState("All");
  const { content } = useContentStore();

  // Only show published (or legacy undefined) projects on the live site
  const publishedFeatured = featured.filter((p) => !p.status || p.status === "published");
  const publishedMore     = more.filter((p) => !p.status || p.status === "published");

  function findLinkedCaseStudy(proj: CMSProject) {
    return resolveLinkedCaseStudy(proj, content.work.caseStudies) ?? null;
  }

  // Category filter bar over the featured grid — a small curated taxonomy the admin maintains
  // directly (Work tab → Featured Grid → Filter Categories). Drives both the featured grid AND
  // the collapsible "more" list below (previously the "more" list had its own separate freeform-
  // tag filter; removed in favour of one filter for the whole page). Categories are only listed
  // here if at least one published project anywhere — featured or "more" — actually has it, so
  // there's nothing to click that would only ever show an empty result.
  const projectCategories = [...(content.work.projectCategories ?? [])].sort((a, b) => a.order - b.order);
  const categoryNameById = new Map(projectCategories.map((c) => [c.id, c.name]));
  const nonEmptyCategories = projectCategories.filter((c) =>
    publishedFeatured.some((p) => p.categories?.includes(c.id)) || publishedMore.some((p) => p.categories?.includes(c.id))
  );
  const filteredFeatured = featuredFilter === "All"
    ? publishedFeatured
    : publishedFeatured.filter((p) => p.categories?.includes(featuredFilter));
  const rows = featuredFilter === "All"
    ? publishedMore
    : publishedMore.filter((p) => p.categories?.includes(featuredFilter));

  // Pad to 9 slots only in the unfiltered view
  const slots: (CMSProject | null)[] = featuredFilter === "All"
    ? [
        ...publishedFeatured.slice(0, GRID_SIZE),
        ...Array.from({ length: Math.max(0, GRID_SIZE - publishedFeatured.length) }, () => null),
      ]
    : filteredFeatured;

  // Sitewide total — the denominator always reflects every published project on the page; the
  // numerator narrows to whatever matches the active category, across both the grid and the
  // list. In the unfiltered, list-collapsed state, the "more" list's projects aren't actually
  // rendered yet (they're behind "View more projects"), so the numerator only counts the grid's
  // own visible cards — otherwise it reads as "13 of 13" while only 9 cards are on screen.
  const totalProjectCount = publishedFeatured.length + publishedMore.length;
  const visibleProjectCount =
    featuredFilter !== "All" ? filteredFeatured.length + rows.length
    : listOpen ? totalProjectCount
    : slots.filter(Boolean).length;
  const projectListLayout  = content.work.projectListLayout ?? "list";
  const projectListColumns = content.work.projectListColumns ?? 4;
  const projectListRows    = content.work.projectListRows ?? 3;
  // One row is one project in List view, or one grid row (projectListColumns cards) in Card
  // view — used both for the initial page size and for how much "Load more" reveals each time.
  const rowIncrement = projectListLayout === "card" ? projectListRows * projectListColumns : projectListRows;
  const [visibleCount, setVisibleCount] = useState(rowIncrement);
  useEffect(() => { setVisibleCount(rowIncrement); }, [featuredFilter, rowIncrement]);
  const visibleRows = rows.slice(0, visibleCount);

  return (
    <div>
      {/* ── Featured filter bar ──────────────────────────────────────────────
          Only rendered when at least one curated category actually has a matching
          featured project — an empty taxonomy (or one where nothing's assigned
          yet) would make filtering a no-op. */}
      {nonEmptyCategories.length > 0 && (
        <div
          className="flex items-center justify-between flex-wrap gap-3"
          style={{
            marginBottom: 22, position: "sticky", top: 70, zIndex: 30,
            background: "var(--c-bg)", paddingTop: 10, paddingBottom: 10,
          }}
        >
          {/* flex-nowrap + overflow-x-auto below md: on a narrow screen, enough categories (this
              taxonomy has grown to 9) wrapped to 3-4 rows tall enough to visually collide with
              the fixed-position bottom "Current Path" nav at first paint, before any scroll had
              happened to move the sticky version of this bar out of the way. A horizontally
              scrolling single row avoids that regardless of how many categories exist, and is
              the more standard mobile pattern for a long filter chip list anyway. */}
          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto md:flex-wrap md:overflow-visible" style={{ paddingBottom: 2 }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", letterSpacing: "0.14em", color: "var(--c-text-dim)", textTransform: "uppercase", marginRight: 4, flexShrink: 0 }}>
              Filter:
            </span>
            {[{ id: "All", name: "All" }, ...nonEmptyCategories].map((c) => {
              const active = featuredFilter === c.id;
              return (
                <button key={c.id} onClick={() => setFeaturedFilter(c.id)}
                  className="transition-all"
                  style={{
                    fontFamily: "var(--font-mono)", fontSize: 11.5, letterSpacing: "0.03em",
                    padding: "7px 15px", borderRadius: 0, cursor: "pointer", flexShrink: 0,
                    background: active ? TEAL : "transparent",
                    color: active ? "#0C1117" : "var(--c-text-50)",
                    border: active ? "0.5px solid transparent" : "0.5px solid var(--c-border-med)",
                  }}>
                  {c.name}
                </button>
              );
            })}
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em", color: "var(--c-text-40)", whiteSpace: "nowrap" }}>
            {visibleProjectCount} of {totalProjectCount}
          </span>
        </div>
      )}

      {/* ── Featured grid ─────────────────────────────────────────────────── */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {slots.map((p, i) => {
          if (!p) return <ProjectCardPlaceholder key={`ph-${i}`} index={i} />;

          // Resolve cover source once — same priority as the image block uses
          const cardCS = findLinkedCaseStudy(p);
          const fromCS = !!cardCS?.coverImageUrl;
          const names = (p.categories ?? [])
            .map((id) => categoryNameById.get(id))
            .filter((n): n is string => !!n)
            .slice(0, 2);

          return (
            <ProjectCard
              key={p.id}
              project={p}
              cover={{
                src: cardCS?.coverImageUrl || p.coverImageUrl || p.imgs?.[0] || null,
                position: (fromCS ? cardCS.coverImagePosition : p.coverImagePosition) || "center",
                scale: (fromCS ? cardCS.coverImageScale : p.coverImageScale) ?? 1,
                hoverSrc: fromCS ? cardCS.coverImageHoverUrl : p.coverImageHoverUrl,
                hoverPosition: (fromCS ? cardCS.coverImageHoverPosition : p.coverImageHoverPosition) || "center",
                hoverScale: (fromCS ? cardCS.coverImageHoverScale : p.coverImageHoverScale) ?? 1,
              }}
              labels={names}
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              href={`/work/${projectUrlSlug(p)}`}
              onMouseEnter={() => prefetchHeroImage(p.heroImageUrl ?? p.imgs?.[0])}
              onFocus={() => prefetchHeroImage(p.heroImageUrl ?? p.imgs?.[0])}
            />
          );
        })}
      </div>

      {/* ── View More toggle — hidden entirely when there's nothing beyond the featured
          grid, rather than opening onto an empty list ────────────────────────────── */}
      {publishedMore.length > 0 && (
        <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ width: "100%", height: "0.5px", background: "linear-gradient(to right, transparent, var(--c-divider), transparent)", marginBottom: -13 }} />
          <button
            onClick={() => setListOpen((v) => !v)}
            className="transition-all hover:border-[color-mix(in_srgb,var(--c-teal)_50%,transparent)] hover:text-[var(--c-text)]"
            style={{
              display: "inline-flex", alignItems: "center", gap: 11,
              fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.06em",
              color: "var(--c-text-70)", background: "var(--c-bg)",
              border: "0.5px solid var(--c-divider)", borderRadius: 0, padding: "13px 26px", cursor: "pointer",
            }}
          >
            <span>{listOpen ? "Close project list" : "View more projects"}</span>
            <span style={{ fontSize: 18, lineHeight: 1, transition: "transform 0.35s ease", transform: `rotate(${listOpen ? 180 : 0}deg)`, display: "inline-block" }}>⌄</span>
          </button>
        </div>
      )}

      {/* ── Project list ────────────────────────────────────────────────────── */}
      {listOpen && publishedMore.length > 0 && (
        <div style={{ marginTop: 38, animation: "fadeUp 0.4s ease both" }}>
          {rows.length === 0 ? (
            <div style={{ border: "0.5px dashed rgba(237,232,223,0.12)", borderRadius: 12, padding: "64px 24px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.1em", color: "var(--c-text-40)", marginBottom: 10 }}>
                {featuredFilter === "All" ? "No additional projects yet." : `No projects match "${categoryNameById.get(featuredFilter) ?? featuredFilter}"`}
              </div>
              {featuredFilter !== "All" && (
                <button onClick={() => setFeaturedFilter("All")} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: TEAL, background: "none", border: "none", cursor: "pointer" }}>Clear filter →</button>
              )}
            </div>
          ) : projectListLayout === "card" ? (
            // Same card layout/markup as the Featured Grid above (image on a fixed 16/9 top,
            // copy in its own panel below rather than overlaid) — only the grid itself differs,
            // sized by the CMS's "cards per row" setting via --plg-cols instead of the Featured
            // Grid's fixed 3-column cap.
            <div className="project-list-grid" style={{ ["--plg-cols" as string]: projectListColumns, gap: "0.625rem" }}>
              {visibleRows.map((p) => {
                const cardCS = findLinkedCaseStudy(p);
                const cardFromCS = !!cardCS?.coverImageUrl;
                const colSizes = `(min-width: 1280px) ${Math.round(100 / projectListColumns)}vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw`;
                return (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    cover={{
                      src: cardCS?.coverImageUrl || p.coverImageUrl || p.imgs?.[0] || null,
                      position: (cardFromCS ? cardCS.coverImagePosition : p.coverImagePosition) || "center",
                      scale: (cardFromCS ? cardCS.coverImageScale : p.coverImageScale) ?? 1,
                      hoverSrc: cardFromCS ? cardCS.coverImageHoverUrl : p.coverImageHoverUrl,
                      hoverPosition: (cardFromCS ? cardCS.coverImageHoverPosition : p.coverImageHoverPosition) || "center",
                      hoverScale: (cardFromCS ? cardCS.coverImageHoverScale : p.coverImageHoverScale) ?? 1,
                    }}
                    labels={p.tags.slice(0, 2)}
                    sizes={colSizes}
                    href={`/work/${projectUrlSlug(p)}`}
                    onMouseEnter={() => prefetchHeroImage(p.heroImageUrl ?? p.imgs?.[0])}
                    onFocus={() => prefetchHeroImage(p.heroImageUrl ?? p.imgs?.[0])}
                  />
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {visibleRows.map((p) => {
                // Same cover-source priority as the Featured Grid cards above
                const rowCS = findLinkedCaseStudy(p);
                const rowFromCS = !!rowCS?.coverImageUrl;
                const rowCoverSrc = rowCS?.coverImageUrl || p.coverImageUrl || p.imgs?.[0] || null;
                const rowHoverSrc = rowFromCS ? rowCS.coverImageHoverUrl : p.coverImageHoverUrl;
                return (
                  <motion.div
                    key={p.id}
                    className="group relative flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-[22px] hover:bg-white/[0.02] transition-colors"
                    style={{ padding: 18, borderTop: "0.5px solid var(--c-divider)", outline: "none", boxShadow: "none", borderRadius: 0 }}
                  >
                    {/* Thumbnail + name/client — stays a row on every breakpoint */}
                    <div className="flex items-center gap-4 lg:flex-1 lg:min-w-0">
                      {rowCoverSrc ? (
                        <div style={{ position: "relative", width: 96, height: 64, flexShrink: 0 }}>
                          <img src={rowCoverSrc} alt={content.mediaMeta?.[rowCoverSrc]?.alt || p.name} style={{ width: 96, height: 64, borderRadius: 7, objectFit: "cover", border: "0.5px solid var(--c-border)", display: "block" }} />
                          {rowHoverSrc && (
                            <img
                              src={rowHoverSrc}
                              alt=""
                              aria-hidden="true"
                              className="absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
                              style={{ width: 96, height: 64, borderRadius: 7, objectFit: "cover", border: "0.5px solid var(--c-border)" }}
                            />
                          )}
                        </div>
                      ) : (
                        <div style={{ width: 96, height: 64, borderRadius: 7, flexShrink: 0, background: "var(--c-bg-card)", border: "0.5px solid var(--c-border)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={DEFAULT_LOGO_URL} alt="" style={{ width: "55%", opacity: 0.15, filter: "brightness(0) invert(1)" }} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.12em", color: TEAL, marginBottom: 5 }}>
                          {p.tags[0]}
                        </div>
                        <h2 style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em", marginBottom: 4, color: TEAL }}>{p.name}</h2>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--c-text-40)" }}>{p.client}</div>
                      </div>
                      {/* Arrow — inline here on mobile/tablet; moves to the row's end on desktop */}
                      <div className="lg:hidden" style={{ fontFamily: "var(--font-mono)", color: "var(--c-text-30)", fontSize: 16, flexShrink: 0 }}>→</div>
                    </div>

                    {/* Tags — wraps naturally full-width below on mobile/tablet, fixed-width grid beside on desktop */}
                    <div className="flex flex-wrap lg:grid lg:grid-cols-4 lg:justify-items-end gap-1.5 w-full lg:w-[520px]" style={{ flexShrink: 0 }}>
                      {p.tags.map((t, ti) => (
                        <span key={`${t}-${ti}`} style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.05em", color: "var(--c-text-50)", border: "0.5px solid var(--c-border-med)", borderRadius: 0, padding: "3px 9px", whiteSpace: "nowrap" }}>{t}</span>
                      ))}
                    </div>

                    <div className="hidden lg:block" style={{ fontFamily: "var(--font-mono)", color: "var(--c-text-30)", fontSize: 16, flexShrink: 0 }}>→</div>
                    <Link href={`/work/${projectUrlSlug(p)}`} aria-label={p.name} className="absolute inset-0" style={{ cursor: "pointer" }} />
                  </motion.div>
                );
              })}
              <div style={{ borderTop: "0.5px solid var(--c-divider)" }} />
            </div>
          )}

          {rows.length > visibleCount && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
              <button
                onClick={() => setVisibleCount((v) => v + rowIncrement)}
                className="hover:opacity-70 transition-opacity"
                style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.06em", color: "var(--c-text)", background: "none", border: "0.5px solid var(--c-border-med)", borderRadius: 0, padding: "11px 24px", cursor: "pointer" }}
              >
                Load more Projects
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
