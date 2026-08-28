"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import NextImage, { getImageProps } from "next/image";
import type { CMSProject } from "@/store/contentStore";
import { useContentStore, resolveLinkedCaseStudy, projectUrlSlug, DEFAULT_LOGO_URL } from "@/store/contentStore";
import { stripHtml } from "@/lib/utils";

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
  const [filter, setFilter]           = useState("All");
  const { content } = useContentStore();

  // Only show published (or legacy undefined) projects on the live site
  const publishedFeatured = featured.filter((p) => !p.status || p.status === "published");
  const publishedMore     = more.filter((p) => !p.status || p.status === "published");

  function findLinkedCaseStudy(proj: CMSProject) {
    return resolveLinkedCaseStudy(proj, content.work.caseStudies) ?? null;
  }

  // Pad to 9 slots
  const slots: (CMSProject | null)[] = [
    ...publishedFeatured.slice(0, GRID_SIZE),
    ...Array.from({ length: Math.max(0, GRID_SIZE - publishedFeatured.length) }, () => null),
  ];

  const allTags = ["All", ...Array.from(new Set(publishedMore.flatMap((p) => p.tags)))];
  const rows    = filter === "All" ? publishedMore : publishedMore.filter((p) => p.tags.includes(filter));
  const projectListLayout  = content.work.projectListLayout ?? "list";
  const projectListColumns = content.work.projectListColumns ?? 4;
  const projectListRows    = content.work.projectListRows ?? 3;
  // One row is one project in List view, or one grid row (projectListColumns cards) in Card
  // view — used both for the initial page size and for how much "Load more" reveals each time.
  const rowIncrement = projectListLayout === "card" ? projectListRows * projectListColumns : projectListRows;
  const [visibleCount, setVisibleCount] = useState(rowIncrement);
  useEffect(() => { setVisibleCount(rowIncrement); }, [filter, rowIncrement]);
  const visibleRows = rows.slice(0, visibleCount);

  return (
    <div>
      {/* ── Featured grid ─────────────────────────────────────────────────── */}
      <div className="relative grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {slots.map((p, i) => {
          // Resolve cover source once — same priority as the image block uses
          const cardCS = p ? findLinkedCaseStudy(p) : null;
          const cardCoverSrc = p ? (cardCS?.coverImageUrl || p.coverImageUrl || p.imgs?.[0] || null) : null;

          return (
            <div
              key={p?.id ?? `ph-${i}`}
              data-card
              className="group relative"
              style={{
                aspectRatio: "16/9",
                borderRadius: 16,
                background: "var(--c-bg-card)",
                border: "0.5px solid var(--c-border-soft)",
                outline: "none",
                boxShadow: "none",
              }}
            >
              {/* Inner clip so the cover image respects the card's rounded corners */}
              <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: "inherit" }}>
                {/* Cover image — prefers linked case study coverImageUrl, then project coverImageUrl, then imgs[0] */}
                {cardCoverSrc && p && (() => {
                  const fromCS = !!cardCS?.coverImageUrl;
                  const pos = (fromCS ? cardCS.coverImagePosition : p.coverImagePosition) || "center";
                  const scale = (fromCS ? cardCS.coverImageScale : p.coverImageScale) ?? 1;
                  const hoverSrc = fromCS ? cardCS.coverImageHoverUrl : p.coverImageHoverUrl;
                  const hoverPos = (fromCS ? cardCS.coverImageHoverPosition : p.coverImageHoverPosition) || "center";
                  const hoverScale = (fromCS ? cardCS.coverImageHoverScale : p.coverImageHoverScale) ?? 1;
                  return (
                    <>
                      <NextImage
                        src={cardCoverSrc}
                        alt={p.name}
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                        style={{
                          objectFit: "cover",
                          objectPosition: pos,
                          transform: `scale(${scale})`,
                          transformOrigin: pos,
                        }}
                      />
                      {hoverSrc && (
                        <NextImage
                          src={hoverSrc}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
                          style={{
                            objectFit: "cover",
                            objectPosition: hoverPos,
                            transform: `scale(${hoverScale})`,
                            transformOrigin: hoverPos,
                          }}
                        />
                      )}
                    </>
                  );
                })()}
                {/* Bottom gradient */}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to top, rgba(6,9,12,0.98) 0%, rgba(6,9,12,0.85) 32%, rgba(6,9,12,0.28) 62%, transparent 100%)", zIndex: 1 }}
                />
              </div>

              {/* No-image placeholder — shown whenever no cover source is configured in CMS */}
              {p && !cardCoverSrc && (
                <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 1 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={DEFAULT_LOGO_URL} alt="" style={{ width: "38%", maxWidth: 120, opacity: 0.12, filter: "brightness(0) invert(1)" }} />
                </div>
              )}

              {/* Card text */}
              {p && (
                <div className="absolute left-5 right-5 bottom-5" style={{ zIndex: 2, pointerEvents: "none" }}>
                  {/* Category */}
                  <div className="mb-2">
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.12em", color: TEAL, textTransform: "uppercase" }}>
                      {p.tags.slice(0, 2).join(" · ")}
                    </span>
                  </div>

                  {/* Name — 2-line clamp so a long title can never overflow the fixed-aspect card */}
                  <div style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: 17,
                    fontWeight: 500,
                    color: TEAL,
                    lineHeight: 1.2,
                    marginBottom: 7,
                    letterSpacing: "-0.01em",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {p.name}
                  </div>

                  {/* Description — 2-line clamp */}
                  <div style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.48)",
                    lineHeight: 1.55,
                    marginBottom: 11,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {stripHtml(p.desc)}
                  </div>

                  {/* VIEW PROJECT → */}
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em", color: TEAL, display: "flex", alignItems: "center", gap: 5 }}>
                    VIEW PROJECT <span>→</span>
                  </div>
                </div>
              )}

              {/* Full-card link — a same-app click is intercepted into the modal popup; a hard
                  nav/refresh/crawler lands on the real page. Sits above the gradient/text (which
                  are pointer-events:none) so the whole card is one click target. */}
              {p && (
                <Link
                  href={`/work/${projectUrlSlug(p)}`}
                  aria-label={p.name}
                  className="absolute inset-0"
                  style={{ zIndex: 3, borderRadius: "inherit", cursor: "pointer" }}
                  onMouseEnter={() => prefetchHeroImage(p.heroImageUrl ?? p.imgs?.[0])}
                  onFocus={() => prefetchHeroImage(p.heroImageUrl ?? p.imgs?.[0])}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── View More toggle ────────────────────────────────────────────────── */}
      <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: "100%", height: "0.5px", background: "linear-gradient(to right, transparent, var(--c-divider), transparent)", marginBottom: -13 }} />
        <button
          onClick={() => setListOpen((v) => !v)}
          className="transition-all hover:border-[rgba(20,173,181,0.5)] hover:text-[#EDE8DF]"
          style={{
            display: "inline-flex", alignItems: "center", gap: 11,
            fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.06em",
            color: "var(--c-text-70)", background: "var(--c-bg)",
            border: "0.5px solid var(--c-divider)", borderRadius: 999, padding: "13px 26px", cursor: "pointer",
          }}
        >
          <span>{listOpen ? "Close project list" : "View more projects"}</span>
          <span style={{ fontSize: 18, lineHeight: 1, transition: "transform 0.35s ease", transform: `rotate(${listOpen ? 180 : 0}deg)`, display: "inline-block" }}>⌄</span>
        </button>
      </div>

      {/* ── Project list ────────────────────────────────────────────────────── */}
      {listOpen && (
        <div style={{ marginTop: 38, animation: "fadeUp 0.4s ease both" }}>
          {allTags.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 24 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", letterSpacing: "0.14em", color: "var(--c-text-dim)", textTransform: "uppercase", marginRight: 6 }}>Filter</span>
              {allTags.map((t) => {
                const active = filter === t;
                return (
                  <button key={t} onClick={() => setFilter(t)}
                    style={{
                      fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em",
                      padding: "7px 14px", borderRadius: 999, cursor: "pointer", transition: "all 0.2s ease",
                      background: active ? "var(--c-text)" : "transparent",
                      color: active ? "var(--c-bg)" : "var(--c-text-50)",
                      border: active ? "0.5px solid var(--c-text)" : "0.5px solid rgba(237,232,223,0.16)",
                    }}>
                    {t}
                  </button>
                );
              })}
            </div>
          )}

          {rows.length === 0 ? (
            <div style={{ border: "0.5px dashed rgba(237,232,223,0.12)", borderRadius: 12, padding: "64px 24px", textAlign: "center" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, letterSpacing: "0.1em", color: "var(--c-text-40)", marginBottom: 10 }}>
                {filter === "All" ? "No additional projects yet." : `No projects match "${filter}"`}
              </div>
              {filter !== "All" && (
                <button onClick={() => setFilter("All")} style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: TEAL, background: "none", border: "none", cursor: "pointer" }}>Clear filter →</button>
              )}
            </div>
          ) : projectListLayout === "card" ? (
            <div className="project-list-grid" style={{ ["--plg-cols" as string]: projectListColumns, gap: 20 }}>
              {visibleRows.map((p) => {
                const cardCS = findLinkedCaseStudy(p);
                const cardFromCS = !!cardCS?.coverImageUrl;
                const cardCoverSrc = cardCS?.coverImageUrl || p.coverImageUrl || p.imgs?.[0] || null;
                const cardHoverSrc = cardFromCS ? cardCS.coverImageHoverUrl : p.coverImageHoverUrl;
                return (
                  <motion.div
                    key={p.id}
                    className="group relative"
                    style={{ aspectRatio: "4/3", borderRadius: 12, background: "var(--c-bg-card)" }}
                  >
                    {/* Inner clip so the cover image respects the card's rounded corners */}
                    <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: "inherit" }}>
                      {cardCoverSrc ? (
                        <>
                          <div
                            className="absolute inset-0 transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                            style={{ backgroundImage: `url(${cardCoverSrc})`, backgroundSize: "cover", backgroundPosition: "center" }}
                          />
                          {cardHoverSrc && (
                            <div
                              className="absolute inset-0 opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
                              style={{ backgroundImage: `url(${cardHoverSrc})`, backgroundSize: "cover", backgroundPosition: "center" }}
                            />
                          )}
                        </>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={DEFAULT_LOGO_URL} alt="" style={{ width: "30%", maxWidth: 90, opacity: 0.12, filter: "brightness(0) invert(1)" }} />
                        </div>
                      )}
                      <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,9,12,0.95) 0%, rgba(6,9,12,0.55) 42%, transparent 100%)" }} />
                      <div className="absolute left-4 right-4 bottom-4" style={{ pointerEvents: "none" }}>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.12em", color: TEAL, textTransform: "uppercase", marginBottom: 5 }}>
                          {p.tags[0]}
                        </div>
                        <div style={{
                          fontFamily: "var(--font-heading)", fontSize: 15, fontWeight: 500, color: TEAL, lineHeight: 1.25,
                          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                        }}>
                          {p.name}
                        </div>
                      </div>
                    </div>
                    <Link href={`/work/${projectUrlSlug(p)}`} aria-label={p.name} className="absolute inset-0" style={{ zIndex: 3, borderRadius: "inherit", cursor: "pointer" }} />
                  </motion.div>
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
                        <div style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 500, letterSpacing: "-0.01em", marginBottom: 4, color: TEAL }}>{p.name}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--c-text-40)" }}>{p.client}</div>
                      </div>
                      {/* Arrow — inline here on mobile/tablet; moves to the row's end on desktop */}
                      <div className="lg:hidden" style={{ fontFamily: "var(--font-mono)", color: "var(--c-text-30)", fontSize: 16, flexShrink: 0 }}>→</div>
                    </div>

                    {/* Tags — wraps naturally full-width below on mobile/tablet, fixed-width grid beside on desktop */}
                    <div className="flex flex-wrap lg:grid lg:grid-cols-4 lg:justify-items-end gap-1.5 w-full lg:w-[520px]" style={{ flexShrink: 0 }}>
                      {p.tags.map((t, ti) => (
                        <span key={`${t}-${ti}`} style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.05em", color: "var(--c-text-50)", border: "0.5px solid rgba(152,151,147,0.35)", borderRadius: 999, padding: "3px 9px", whiteSpace: "nowrap" }}>{t}</span>
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
                style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.06em", color: "var(--c-text)", background: "none", border: "0.5px solid var(--c-border-med)", borderRadius: 999, padding: "11px 24px", cursor: "pointer" }}
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
