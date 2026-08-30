"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Download } from "lucide-react";
import { useContentStore, resolveExperienceProjects, projectUrlSlug } from "@/store/contentStore";
import type { CMSProject } from "@/store/contentStore";
import { PathCTA } from "@/components/PathCTA";
import { ClientsSlider } from "@/components/ClientsSlider";
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
  function toggleJob(i: number) {
    setOpenJobs((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }
  const { content } = useContentStore();
  const cms = content.evaluate;
  const qualificationsRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen pb-32"
      style={{ background: "var(--c-bg)", transition: "background 0.3s ease" }}
    >
      {/* Hero */}
      <div className="px-8 md:px-16 pt-20 pb-16 border-b" style={{ borderColor: "var(--c-border-soft)" }}>
        <PathCTA
          currentPath="recruit"
          onNavigate={onNavigate}
          compact
          heroContent={
            <>
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
                Path 02 — Evaluate
              </motion.span>
              <motion.h1
                className={cms.heroStatementMobile ? "hidden md:block hero-mobile-h2" : "hero-mobile-h2"}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(28px, 4.5vw, 58px)",
                  color: "var(--c-text)",
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
                    color: "var(--c-text)",
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

      <div className="px-8 md:px-16">

        {/* Section 1 — Professional Snapshot */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-14 mb-14 grid md:grid-cols-2 gap-10 pb-14 border-b"
          style={{ borderColor: "var(--c-border-soft)" }}
        >
          <div>
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px" }}>
              {cms.bioHeading || "About Me"}
            </p>
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
            <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px" }}>
              {cms.industriesHeading || "Industries"}
            </p>
            <div className="flex flex-wrap gap-2 mb-10">
              {cms.industries.map((ind) => (
                <span
                  key={ind}
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "13px",
                    color: "var(--c-text)",
                    border: "1px solid rgba(20,173,181,0.2)",
                    borderRadius: "8px",
                    padding: "6px 14px",
                    background: "rgba(20,173,181,0.05)",
                  }}
                >
                  {ind}
                </span>
              ))}
            </div>

            <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "12px" }}>
              {cms.statsHeading || "At a Glance"}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
              {cms.stats.map(({ value, label, sub }) => {
                // The Qualifications stat is a shortcut down to its own section further down
                // the page — every other stat is purely informational, so only this one gets
                // the hover/click treatment.
                const isQualifications = label === "Qualifications";
                return (
                  <div
                    key={label}
                    role={isQualifications ? "button" : undefined}
                    tabIndex={isQualifications ? 0 : undefined}
                    onClick={isQualifications ? () => qualificationsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) : undefined}
                    onKeyDown={isQualifications ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); qualificationsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); } } : undefined}
                    className="rounded-lg p-3 transition-colors"
                    style={{
                      background: "var(--c-bg-card)",
                      border: "1px solid var(--c-border-soft)",
                      cursor: isQualifications ? "pointer" : undefined,
                    }}
                    onMouseEnter={isQualifications ? (e) => { e.currentTarget.style.borderColor = "rgba(20,173,181,0.4)"; e.currentTarget.style.background = "var(--c-bg-card-hover, var(--c-bg-card))"; } : undefined}
                    onMouseLeave={isQualifications ? (e) => { e.currentTarget.style.borderColor = "var(--c-border-soft)"; e.currentTarget.style.background = "var(--c-bg-card)"; } : undefined}
                  >
                    <span style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(16px, 1.8vw, 22px)", color: "var(--c-text)", fontWeight: 400, lineHeight: 1, display: "block", marginBottom: "4px" }}>
                      {value}
                    </span>
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
            </div>

            {cms.resumeUrl && (
              <a
                href={cms.resumeUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
                style={{
                  display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "16px",
                  fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.04em",
                  background: "var(--btn-color)", color: "var(--c-bg)", border: "1px solid var(--btn-color)",
                  borderRadius: "8px", padding: "9px 16px", textDecoration: "none",
                }}
              >
                <Download size={13} /> Download Resume
              </a>
            )}
          </div>
        </motion.div>

        {/* Section 3 — Professional Experience */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-14 pb-14 border-b"
          style={{ borderColor: "var(--c-border-soft)" }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
            {cms.experienceHeading || "Professional Experience"}
          </p>
          <div className="flex flex-col gap-3">
            {cms.experience.map((job, i) => (
              <div
                key={job.org + i}
                className="rounded-xl border overflow-hidden"
                style={{
                  background: "var(--c-bg-card)",
                  borderColor: openJobs.has(i) ? "rgba(20,173,181,0.25)" : "var(--c-border-soft)",
                  transition: "border-color 0.3s",
                }}
              >
                <button
                  className="w-full text-left flex items-center justify-between p-5"
                  onClick={() => toggleJob(i)}
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-6">
                    <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "18px", color: "var(--c-text)", fontWeight: 400 }}>
                      {job.org}
                    </h3>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--c-text-muted)", fontWeight: 300 }}>
                      {job.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--c-teal)", whiteSpace: "nowrap" }}>
                      {job.period}
                    </span>
                    <motion.div animate={{ rotate: openJobs.has(i) ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={15} style={{ color: "var(--c-text-muted)" }} />
                    </motion.div>
                  </div>
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
                      <div
                        className="px-5 pb-5 grid md:grid-cols-3 gap-6"
                        style={{ borderTop: "1px solid rgba(237,232,223,0.05)" }}
                      >
                        <div className="md:col-span-2 pt-4 experience-overview">
                          {job.description && (
                            <>
                              <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
                                Overview
                              </p>
                              <div
                                className="rte-content"
                                style={{ fontSize: "16px", color: "var(--c-text-body)", marginBottom: "20px", maxWidth: "none" }}
                                dangerouslySetInnerHTML={{ __html: job.description }}
                              />
                            </>
                          )}
                          {job.highlights.length > 0 && (
                            <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
                              Highlights
                            </p>
                          )}
                          {job.highlights.map((h, hi) => (
                            <div key={hi} className="flex items-start gap-2 mb-2.5">
                              <span style={{ color: "var(--c-teal)", fontSize: "12px", marginTop: "3px", flexShrink: 0 }}>—</span>
                              <span style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--c-text-body)", fontWeight: 300, lineHeight: 1.6 }}>
                                {h}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="pt-4">
                          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "10px" }}>
                            Key Skills
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {job.tags.map((t, ti) => (
                              <span
                                key={`${t}-${ti}`}
                                className="pro-exp-outline"
                                style={{
                                  fontFamily: "var(--font-body)",
                                  fontSize: "12px",
                                  color: "var(--c-text-muted)",
                                  borderRadius: "6px",
                                  padding: "3px 10px",
                                }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>

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
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
            {cms.skillsHeading || "Core Strengths"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cms.skills.map((group) => (
              <div
                key={group.title}
                className="text-left rounded-xl p-5"
                style={{ background: "var(--c-bg-card)", border: "1px solid var(--c-border-soft)" }}
              >
                <p style={{ fontFamily: "var(--font-heading)", fontSize: "15px", color: "var(--c-text)", fontWeight: 400, marginBottom: "10px" }}>
                  {group.title}
                </p>
                <div className="flex flex-wrap gap-2">
                  {group.skills.map((skill, si) => (
                    <span
                      key={`${skill}-${si}`}
                      style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--c-text-muted)", fontWeight: 300 }}
                    >
                      {skill}{si < group.skills.length - 1 ? " ·" : ""}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>

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
          ref={qualificationsRef}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-14 pb-14 border-b"
          style={{ borderColor: "var(--c-border-soft)", scrollMarginTop: TOP_BAR_HEIGHT + 16 }}
        >
          <p style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--c-teal)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "20px" }}>
            {cms.qualificationsHeading || "Education & Qualifications"}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {cms.qualifications.map((q, i) => (
              <div
                key={i}
                className="rounded-xl p-5"
                style={{ background: "var(--c-bg-card)", border: "1px solid var(--c-border-soft)" }}
              >
                {q.org && (
                  <div className="flex items-start justify-between gap-3" style={{ marginBottom: "4px" }}>
                    <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--c-teal)", fontWeight: 500 }}>
                      {q.org}
                    </p>
                    {q.year && (
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--c-teal)", whiteSpace: "nowrap", flexShrink: 0 }}>
                        {q.year}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-start justify-between gap-3" style={{ marginBottom: "6px" }}>
                  <p style={{ fontFamily: "var(--font-heading)", fontSize: "15px", color: "var(--c-text)", fontWeight: 400 }}>
                    {q.title}
                  </p>
                  {!q.org && q.year && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--c-teal)", whiteSpace: "nowrap", flexShrink: 0 }}>
                      {q.year}
                    </span>
                  )}
                </div>
                {(q.major || q.minor) && (
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--c-text-muted)", fontWeight: 300, marginTop: "4px" }}>
                    {[q.major && `Major: ${q.major}`, q.minor && `Minor: ${q.minor}`].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            ))}
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
                    borderRadius: "8px",
                    padding: "4px 12px",
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
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="mb-14 pb-14 border-b"
          style={{ borderColor: "var(--c-border-soft)" }}
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
                <div
                  className="rte-content quote-color-fix"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontStyle: "italic",
                    fontSize: "16px",
                    color: "var(--c-quote-emphasis)",
                    marginBottom: "16px",
                  }}
                  dangerouslySetInnerHTML={{ __html: t.quote }}
                />
                <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--c-teal)", marginBottom: "12px" }}>
                  — {t.name}
                </p>
                <div className="flex flex-wrap gap-2">
                  {t.highlights.map((h, hi) => (
                    <span
                      key={`${h}-${hi}`}
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "11px",
                        color: "var(--c-teal)",
                        border: "1px solid rgba(20,173,181,0.2)",
                        borderRadius: "8px",
                        padding: "3px 10px",
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
