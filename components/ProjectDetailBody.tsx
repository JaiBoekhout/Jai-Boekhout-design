"use client";

import { useState, useEffect, useMemo, useRef, type KeyboardEvent, type CSSProperties } from "react";
import NextImage from "next/image";
import Link from "next/link";
import { ArrowLeft, X } from "lucide-react";
import type { CMSProject } from "@/store/contentStore";
import { useContentStore, projectUrlSlug } from "@/store/contentStore";
import { CompanyCredit } from "@/components/CompanyCredit";
import { MissingImagePlaceholder } from "@/components/MissingImagePlaceholder";
import { buildHeroOverlayGradient, PROJECT_HERO_OVERLAY_DEFAULTS } from "@/components/HeroOverlayFields";
import { stripHtml } from "@/lib/utils";

const TAG_STYLE: CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.1em",
  color: "var(--c-teal)", background: "transparent", textTransform: "uppercase",
  border: "0.5px solid rgba(20,173,181,0.45)", borderRadius: 0,
  padding: "4px 11px",
};

// Same tag treatment as TAG_STYLE, but for sitting directly on the hero photo overlay — fixed
// light colors instead of the themed teal/var(--c-text), since the photo is always dark
// regardless of the site's light/dark mode.
const OVERLAY_TAG_STYLE: CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.1em",
  color: "#F5F1EA", background: "rgba(15,21,25,0.35)", textTransform: "uppercase",
  border: "0.5px solid rgba(245,241,234,0.4)", borderRadius: 0,
  padding: "4px 11px",
};

const TEAL = "var(--c-teal)";

// Shared heading style for every named section in the details column (Summary, Role, the 3
// admin-labelled rich-text sections, View More Projects) — pulled out once so it's obviously the
// same treatment everywhere rather than five copies that could quietly drift apart.
const SECTION_HEADING_STYLE: CSSProperties = {
  fontFamily: "var(--font-mono)", fontSize: 25, letterSpacing: "0.14em", color: TEAL,
  textTransform: "uppercase", marginTop: 40, marginBottom: 10, fontWeight: 700,
};

// Contents nav clears the sticky top bar by a different amount depending on mode — a modal's
// details column scrolls inside its own bounded row (ProjectDetailChrome's h-full lg:overflow-
// hidden split), while page mode is the real, normally-scrolling document with a persistent
// header the hero itself already clears via lg:top-16 (64px).
function contentsNavTopOffset(mode: "modal" | "page") {
  return mode === "page" ? 80 : 12;
}

