"use client";

import { ArrowUpRight } from "lucide-react";
import type { CMSProject } from "@/store/contentStore";
import { useContentStore } from "@/store/contentStore";
import { CompanyCredit } from "@/components/CompanyCredit";

const TEAL = "var(--c-teal)";

export interface CaseStudyDetailBodyProps {
  project: CMSProject;
  onOpenLightbox: (src: string) => void;
  openAttributionId: string | null;
  onToggleAttribution: (id: string | null) => void;
}

export function CaseStudyDetailBody({ project, onOpenLightbox, openAttributionId, onToggleAttribution }: CaseStudyDetailBodyProps) {
  const { content } = useContentStore();

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

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(32px,5vw,64px) 40px 80px" }}>
        {/* Tags */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          {project.tags.map((t, ti) => (
            <span key={`${t}-${ti}`} className="pro-exp-outline" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--c-text)", borderRadius: 999, padding: "6px 14px", whiteSpace: "nowrap" }}>{t}</span>
          ))}
        </div>

        {/* Title */}
        <h1 className="hero-mobile-h3" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(28px,4.5vw,52px)", fontWeight: 500, color: TEAL, lineHeight: 1.1, marginBottom: 8, letterSpacing: "-0.02em" }}>
          {project.name}
        </h1>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--c-text-40)", marginBottom: 6 }}>
          {project.client}
        </p>
        <div style={{ marginBottom: 32 }}>
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

        {/* Summary + outcomes grid — stacked on mobile, side by side from md: up */}
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 40, marginBottom: 40, paddingBottom: 40, borderBottom: "0.5px solid rgba(237,232,223,0.06)" }}>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: TEAL, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>Overview</p>
            <div className={`rte-content ${project.descMobile ? "hidden md:block" : ""}`} dangerouslySetInnerHTML={{ __html: project.desc }} />
            {project.descMobile && (
              <div className="rte-content block md:hidden" dangerouslySetInnerHTML={{ __html: project.descMobile }} />
            )}
          </div>
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: TEAL, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14, fontWeight: 700 }}>Key Outcomes</p>
            {project.outcomes.map((o, k) => (
              <div key={k} style={{ display: "flex", gap: 10, alignItems: "baseline", marginBottom: 10 }}>
                <span style={{ color: TEAL, fontFamily: "var(--font-mono)", flexShrink: 0 }}>—</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.6, color: "var(--c-text-80)" }}>{o}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Project Detail rich text */}
        {project.fullContent && (
          <div className={`rte-content ${project.fullContentMobile ? "hidden md:block" : ""}`} dangerouslySetInnerHTML={{ __html: project.fullContent }} style={{ marginBottom: 32 }} />
        )}
        {project.fullContentMobile && (
          <div className="rte-content block md:hidden" dangerouslySetInnerHTML={{ __html: project.fullContentMobile }} style={{ marginBottom: 32 }} />
        )}

        {/* Gallery */}
        {project.imgs.length > 1 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 32 }}>
            {project.imgs.slice(1, 4).filter(Boolean).map((img, k) => (
              <button key={k} onClick={() => onOpenLightbox(img)} style={{ aspectRatio: "4/3", borderRadius: 10, overflow: "hidden", padding: 0, cursor: "zoom-in", background: "none", border: "0.5px solid var(--c-border)", display: "block" }}>
                <img src={img} alt={content.mediaMeta?.[img]?.alt || `${project.name} — gallery image ${k + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </button>
            ))}
          </div>
        )}

        {/* Full case study rich text — maxWidth overridden to fill the column (matches the
            gallery above) instead of the .rte-content default 60ch reading-width cap */}
        {project.fullCaseStudyContent && (
          <div className={`rte-content ${project.fullCaseStudyContentMobile ? "hidden md:block" : ""}`} dangerouslySetInnerHTML={{ __html: project.fullCaseStudyContent }} style={{ marginBottom: 32, maxWidth: "none" }} />
        )}
        {project.fullCaseStudyContentMobile && (
          <div className="rte-content block md:hidden" dangerouslySetInnerHTML={{ __html: project.fullCaseStudyContentMobile }} style={{ marginBottom: 32, maxWidth: "none" }} />
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
    </>
  );
}
