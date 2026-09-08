"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import type { CMSProject } from "@/store/contentStore";
import { useContentStore } from "@/store/contentStore";
import { CompanyCredit } from "@/components/CompanyCredit";

const TEAL = "var(--c-teal)";
const TOP_OFFSET = 96; // clears the sticky back/close bar (CaseStudyDetailChrome) with breathing room

export interface CaseStudyDetailBodyProps {
  project: CMSProject;
  onOpenLightbox: (src: string) => void;
  openAttributionId: string | null;
  onToggleAttribution: (id: string | null) => void;
}

const TAG_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 10.5,
  letterSpacing: "0.08em",
  color: TEAL,
  background: "transparent",
  textTransform: "uppercase",
  border: "0.5px solid rgba(20,173,181,0.45)",
  borderRadius: 0,
  padding: "5px 12px",
  whiteSpace: "nowrap",
};

export function CaseStudyDetailBody({ project, onOpenLightbox, openAttributionId, onToggleAttribution }: CaseStudyDetailBodyProps) {
  const { content } = useContentStore();

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
  const showProcess = !!project.fullCaseStudyContent;
  const showGallery = project.imgs.length > 1;

  const navItems = useMemo(
    () =>
      [
        { id: "summary", label: "Summary" },
        showRole && { id: "role", label: "Role" },
        showProcess && { id: "process", label: "Process" },
        { id: "outcomes", label: "Outcomes" },
        showGallery && { id: "gallery", label: "Gallery" },
      ].filter(Boolean) as { id: string; label: string }[],
    [showRole, showProcess, showGallery]
  );

  const [activeId, setActiveId] = useState(navItems[0]?.id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const els = navItems.map((item) => sectionRefs.current[item.id]).filter(Boolean) as HTMLElement[];
    if (els.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        const topMost = visible.reduce((a, b) => (a.boundingClientRect.top < b.boundingClientRect.top ? a : b));
        const id = topMost.target.getAttribute("data-section-id");
        if (id) setActiveId(id);
      },
      { rootMargin: `-${TOP_OFFSET + 12}px 0px -65% 0px`, threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navItems.map((n) => n.id).join(",")]);

  function scrollToSection(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      {/* Banner image */}
      {(project.fullCaseStudyBannerUrl ?? project.heroImageUrl ?? project.imgs[0]) && (
        <div style={{ width: "100%", height: "clamp(200px, 38vh, 420px)", position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `url(${project.fullCaseStudyBannerUrl ?? project.heroImageUrl ?? project.imgs[0]})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, #0F1519 0%, rgba(15,21,25,0.3) 60%, transparent 100%)" }} />
        </div>
      )}

      <div style={{ maxWidth: 1160, margin: "0 auto", padding: "clamp(32px,5vw,64px) 40px 80px" }}>
        {/* Header — title/client/credit on the left, tags right-aligned alongside it */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6" style={{ marginBottom: 40, paddingBottom: 40, borderBottom: "0.5px solid rgba(237,232,223,0.06)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="hero-mobile-h3" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(28px,4.5vw,52px)", fontWeight: 500, color: "var(--c-heading)", lineHeight: 1.1, marginBottom: 8, letterSpacing: "-0.02em" }}>
              {project.name}
            </h1>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--c-text-40)", marginBottom: 6 }}>
              {project.client}
            </p>
            <CompanyCredit
              companyId={project.companyId}
              companies={content.companies}
              clientName={project.client}
              instanceId={`full-${project.id}`}
              openId={openAttributionId}
              onToggle={onToggleAttribution}
              copyTemplate={content.companyCreditCopy}
            />
          </div>
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 lg:justify-end" style={{ maxWidth: 360, flexShrink: 0 }}>
              {project.tags.map((t, ti) => (
                <span key={`${t}-${ti}`} style={TAG_STYLE}>{t}</span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[160px_minmax(0,1fr)]" style={{ gap: 56, alignItems: "start" }}>
          {/* CONTENTS side nav — desktop only, scroll-spy highlighted */}
          <nav className="hidden lg:block" style={{ position: "sticky", top: TOP_OFFSET }}>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--c-text-40)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
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
                        fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: "0.02em",
                        color: isActive ? TEAL : "var(--c-text-70)",
                        opacity: isActive ? 1 : 0.75,
                        background: "none", border: "none", cursor: "pointer",
                        padding: "7px 0 7px 14px",
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

          <div style={{ minWidth: 0 }}>
            {/* Summary */}
            <section
              id="summary"
              data-section-id="summary"
              ref={(el) => { sectionRefs.current.summary = el; }}
              style={{ scrollMarginTop: TOP_OFFSET + 12, marginBottom: 48 }}
            >
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: TEAL, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Summary</p>
              <div className={`rte-content ${project.descMobile ? "hidden md:block" : ""}`} dangerouslySetInnerHTML={{ __html: project.desc }} />
              {project.descMobile && (
                <div className="rte-content block md:hidden" dangerouslySetInnerHTML={{ __html: project.descMobile }} />
              )}
              {project.fullContent && (
                <div className={`rte-content ${project.fullContentMobile ? "hidden md:block" : ""}`} dangerouslySetInnerHTML={{ __html: project.fullContent }} style={{ marginTop: 20, maxWidth: "none" }} />
              )}
              {project.fullContentMobile && (
                <div className="rte-content block md:hidden" dangerouslySetInnerHTML={{ __html: project.fullContentMobile }} style={{ marginTop: 20, maxWidth: "none" }} />
              )}
            </section>

            {/* Role */}
            {showRole && (
              <section
                id="role"
                data-section-id="role"
                ref={(el) => { sectionRefs.current.role = el; }}
                style={{ scrollMarginTop: TOP_OFFSET + 12, marginBottom: 48 }}
              >
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: TEAL, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Role</p>
                <div
                  className="grid grid-cols-2 lg:grid-cols-4"
                  style={{ gap: "0.5px", background: "var(--c-divider)", border: "0.5px solid var(--c-border-soft)" }}
                >
                  {roleCards.map((card) => (
                    <div key={card.key} style={{ background: "var(--c-bg-card)", padding: "18px 20px" }}>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, color: "var(--c-text-40)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
                        {card.label}
                      </p>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--c-text-80)", lineHeight: 1.4 }}>
                        {card.value}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Process */}
            {showProcess && (
              <section
                id="process"
                data-section-id="process"
                ref={(el) => { sectionRefs.current.process = el; }}
                style={{ scrollMarginTop: TOP_OFFSET + 12, marginBottom: 48 }}
              >
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: TEAL, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Process</p>
                <div className={`rte-content ${project.fullCaseStudyContentMobile ? "hidden md:block" : ""}`} dangerouslySetInnerHTML={{ __html: project.fullCaseStudyContent || "" }} style={{ maxWidth: "none" }} />
                {project.fullCaseStudyContentMobile && (
                  <div className="rte-content block md:hidden" dangerouslySetInnerHTML={{ __html: project.fullCaseStudyContentMobile }} style={{ maxWidth: "none" }} />
                )}
              </section>
            )}

            {/* Outcomes — numbered flush list */}
            <section
              id="outcomes"
              data-section-id="outcomes"
              ref={(el) => { sectionRefs.current.outcomes = el; }}
              style={{ scrollMarginTop: TOP_OFFSET + 12, marginBottom: 48 }}
            >
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: TEAL, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Outcomes</p>
              <div style={{ borderTop: "0.5px solid var(--c-divider)" }}>
                {project.outcomes.map((o, k) => (
                  <div key={k} className="flex items-baseline gap-4 py-5" style={{ borderBottom: "0.5px solid var(--c-divider)" }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: TEAL, flexShrink: 0, width: 28 }}>
                      {String(k + 1).padStart(2, "0")}
                    </span>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.6, color: "var(--c-text-80)" }}>{o}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Gallery */}
            {showGallery && (
              <section
                id="gallery"
                data-section-id="gallery"
                ref={(el) => { sectionRefs.current.gallery = el; }}
                style={{ scrollMarginTop: TOP_OFFSET + 12, marginBottom: 32 }}
              >
                <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: TEAL, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Gallery</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {project.imgs.slice(1, 4).filter(Boolean).map((img, k) => (
                    <button key={k} onClick={() => onOpenLightbox(img)} style={{ aspectRatio: "4/3", borderRadius: 0, overflow: "hidden", padding: 0, cursor: "zoom-in", background: "none", border: "0.5px solid var(--c-border)", display: "block" }}>
                      <img src={img} alt={content.mediaMeta?.[img]?.alt || `${project.name} — gallery image ${k + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Footer links */}
            {project.live && (
              <div style={{ borderTop: "0.5px solid rgba(237,232,223,0.06)", paddingTop: 24 }}>
                <a href={project.live} target="_blank" rel="noreferrer"
                  className="hover:opacity-70 transition-opacity"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: TEAL, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  Visit live site <ArrowUpRight size={12} />
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