// A next/image `fill` that starts invisible and fades in on its own load, instead of popping in
// the instant it's decoded — used anywhere a batch of images can appear together (the gallery,
// View More) so the reveal reads as deliberate rather than as a layout hiccup. Deliberately not
// a slower fetch (that would undo the actual perf work); the fetch stays exactly as fast as
// next/image already makes it, only the reveal is paced.
function FadeInImage({ src, alt, sizes, objectPosition = "center", scale = 1, className }: { src: string; alt: string; sizes: string; objectPosition?: string; scale?: number; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // A cached image can finish loading before this component's onLoad listener is ever attached
  // — the browser resolves it synchronously from cache and `.complete` is already true the
  // moment this mounts, so the `load` event that would normally flip `loaded` never fires at
  // all. A ref-callback checked at attach time is too early here (next/image hasn't applied the
  // real src/srcset to the underlying <img> yet at that point) — checking again after mount, once
  // next/image's own effects have had a chance to run, is what actually catches the cached case.
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setLoaded(true);
  }, [src]);
  return (
    <NextImage
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      ref={imgRef}
      style={{
        objectFit: "cover",
        objectPosition,
        transform: `scale(${scale})`,
        transformOrigin: objectPosition,
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
      onLoad={() => setLoaded(true)}
    />
  );
}

export interface ProjectDetailBodyProps {
  project: CMSProject;
  /** Modal: hero fills the fixed-height popup panel, page never scrolls as a unit (the panel's
   *  own overflow-hidden row does the pinning). Page: a real, normally-scrolling document — the
   *  hero instead sticks to the viewport (below the persistent top bar) while the details column
   *  scrolls past underneath, matching the same "hero stays put" feel by a different mechanism. */
  mode: "modal" | "page";
  onClose: () => void;
  onSelectProject: (id: string) => void;
  onOpenLightbox: (src: string) => void;
  viewMoreProjects: CMSProject[];
  showExtras: boolean;
  openAttributionId: string | null;
  onToggleAttribution: (id: string | null) => void;
}

// The popup's content — hero image (with the tall-hero scroll-hint) plus the scrollable details
// column (tags/title/desc/outcomes/buttons/view-more grid). Keyed off `project.id` by the caller
// (ProjectDetailChrome remounts per project), so every hook below resets cleanly per project.
export function ProjectDetailBody({
  project, mode, onClose, onSelectProject, onOpenLightbox, viewMoreProjects, showExtras, openAttributionId, onToggleAttribution,
}: ProjectDetailBodyProps) {
  const { content } = useContentStore();

  // project arrives already enriched (via enrichProjectWithCaseStudy, called upstream by
  // getPublishedProjects/getPublishedProjectBySlug) — its own coverImageUrl already carries
  // whatever a linked case study set, so no separate lookup is needed here.
  // Used as the top banner source (see the return below) — a short, fixed-height strip, not the
  // tall side-panel this page used to have, so there's no "tall image" crop-skipping/scroll-hint
  // machinery to worry about here anymore.
  const heroSrc = project.heroImageUrl ?? project.imgs[0];
  const coverSrc = project.coverImageUrl || project.imgs?.[0] || null;

  // Role/Contents-nav — every project now gets the same optional sections (previously exclusive
  // to a separate "full case study" page); each is hidden unless it actually has content, and the
  // side nav itself only shows once there's enough of them to be worth navigating (Summary/
  // Gallery/Outcomes alone don't warrant it — see showContentsNav below).
  const roleCards = useMemo(
    () =>
      [
        { key: "role", label: "Role", value: project.fullCaseStudyRole },
        { key: "client", label: "Client", value: project.client },
        { key: "platform", label: "Platform", value: project.fullCaseStudyPlatform },
        { key: "scope", label: "Scope", value: project.fullCaseStudyScope },
      ].filter((c) => c.value && c.value.trim().length > 0),
    [project.fullCaseStudyRole, project.client, project.fullCaseStudyPlatform, project.fullCaseStudyScope]
  );
  const showRole = !!(project.fullCaseStudyRole || project.fullCaseStudyPlatform || project.fullCaseStudyScope);
  const showSection1 = !!project.fullContent;
  const showSection2 = !!project.fullCaseStudyContent;
  const showSection3 = !!project.section3Content;
  const showContentsNav = showRole || showSection1 || showSection2 || showSection3;

  const navItems = useMemo(
    () =>
      [
        showRole && { id: "role", label: "Role" },
        showSection1 && { id: "section1", label: project.section1Heading || "Project Detail" },
        showSection2 && { id: "section2", label: project.section2Heading || "Process" },
        // Section 3 has no heading fallback — with nothing to label the nav entry, the content
        // still renders inline on the page, just without its own jump-to link.
        showSection3 && project.section3Heading && { id: "section3", label: project.section3Heading },
      ].filter(Boolean) as { id: string; label: string }[],
    [showRole, showSection1, showSection2, showSection3, project.section1Heading, project.section2Heading, project.section3Heading]
  );

  const [activeId, setActiveId] = useState<string | undefined>(navItems[0]?.id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const navTopOffset = contentsNavTopOffset(mode);

  useEffect(() => {
    if (!showContentsNav) return;
    const ids = ["role", "section1", "section2", "section3"];
    const els = ids.map((id) => sectionRefs.current[id]).filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        const id = topMost.target.getAttribute("data-section-id");
        if (id) setActiveId(id);
      },
      { rootMargin: `-${navTopOffset + 12}px 0px -65% 0px`, threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showContentsNav, project.id]);

  function scrollToSection(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Back control + num/tag badge — shared between the overlaid banner header (hero present) and
  // the plain fallback header (no hero). Page mode's back link shows at every breakpoint (no
  // separate mobile bar in page mode — see ProjectDetailChrome's page branch); modal mode's back
  // button stays desktop-only, since ProjectDetailChrome already renders a mobile/tablet
  // back+close bar of its own for modal mode.
  const backAndBadge = (
    <div className={`${mode === "page" ? "flex" : "hidden lg:flex"} items-center gap-3`}>
      {mode === "page" ? (
        <Link
          href="/work"
          className="hover:opacity-80 transition-opacity"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em",
            color: TEAL, background: "rgba(6,9,12,0.75)",
            border: "0.5px solid rgba(20,173,181,0.4)", borderRadius: 0,
            padding: "7px 13px", textDecoration: "none",
          }}
        >
          <ArrowLeft size={12} /> Back to Work
        </Link>
      ) : (
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
          style={{
            fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em",
            color: "#0C1117", background: TEAL, border: "none", borderRadius: 0,
            padding: "7px 12px", cursor: "pointer",
          }}
        >
          <ArrowLeft size={11} /> Back to Projects
        </button>
      )}
      <div style={{
        fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em",
        color: TEAL, background: "rgba(6,9,12,0.75)",
        border: "0.5px solid rgba(20,173,181,0.4)", borderRadius: 0,
        padding: "5px 13px",
      }}>
        {project.num} — {project.tags[0]?.toUpperCase()}
      </div>
    </div>
  );

  // Overlaid version (on the photo banner) needs fixed light colors regardless of site theme;
  // the no-hero fallback sits on the page's own themed background and keeps the original
  // theme-aware subtle-circle treatment.
  const closeButtonOverlay = (
    <button
      onClick={onClose}
      aria-label="Close"
      data-popup-close
      className="hidden lg:flex hover:opacity-60 transition-opacity items-center justify-center"
      style={{ width: 34, height: 34, borderRadius: "50%", border: "0.5px solid rgba(245,241,234,0.3)", background: "rgba(15,21,25,0.45)", color: "#F5F1EA", cursor: "pointer", flexShrink: 0 }}
    >
      <X size={14} />
    </button>
  );
  const closeButtonPlain = (
    <button
      onClick={onClose}
      aria-label="Close"
      data-popup-close
      className="hidden lg:flex hover:opacity-60 transition-opacity items-center justify-center"
      style={{ width: 34, height: 34, borderRadius: "50%", border: "0.5px solid var(--c-border-med)", background: "var(--c-surface-4)", color: "var(--c-text)", cursor: "pointer", flexShrink: 0 }}
    >
      <X size={14} />
    </button>
  );

  return (
    <div className="flex-1 lg:overflow-y-auto relative" style={{ minWidth: 0 }}>
      {/* Top banner — a tall, hero-style strip with the num/tag badge, credit line, title and
          tags overlaid bottom-left directly on the photo (matching the reference case-study
          layout), instead of the old plain banner-then-copy-below treatment. Colour overlay is
          admin-editable per project (same system as the 4 top-level path-page heroes), falling
          back to a sensible dark-at-bottom default so existing projects look right with zero
          extra setup. */}
      {heroSrc && (
        // Aspect ratio widens at each breakpoint — narrow phones need a much taller (portrait-
        // leaning) crop than desktop to leave room for the overlaid title/tags stack without
        // colliding with the header row above it, especially since project names here can run
        // to a full sentence rather than a short title.
        <div className="w-full relative overflow-hidden aspect-[3/4] sm:aspect-[16/9] lg:aspect-[21/9]" style={{ maxHeight: 560 }}>
          <div
            style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${heroSrc})`,
              backgroundSize: "cover",
              backgroundPosition: project.heroImagePosition || "center",
              transform: `scale(${project.heroImageScale ?? 1})`,
              transformOrigin: project.heroImagePosition || "center",
            }}
          />
          {(project.heroOverlayEnabled ?? true) && (
            <div style={{ position: "absolute", inset: 0, background: buildHeroOverlayGradient(project, PROJECT_HERO_OVERLAY_DEFAULTS) }} />
          )}

          {/* Header row, overlaid */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
            {backAndBadge}
            {closeButtonOverlay}
          </div>

          {/* Title block, overlaid bottom-left */}
          <div className="absolute left-0 right-0 bottom-0 px-4 pb-5 sm:px-8 sm:pb-7">
            <div style={{ maxWidth: 1160, margin: "0 auto" }}>
              <div style={{ marginBottom: 4 }}>
                <CompanyCredit
                  companyId={project.companyId}
                  companies={content.companies}
                  clientName={project.client}
                  instanceId={`card-${project.id}`}
                  openId={openAttributionId}
                  onToggle={onToggleAttribution}
                  copyTemplate={content.companyCreditCopy}
                  light
                />
              </div>
              <h1 className="hero-mobile-h3" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(22px, 5.5vw, 34px)", fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: 6, color: "#F5F1EA" }}>
                {project.name}
              </h1>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(245,241,234,0.65)", marginBottom: 14 }}>
                {project.client}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {project.tags.map((t, ti) => (
                  <span key={`${t}-${ti}`} style={OVERLAY_TAG_STYLE}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "28px 32px 120px" }}>
        {/* No-hero fallback — plain, non-overlaid header/title/credit in normal flow, unchanged
            from before the overlaid-banner treatment above (only reachable when a project has
            zero images at all, since heroSrc otherwise falls back to the first gallery image). */}
        {!heroSrc && (
          <>
            <div className="flex items-center justify-between mb-6">
              {backAndBadge}
              {closeButtonPlain}
            </div>

            <h1 className="hero-mobile-h3" style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 6, color: TEAL }}>
              {project.name}
            </h1>

            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--c-text-40)" }}>
              {project.client}
            </div>
            <div style={{ marginBottom: 18 }}>
              <CompanyCredit
                companyId={project.companyId}
                companies={content.companies}
                clientName={project.client}
                instanceId={`card-${project.id}`}
                openId={openAttributionId}
                onToggle={onToggleAttribution}
                copyTemplate={content.companyCreditCopy}
              />
            </div>
          </>
        )}

        <div className={`grid grid-cols-1 ${showContentsNav ? "xl:grid-cols-[120px_minmax(0,1fr)] xl:gap-8" : ""}`}>
          {/* Contents nav — desktop only, scroll-spy highlighted; only shown once there's real
              content beyond Summary/Gallery/Outcomes worth jumping between. */}
          {showContentsNav && (
            <nav className="hidden xl:block" style={{ position: "sticky", top: navTopOffset, alignSelf: "start" }}>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--c-text-40)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12 }}>
                Contents
              </p>
              <ul style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {navItems.map((item) => {
                  const isActive = activeId === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => scrollToSection(item.id)}
                        className="hover:opacity-100 transition-opacity"
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.02em",
                          color: isActive ? TEAL : "var(--c-text-70)",
                          opacity: isActive ? 1 : 0.75,
                          background: "none", border: "none", cursor: "pointer",
                          padding: "6px 0 6px 12px",
                          borderLeft: isActive ? `2px solid ${TEAL}` : "2px solid var(--c-border-soft)",
                        }}
                      >
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          <div style={{ minWidth: 0 }}>
            {/* Description */}
            {project.desc && (
              <>
                <div style={SECTION_HEADING_STYLE}>Summary</div>
                <div
                  className={`rte-content ${project.descMobile ? "hidden md:block" : ""}`}
                  dangerouslySetInnerHTML={{ __html: project.desc }}
                  style={{ marginBottom: 22 }}
                />
                {project.descMobile && (
                  <div
                    className="rte-content block md:hidden"
                    dangerouslySetInnerHTML={{ __html: project.descMobile }}
                    style={{ marginBottom: 22 }}
                  />
                )}
              </>
            )}

            {/* Live site — placed right after Summary, above everything else, so the one link
                visitors actually want to click doesn't get buried below the sections/tags. */}
            {project.live && (
              <a href={project.live} target="_blank" rel="noreferrer"
                className="hover:opacity-80 transition-opacity"
                style={{ fontFamily: "var(--font-mono)", fontSize: 11, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, letterSpacing: "0.04em", borderRadius: 0, padding: "8px 18px", color: "#0C1117", background: TEAL, border: "none", marginBottom: 22 }}>
                View Live Site →
              </a>
            )}

            {/* Role — small info-card grid (Role/Client/Platform/Scope); hidden unless at least
                one of Role/Platform/Scope is actually filled in (Client alone isn't enough, it's
                already shown in the byline above). */}
            {showRole && (
              <section
                id="role"
                data-section-id="role"
                ref={(el) => { sectionRefs.current.role = el; }}
                style={{ scrollMarginTop: navTopOffset + 12 }}
              >
                <div style={SECTION_HEADING_STYLE}>Role</div>
                <div
                  className="grid grid-cols-2"
                  style={{ gap: "0.5px", background: "var(--c-divider)", border: "0.5px solid var(--c-border-soft)", marginBottom: 22 }}
                >
                  {roleCards.map((card) => (
                    <div key={card.key} style={{ background: "var(--c-bg-card)", padding: "16px 18px" }}>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--c-text-40)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                        {card.label}
                      </p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--c-text-80)", lineHeight: 1.4 }}>
                        {card.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Cover image — sits directly under Role (or, when a project has no Role/Platform/
                Scope set, right after Summary/the live-site link instead). */}
            {coverSrc ? (
              <img src={coverSrc} alt={content.mediaMeta?.[coverSrc]?.alt || project.name} style={{ width: "100%", aspectRatio: "16/9", borderRadius: 0, border: "0.5px solid var(--c-border)", objectFit: "cover", display: "block", marginBottom: 22 }} />
            ) : (
              <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 0, border: "0.5px solid var(--c-border)", background: "var(--c-bg-card)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
                <MissingImagePlaceholder logoWidth="22%" logoMaxWidth={90} />
              </div>
            )}

            {/* Section 1 — "Project Detail" in the CMS (project.fullContent) */}
            {showSection1 && (
              <section
                id="section1"
                data-section-id="section1"
                ref={(el) => { sectionRefs.current.section1 = el; }}
                style={{ scrollMarginTop: navTopOffset + 12 }}
              >
                <div style={SECTION_HEADING_STYLE}>{project.section1Heading || "Project Detail"}</div>
                <div
                  className={`rte-content ${project.fullContentMobile ? "hidden md:block" : ""}`}
                  dangerouslySetInnerHTML={{ __html: project.fullContent || "" }}
                  style={{ marginBottom: 22 }}
                />
                {project.fullContentMobile && (
                  <div
                    className="rte-content block md:hidden"
                    dangerouslySetInnerHTML={{ __html: project.fullContentMobile }}
                    style={{ marginBottom: 22 }}
                  />
                )}
              </section>
            )}

            {/* Section 2 — "Project section 2" in the CMS (project.fullCaseStudyContent — field
                name unchanged from before the merge to avoid migrating existing content) */}
            {showSection2 && (
              <section
                id="section2"
                data-section-id="section2"
                ref={(el) => { sectionRefs.current.section2 = el; }}
                style={{ scrollMarginTop: navTopOffset + 12 }}
              >
                <div style={SECTION_HEADING_STYLE}>{project.section2Heading || "Process"}</div>
                <div
                  className={`rte-content ${project.fullCaseStudyContentMobile ? "hidden md:block" : ""}`}
                  dangerouslySetInnerHTML={{ __html: project.fullCaseStudyContent || "" }}
                  style={{ marginBottom: 22, maxWidth: "none" }}
                />
                {project.fullCaseStudyContentMobile && (
                  <div
                    className="rte-content block md:hidden"
                    dangerouslySetInnerHTML={{ __html: project.fullCaseStudyContentMobile }}
                    style={{ marginBottom: 22, maxWidth: "none" }}
                  />
                )}
              </section>
            )}

            {/* Gallery — each image starts invisible and fades in on its own load, rather
                than popping in the instant it's decoded (which is what actually read as
                glitchy — the fix is a graceful reveal, not a slower fetch). */}
            {project.imgs.length > 1 && (
              <div style={{ display: "flex", gap: 8, marginTop: 40, marginBottom: 22 }}>
                {([
                  { src: project.imgs[1], pos: project.img1Position, scale: project.img1Scale },
                  { src: project.imgs[2], pos: project.img2Position, scale: project.img2Scale },
                  { src: project.imgs[3], pos: project.img3Position, scale: project.img3Scale },
                ] as { src?: string; pos?: string; scale?: number }[]).filter(item => item.src).map((item, k) => (
                  <button
                    key={k}
                    onClick={() => onOpenLightbox(item.src!)}
                    style={{ flex: 1, aspectRatio: "4/3", borderRadius: 0, border: "0.5px solid var(--c-border)", minWidth: 0, overflow: "hidden", padding: 0, cursor: "zoom-in", background: "none", display: "block", position: "relative" }}
                  >
                    <FadeInImage
                      src={item.src!}
                      alt={content.mediaMeta?.[item.src!]?.alt || `${project.name} — highlight photo ${k + 1}`}
                      sizes="(min-width: 1024px) 20vw, 33vw"
                      objectPosition={item.pos || "center"}
                      scale={item.scale ?? 1}
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Section 3 — "Project section 3" in the CMS, new field with no legacy content to
                preserve, so unlike sections 1/2 there's no fallback heading: a blank heading
                renders no heading at all rather than a generic placeholder. */}
            {showSection3 && (
              <section
                id="section3"
                data-section-id="section3"
                ref={(el) => { sectionRefs.current.section3 = el; }}
                style={{ scrollMarginTop: navTopOffset + 12 }}
              >
                {project.section3Heading && <div style={SECTION_HEADING_STYLE}>{project.section3Heading}</div>}
                <div
                  className={`rte-content ${project.section3ContentMobile ? "hidden md:block" : ""}`}
                  dangerouslySetInnerHTML={{ __html: project.section3Content || "" }}
                  style={{ marginBottom: 22, marginTop: project.section3Heading ? 0 : 40 }}
                />
                {project.section3ContentMobile && (
                  <div
                    className="rte-content block md:hidden"
                    dangerouslySetInnerHTML={{ __html: project.section3ContentMobile }}
                    style={{ marginBottom: 22 }}
                  />
                )}
              </section>
            )}

            {/* Outcomes — numbered flush-divided list */}
            {project.outcomes.length > 0 && (
              <>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.14em", color: "var(--c-text-dim)", textTransform: "uppercase", marginTop: 40, marginBottom: 12, fontWeight: 700 }}>
                  Key Outcomes
                </div>
                <div style={{ borderTop: "0.5px solid var(--c-divider)", marginBottom: 24 }}>
                  {project.outcomes.map((o, k) => (
                    <div key={k} className="flex items-baseline gap-3" style={{ padding: "10px 0", borderBottom: "0.5px solid var(--c-divider)" }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: TEAL, flexShrink: 0, width: 22 }}>
                        {String(k + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: 13.5, lineHeight: 1.55, color: "var(--c-text)" }}>{o}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Tags */}
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.14em", color: "var(--c-text-dim)", textTransform: "uppercase", marginTop: 40, marginBottom: 12, fontWeight: 700 }}>
              Tags
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
              {project.tags.map((t, ti) => (
                <span key={`${t}-${ti}`} style={TAG_STYLE}>
                  {t}
                </span>
              ))}
            </div>

            {/* External case study link only — the in-house "View Full Case Study" button is
                gone now that its content lives inline on this same page. */}
            {project.caseStudy && (
              <div style={{ marginTop: 40, marginBottom: 8 }}>
                <a href={project.caseStudy} target="_blank" rel="noreferrer"
                  className="hover:opacity-70 transition-opacity"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--c-text-50)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  External case study →
                </a>
              </div>
            )}
          </div>
        </div>

        {/* View More Projects — 1 row of 3 on larger screens, stacked on mobile.
            Padding to clear the floating "Current Path" pill comes from the panel's
            own paddingBottom (120px) above, since this renders as its last child.
            Deferred behind showExtras (see caller) so these 3 extra cover images don't
            start decoding/painting until the open transition has already settled. */}
        {showExtras && viewMoreProjects.length > 0 && (
          <div style={{ marginTop: 40, paddingTop: 28, borderTop: "0.5px solid var(--c-border-soft)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 25, letterSpacing: "0.14em", color: TEAL, textTransform: "uppercase", marginBottom: 16, fontWeight: 700 }}>
              {project.viewMoreHeading || "View More Projects"}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {viewMoreProjects.map((vp) => {
                const vpCover = vp.coverImageUrl || vp.imgs?.[0] || null;
                return (
                  <div
                    key={vp.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectProject(projectUrlSlug(vp))}
                    onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelectProject(projectUrlSlug(vp)); } }}
                    className="group relative flex flex-col cursor-pointer"
                    style={{ borderRadius: 0, background: "var(--c-bg-card)", border: "0.5px solid var(--c-border-soft)", outline: "none", overflow: "hidden" }}
                  >
                    {/* Image — fixed aspect ratio; card text sits in its own panel below, matching the main Work grid card style */}
                    <div className="relative overflow-hidden" style={{ aspectRatio: "16/9", flexShrink: 0 }}>
                      {vpCover ? (
                        <>
                          <FadeInImage
                            src={vpCover}
                            alt={vp.name}
                            sizes="(min-width: 1024px) 33vw, 100vw"
                            objectPosition={vp.coverImagePosition || "center"}
                            scale={vp.coverImageScale ?? 1}
                            className="transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                          />
                          {vp.coverImageHoverUrl && (
                            <NextImage
                              src={vp.coverImageHoverUrl}
                              alt=""
                              fill
                              sizes="(min-width: 1024px) 33vw, 100vw"
                              className="opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
                              style={{
                                objectFit: "cover",
                                objectPosition: vp.coverImageHoverPosition || "center",
                                transform: `scale(${vp.coverImageHoverScale ?? 1})`,
                                transformOrigin: vp.coverImageHoverPosition || "50% 50%",
                              }}
                            />
                          )}
                        </>
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <MissingImagePlaceholder logoWidth="38%" logoMaxWidth={120} />
                        </div>
                      )}
                    </div>

                    {/* Card text — its own panel below the image */}
                    <div className="relative flex flex-col flex-1" style={{ padding: "18px 20px 19px" }}>
                      {vp.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 9 }}>
                          {vp.tags.slice(0, 2).map((t, ti) => (
                            <span key={`${t}-${ti}`} style={TAG_STYLE}>{t}</span>
                          ))}
                        </div>
                      )}
                      <h3 style={{
                        fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 500, color: "var(--c-text)", lineHeight: 1.2,
                        marginBottom: 7, letterSpacing: "-0.01em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {vp.name}
                      </h3>
                      <div style={{
                        fontFamily: "var(--font-body)", fontSize: 12, color: "var(--c-text-70)", lineHeight: 1.55,
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {stripHtml(vp.desc)}
                      </div>
                      <div className="overflow-hidden" style={{ marginTop: 11, height: 16 }}>
                        <div
                          className="opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out"
                          style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", color: TEAL, display: "flex", alignItems: "center", gap: 5 }}
                        >
                          View project <span>→</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
