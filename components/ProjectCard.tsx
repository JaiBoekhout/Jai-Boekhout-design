import { type ReactNode, type KeyboardEvent } from "react";
import Link from "next/link";
import NextImage from "next/image";
import type { CMSProject } from "@/store/contentStore";
import { stripHtml } from "@/lib/utils";
import { MissingImagePlaceholder } from "@/components/MissingImagePlaceholder";
import { FadeInImage } from "@/components/FadeInImage";
import { Tag } from "@/components/SiteKit";

export interface ProjectCardCover {
  src: string | null;
  position: string;
  scale: number;
  hoverSrc?: string | null;
  hoverPosition: string;
  hoverScale: number;
}

export interface ProjectCardProps {
  project: CMSProject;
  cover: ProjectCardCover;
  /** Pre-resolved tag or category names, already sliced to however many should show — the
   *  Featured Grid shows curated category names, the plain project list shows the project's own
   *  tags; resolving which is the caller's job, not this component's. */
  labels: string[];
  sizes: string;
  /** "div" for a title that isn't a real page heading in its context (e.g. a small "related
   *  project" callout nested inside a job-history entry, several levels deeper than any
   *  reasonable heading depth) — matches how such a card rendered before consolidation. */
  headingLevel?: "h2" | "h3" | "h4" | "div";
  /** The "View Project →" hover reveal, shown on the main Work grid/list but not the project-page
   *  "View More Projects" card. */
  showHoverHint?: boolean;
  /** The project-page "View More Projects" card fades its image in on load (a batch of images
   *  appearing together reads better that way) — the main Work grid/list renders synchronously. */
  fadeInImage?: boolean;
  /** Real navigation (Featured Grid, plain list) renders a <Link>, crawlable and correct for a
   *  hard refresh. Modal-internal navigation ("View More Projects" inside an already-open project)
   *  has no real href to go to — it updates the open modal's state instead. */
  href?: string;
  onActivate?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
}

export function ProjectCard({
  project, cover, labels, sizes, headingLevel = "h2", showHoverHint = true, fadeInImage = false,
  href, onActivate, onMouseEnter, onFocus,
}: ProjectCardProps) {
  const Heading = headingLevel;

  const image = cover.src ? (
    <>
      {fadeInImage ? (
        <FadeInImage
          src={cover.src}
          alt={project.name}
          sizes={sizes}
          objectPosition={cover.position}
          scale={cover.scale}
          className="transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
      ) : (
        <NextImage
          src={cover.src}
          alt={project.name}
          fill
          sizes={sizes}
          className="transition-transform duration-700 ease-out group-hover:scale-[1.05]"
          style={{ objectFit: "cover", objectPosition: cover.position, transform: `scale(${cover.scale})`, transformOrigin: cover.position }}
        />
      )}
      {cover.hoverSrc && (
        <NextImage
          src={cover.hoverSrc}
          alt=""
          fill
          sizes={sizes}
          className="opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
          style={{ objectFit: "cover", objectPosition: cover.hoverPosition, transform: `scale(${cover.hoverScale})`, transformOrigin: cover.hoverPosition }}
        />
      )}
    </>
  ) : (
    <div className="absolute inset-0 flex flex-col items-center justify-center">
      <MissingImagePlaceholder logoWidth="38%" logoMaxWidth={120} />
    </div>
  );

  const body = (
    <>
      <div className="relative overflow-hidden" style={{ aspectRatio: "16/9", flexShrink: 0 }}>
        {image}
      </div>
      <div className="relative flex flex-col flex-1" style={{ padding: "18px 20px 19px", pointerEvents: href ? "none" : undefined }}>
        {labels.length > 0 && (
          <div className="flex flex-wrap gap-1.5" style={{ marginBottom: 9 }}>
            {labels.map((label, i) => (
              <Tag key={`${label}-${i}`}>{label}</Tag>
            ))}
          </div>
        )}
        <Heading style={{
          fontFamily: "var(--font-heading)", fontSize: 17, fontWeight: 500, color: "var(--link-color)", lineHeight: 1.2,
          marginBottom: 7, letterSpacing: "-0.01em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {project.name}
        </Heading>
        <div style={{
          fontFamily: "var(--font-body)", fontSize: 12, color: "var(--c-text-70)", lineHeight: 1.55,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {stripHtml(project.desc)}
        </div>
        {showHoverHint && (
          <div className="overflow-hidden" style={{ marginTop: 11, height: 16 }}>
            <div
              className="opacity-0 -translate-y-0.5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out"
              style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em", color: "var(--c-teal)", display: "flex", alignItems: "center", gap: 5 }}
            >
              View Project <span>→</span>
            </div>
          </div>
        )}
      </div>
    </>
  );

  const cardStyle = {
    borderRadius: "var(--card-corner)",
    background: "var(--project-card-bg)",
    border: "0.5px solid var(--c-border-soft)",
    outline: "none",
    boxShadow: "none",
    overflow: "hidden" as const,
  };

  if (href) {
    return (
      <div key={project.id} data-card className="group relative flex flex-col" style={cardStyle}>
        {body}
        <Link
          href={href}
          aria-label={project.name}
          className="absolute inset-0"
          style={{ zIndex: 3, cursor: "pointer" }}
          onMouseEnter={onMouseEnter}
          onFocus={onFocus}
        />
      </div>
    );
  }

  return (
    <div
      key={project.id}
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onActivate?.(); } }}
      className="group relative flex flex-col cursor-pointer"
      style={cardStyle}
    >
      {body}
    </div>
  );
}

export function ProjectCardPlaceholder({ index }: { index: number }): ReactNode {
  return (
    <div
      key={`ph-${index}`}
      className="relative flex flex-col"
      style={{
        borderRadius: "var(--card-corner)", background: "var(--project-card-bg)", border: "0.5px solid var(--c-border-soft)",
        outline: "none", boxShadow: "none", overflow: "hidden",
      }}
    >
      <div className="relative overflow-hidden" style={{ aspectRatio: "16/9", flexShrink: 0 }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <MissingImagePlaceholder logoWidth="38%" logoMaxWidth={120} />
        </div>
      </div>
    </div>
  );
}
