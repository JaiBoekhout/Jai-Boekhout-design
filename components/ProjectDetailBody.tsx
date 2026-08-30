"use client";

import { useState, useEffect, useRef, type KeyboardEvent } from "react";
import { motion, AnimatePresence, animate } from "motion/react";
import NextImage from "next/image";
import Link from "next/link";
import { ArrowLeft, X, Lock, ChevronDown } from "lucide-react";
import type { CMSProject } from "@/store/contentStore";
import { useContentStore, resolveLinkedCaseStudy, isCaseStudyLive, projectUrlSlug, DEFAULT_LOGO_URL } from "@/store/contentStore";
import { TALL_RATIO_THRESHOLD } from "@/components/ImagePicker";
import { CompanyCredit } from "@/components/CompanyCredit";
import { MissingImagePlaceholder } from "@/components/MissingImagePlaceholder";

const TEAL = "var(--c-teal)";

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
  onViewCaseStudy: (project: CMSProject) => void;
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
  project, mode, onClose, onSelectProject, onViewCaseStudy, onOpenLightbox, viewMoreProjects, showExtras, openAttributionId, onToggleAttribution,
}: ProjectDetailBodyProps) {
  const { content } = useContentStore();

  const linkedCS = resolveLinkedCaseStudy(project, content.work.caseStudies) ?? null;
  const heroSrc = project.heroImageUrl ?? project.imgs[0];
  const coverSrc = linkedCS?.coverImageUrl || project.coverImageUrl || project.imgs?.[0] || null;
  const caseStudyLive = isCaseStudyLive(linkedCS ?? undefined);

  // Renders as the normal cropped 3:4 panel immediately (no separate hidden probe image to wait
  // on) and upgrades to the natural-size scrollable layout only if the same image we're already
  // displaying turns out to be tall, learned from its own onLoad — never a second, redundant
  // fetch just to measure it first. heroNatural carries the real dimensions over to the tall
  // variant's next/image, which needs an intrinsic width/height to size its own request.
  const [isHeroTall, setIsHeroTall] = useState(false);
  const [heroNatural, setHeroNatural] = useState<{ w: number; h: number } | null>(null);
  // Tied to an actual change (via ref), not just to the effect being invoked — this specifically
  // guards against onLoad's setIsHeroTall(true) getting silently stomped back to false by this
  // same effect re-firing for the *same* heroSrc a moment later (observed in practice: the
  // dependency-array effect can re-run without heroSrc's value having changed at all). Resetting
  // unconditionally on every invocation defeats onLoad's own detection race-free only by luck.
  const prevHeroSrcRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (prevHeroSrcRef.current === heroSrc) return;
    prevHeroSrcRef.current = heroSrc;
    setIsHeroTall(false);
    setHeroNatural(null);
  }, [heroSrc]);

  function applyTallCheck(img: HTMLImageElement) {
    if (img.naturalWidth > 0 && img.naturalHeight / img.naturalWidth > TALL_RATIO_THRESHOLD) {
      setHeroNatural({ w: img.naturalWidth, h: img.naturalHeight });
      setIsHeroTall(true);
    }
  }
  // On a hard-navigated /work/[slug] page, this image is already present in the server-rendered
  // HTML — the browser can start (and for a small/cached image, finish) loading it before React
  // finishes hydrating and attaches the onLoad listener below, so the load event fires into
  // nothing and the tall check never runs. Same root cause as FadeInImage's cached-image note
  // elsewhere in this file; the fix is the same shape — check .complete once mounted as a
  // fallback for a load that already happened.
  const heroFillImgRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const img = heroFillImgRef.current;
    if (img?.complete && img.naturalWidth > 0) applyTallCheck(img);
  }, [heroSrc]);

  // Scroll hint for the tall-hero case: a mouse-scroll indicator (a staggered 3-dot bounce trail —
  // see the render below) that hides while the visitor is actively scrolling and reappears once
  // they've been idle for a moment, plus a couple of real nudges of the image itself shortly
  // after it mounts, starting at the same HERO_HINT_DELAY_MS offset as the dots' cascade. The
  // nudge is driven by Motion's own imperative `animate()` writing straight to scrollTop, rather
  // than the browser's native scrollTo({behavior:"smooth"}) — that native smooth-scroll has its
  // own, browser-controlled easing/duration that isn't tunable to match anything else, which is
  // exactly why the image used to feel disconnected from the icon. `isNudging` suppresses the
  // scroll listener during the nudge so it doesn't itself count as "the visitor scrolled" and
  // hide the hint.
  const HERO_HINT_DELAY_MS = 400;
  const HERO_HINT_CYCLE_MS = 1800;
  const HERO_HINT_CYCLES = 2;
  const DOT_CYCLE_MS = 1300;
  const DOT_CYCLES_BEFORE_SETTLING = 3;
  // isHeroTall (above) only means "this image's own aspect ratio skips the crop" — some hero
  // images clear that bar without actually overflowing the popup by much once laid out, which is
  // exactly what made the hint feel unwarranted on shorter images. Only worth hinting at when the
  // image genuinely renders at least this much taller than the viewport.
  const HERO_HINT_MIN_VIEWPORT_RATIO = 1.25;
  const heroScrollRef = useRef<HTMLDivElement>(null);
  const [heroHintVisible, setHeroHintVisible] = useState(true);
  const [heroHintEligible, setHeroHintEligible] = useState(false);
  // Once the dots have cascaded a few times, the motion has done its job of demonstrating this
  // scrolls — settling into a plain static arrow reads as "yes, there's more" without asking for
  // continued attention. Doesn't reset on later reappearances (see the onScroll idle-timer below):
  // the cascade is a one-time introduction, not something to replay every time the hint returns.
  const [dotsSettled, setDotsSettled] = useState(false);
  const isNudging = useRef(false);
  const heroIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setHeroHintVisible(true);
    setDotsSettled(false);
    setHeroHintEligible(false);
    if (!isHeroTall || project.hideScrollIndicator) return;
    const el = heroScrollRef.current;
    if (!el) return;
    if (el.scrollHeight < window.innerHeight * HERO_HINT_MIN_VIEWPORT_RATIO) return;
    setHeroHintEligible(true);
    const settleTimer = setTimeout(() => setDotsSettled(true), HERO_HINT_DELAY_MS + DOT_CYCLE_MS * DOT_CYCLES_BEFORE_SETTLING);
    isNudging.current = true;
    const keyframes = Array.from({ length: HERO_HINT_CYCLES * 2 + 1 }, (_, i) => (i % 2 === 0 ? 0 : 20));
    const controls = animate(0, keyframes, {
      delay: HERO_HINT_DELAY_MS / 1000,
      duration: (HERO_HINT_CYCLE_MS / 1000) * HERO_HINT_CYCLES,
      ease: "easeInOut",
      onUpdate: (latest) => { el.scrollTop = latest; },
      onComplete: () => { isNudging.current = false; },
    });
    return () => { controls.stop(); isNudging.current = false; clearTimeout(settleTimer); };
  }, [isHeroTall, heroSrc, project.hideScrollIndicator]);
  useEffect(() => () => { if (heroIdleTimer.current) clearTimeout(heroIdleTimer.current); }, []);

  return (
    <>
      {/* Left — hero image. Full-width 3:4-ratio panel on mobile/tablet (matches the recommended portrait hero upload, so nothing gets cropped), 44%-width full-height panel on desktop.
          A hero image taller than the 3:4 recommendation (1200×1600) skips cropping entirely: it renders at natural size in its own independently-scrollable box — h-[60vh] on
          mobile (own scroll region, the rest of the page stays put).
          Desktop "stays put while the details column scrolls" comes from two different
          mechanisms depending on mode: the modal's panel is a fixed-height, non-scrolling row
          (ProjectDetailChrome), so the hero simply flex-stretches to fill it (lg:h-auto) same as
          the non-tall case. A real page has no such row — it's the normal, scrolling document —
          so here the hero is pinned via position:sticky against the viewport instead (below the
          persistent top bar, lg:top-16 = the 64px bar height), with its own height capped to the
          visible viewport so a tall image's inner scroll region still has a real box to scroll
          within while stuck. */}
      <div
        className={`w-full ${isHeroTall ? "h-[60vh]" : "aspect-[3/4]"} lg:aspect-auto ${
          mode === "page" ? "lg:sticky lg:top-16 lg:self-start lg:h-[calc(100vh-4rem)]" : "lg:h-auto"
        } lg:w-[44%] flex-shrink-0 relative overflow-hidden`}
        style={{
          background: !heroSrc ? "var(--c-bg-card)" : undefined,
        }}
      >
        {!heroSrc && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={DEFAULT_LOGO_URL} alt="" style={{ width: "45%", maxWidth: 160, opacity: 0.1, filter: "brightness(0) invert(1)" }} />
          </div>
        )}
        {heroSrc && (isHeroTall ? (
          // overscrollBehavior deliberately left at its default ("auto") — once the visitor
          // scrolls to the bottom of the image on mobile (stacked 1-column layout), the
          // gesture should hand off naturally into scrolling the rest of the page rather
          // than stopping dead at the image's edge. On desktop this box's scrollable
          // ancestor is lg:overflow-hidden (the hero/details split doesn't scroll as a
          // unit), so there's nothing for a chained scroll to reach — safe either way.
          <div
            ref={heroScrollRef}
            onScroll={(e) => {
              if (isNudging.current) return;
              const el = e.currentTarget;
              setHeroHintVisible(false);
              if (heroIdleTimer.current) clearTimeout(heroIdleTimer.current);
              // Reappear once scrolling has actually stopped for a moment — not on
              // every scroll event — and only if there's still more image below to
              // justify the hint; already at the bottom, there's nothing left to hint at.
              heroIdleTimer.current = setTimeout(() => {
                const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
                if (!atBottom) setHeroHintVisible(true);
              }, 900);
            }}
            style={{ position: "absolute", inset: 0, overflowY: "auto" }}
          >
            <NextImage
              src={heroSrc}
              alt={content.mediaMeta?.[heroSrc]?.alt || project.name}
              width={heroNatural?.w ?? 1200}
              height={heroNatural?.h ?? 1600}
              sizes="(min-width: 1024px) 44vw, 100vw"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>
        ) : (
          // Renders immediately (isHeroTall starts false) rather than waiting on a
          // separate hidden probe image — onLoad reads the real natural dimensions off
          // this same already-displayed image and upgrades to the tall variant above if
          // warranted, so a large hero never blocks the popup's initial layout.
          <NextImage
            ref={heroFillImgRef}
            src={heroSrc}
            alt={content.mediaMeta?.[heroSrc]?.alt || project.name}
            fill
            sizes="(min-width: 1024px) 44vw, 100vw"
            style={{
              objectFit: "cover",
              objectPosition: project.heroImagePosition || "center",
              transform: `scale(${project.heroImageScale ?? 1})`,
              transformOrigin: project.heroImagePosition || "50% 50%",
            }}
            onLoad={(e) => applyTallCheck(e.currentTarget)}
          />
        ))}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(120deg, transparent 55%, rgba(6,9,12,0.4))", pointerEvents: "none" }} />
        {/* Back control — lives inside the hero's own positioning context (absolute, not a row
            above the flex layout) so it adds no flow height ahead of the sticky hero column; a
            row there would push the hero's pre-stick offset past lg:top-16, delaying when it
            (and the scroll hint pinned to its bottom edge) actually comes into view until the
            visitor scrolled the page down by that row's height. Page mode links straight to
            /work (a real, crawlable nav); modal mode closes the popup via the same onClose the
            details column's X already uses — moved up here (out of the top-right details-column
            block below) so both live in one place, stacked above the num/tag badge. */}
        {mode === "page" ? (
          <Link
            href="/work"
            className="hover:opacity-80 transition-opacity"
            style={{
              position: "absolute", top: 20, left: 20, zIndex: 4,
              display: "inline-flex", alignItems: "center", gap: 6,
              fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: "0.04em",
              color: TEAL, background: "rgba(6,9,12,0.75)",
              border: "0.5px solid rgba(20,173,181,0.4)", borderRadius: 999,
              padding: "7px 13px", backdropFilter: "blur(8px)", textDecoration: "none",
            }}
          >
            <ArrowLeft size={12} /> Back to Work
          </Link>
        ) : (
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
            style={{
              position: "absolute", top: 20, left: 20, zIndex: 4,
              fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.06em",
              color: "#0C1117", background: TEAL, border: "none", borderRadius: 999,
              padding: "7px 12px", cursor: "pointer",
            }}
          >
            <ArrowLeft size={11} /> Back to Projects
          </button>
        )}
        {/* Badge — sits below the back control above, in both modes now. */}
        <div style={{
          position: "absolute", top: 60, left: 20,
          fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em",
          color: TEAL, background: "rgba(6,9,12,0.75)",
          border: "0.5px solid rgba(20,173,181,0.4)", borderRadius: 999,
          padding: "5px 13px", backdropFilter: "blur(8px)",
        }}>
          {project.num} — {project.tags[0]?.toUpperCase()}
        </div>

        {/* Scroll hint — only when the hero image both skips the crop (isHeroTall) AND
            genuinely renders 25%+ taller than the viewport (heroHintEligible), or an
            admin's own hideScrollIndicator override rules it out entirely. Hides while
            the visitor is actively scrolling and reappears once they've paused without
            reaching the bottom (see the onScroll above). */}
        <AnimatePresence>
          {isHeroTall && heroHintEligible && heroHintVisible && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                position: "absolute",
                bottom: 18,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 3,
                pointerEvents: "none",
                width: 28,
                height: 46,
                borderRadius: 999,
                background: "rgba(6,9,12,0.75)",
                border: "0.5px solid rgba(20,173,181,0.4)",
                backdropFilter: "blur(8px)",
                boxShadow: "0 8px 20px rgba(0,0,0,0.35)",
              }}
            >
              {dotsSettled ? (
                // After a few cascades the motion has made its point — settle into a
                // plain static arrow rather than asking for continued attention.
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                  <ChevronDown size={14} color={TEAL} />
                </div>
              ) : (
                // Three fixed dots pulsing in a staggered cascade (top → middle → bottom)
                // rather than one dot translating — an afterimage "bounce trail" read,
                // where more than one dot can be partially visible at once.
                [8, 16, 24].map((top, i) => (
                  <motion.div
                    key={top}
                    animate={{ opacity: [0.25, 1, 0.25], scale: [0.85, 1, 0.85] }}
                    transition={{ duration: DOT_CYCLE_MS / 1000, repeat: Infinity, ease: "easeInOut", delay: HERO_HINT_DELAY_MS / 1000 + i * 0.3 }}
                    // x (not a literal transform: translateX string) — Motion owns the
                    // transform property once `scale` is animated, so a plain CSS
                    // transform here gets silently overwritten; x merges into the same
                    // managed transform instead, which is what actually centers this.
                    style={{ position: "absolute", top, left: "50%", x: "-50%", width: 6, height: 6, borderRadius: "50%", background: TEAL }}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Right — scrollable details */}
      <div className="flex-1 lg:overflow-y-auto relative" style={{ padding: "28px 32px 120px", minWidth: 0 }}>

        {/* Top-right actions — desktop only; the mobile/tablet equivalent lives at the very top of the panel, above the hero image. The "Back to Projects"/"Back to Work" text control that used to sit here moved to the hero's top-left, above the num/tag badge — just the close/X stays here. */}
        <div className="hidden lg:flex items-center justify-end gap-2 lg:absolute" style={{ top: 18, right: 18 }}>
          <button
            onClick={onClose}
            aria-label="Close"
            data-popup-close
            className="hover:opacity-60 transition-opacity flex items-center justify-center"
            style={{ width: 34, height: 34, borderRadius: "50%", border: "0.5px solid var(--c-border-med)", background: "var(--c-surface-4)", color: "var(--c-text)", cursor: "pointer", flexShrink: 0 }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Title */}
        <h3 className="lg:pr-[180px] hero-mobile-h3" style={{ fontFamily: "var(--font-heading)", fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: 6, color: TEAL }}>
          {project.name}
        </h3>

        {/* Client */}
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

        {/* Cover image */}
        {coverSrc ? (
          <img src={coverSrc} alt={content.mediaMeta?.[coverSrc]?.alt || project.name} style={{ width: "100%", aspectRatio: "16/9", borderRadius: 10, border: "0.5px solid var(--c-border)", objectFit: "cover", display: "block", marginBottom: 22 }} />
        ) : (
          <div style={{ width: "100%", aspectRatio: "16/9", borderRadius: 10, border: "0.5px solid var(--c-border)", background: "var(--c-bg-card)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
            <MissingImagePlaceholder logoWidth="22%" logoMaxWidth={90} />
          </div>
        )}

        {/* Description */}
        {project.desc && (
          <>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 25, letterSpacing: "0.14em", color: TEAL, textTransform: "uppercase", marginTop: 40, marginBottom: 10, fontWeight: 700 }}>
              Summary
            </div>
            <div
              className="rte-content"
              dangerouslySetInnerHTML={{ __html: project.desc }}
              style={{ marginBottom: 22 }}
            />
          </>
        )}

        {/* Live site — placed right after Summary, above the gallery, so the one link
            visitors actually want to click doesn't get buried below the images/outcomes/tags. */}
        {project.live && (
          <a href={project.live} target="_blank" rel="noreferrer"
            className="hover:opacity-80 transition-opacity"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, letterSpacing: "0.04em", borderRadius: 999, padding: "8px 18px", color: "#0C1117", background: TEAL, border: "none", marginBottom: 22 }}>
            View Live Site →
          </a>
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
                style={{ flex: 1, aspectRatio: "4/3", borderRadius: 9, border: "0.5px solid var(--c-border)", minWidth: 0, overflow: "hidden", padding: 0, cursor: "zoom-in", background: "none", display: "block", position: "relative" }}
              >
                <FadeInImage
                  src={item.src!}
                  alt=""
                  sizes="(min-width: 1024px) 20vw, 33vw"
                  objectPosition={item.pos || "center"}
                  scale={item.scale ?? 1}
                />
              </button>
            ))}
          </div>
        )}

        {/* Rich text project detail — after gallery */}
        {project.fullContent && (
          <>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 25, letterSpacing: "0.14em", color: TEAL, textTransform: "uppercase", marginTop: 40, marginBottom: 10, fontWeight: 700 }}>
              Project Description
            </div>
            <div
              className="rte-content"
              dangerouslySetInnerHTML={{ __html: project.fullContent }}
              style={{ marginBottom: 22 }}
            />
          </>
        )}

        {/* Outcomes */}
        {project.outcomes.length > 0 && (
          <>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 9.5, letterSpacing: "0.14em", color: "var(--c-text-dim)", textTransform: "uppercase", marginTop: 40, marginBottom: 12, fontWeight: 700 }}>
              Key Outcomes
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: project.fullCaseStudy ? 16 : 24 }}>
              {project.outcomes.map((o, k) => (
                <div key={k} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                  <span style={{ color: TEAL, fontFamily: "var(--font-mono)", fontSize: 13, flexShrink: 0 }}>—</span>
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
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 8 }}>
          {project.tags.map((t, ti) => (
            <span key={`${t}-${ti}`} className="pro-exp-outline" style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--c-text)", borderRadius: 999, padding: "10px 18px", whiteSpace: "nowrap" }}>
              {t}
            </span>
          ))}
        </div>

        {/* Buttons — View Full Case Study (View Live Site moved up above the gallery, see Summary) */}
        {(() => {
          const hasCaseStudy = (project.fullCaseStudy || project.fullCaseStudyContent) && caseStudyLive;
          if (!hasCaseStudy && !project.caseStudy) return null;
          return (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 40, marginBottom: 8 }}>
              {/* Case study is always primary (filled) when present */}
              {hasCaseStudy && (
                <button
                  onClick={() => onViewCaseStudy(project)}
                  className="hover:opacity-80 transition-opacity"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#0C1117", background: TEAL, border: "none", borderRadius: 999, padding: "8px 18px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, letterSpacing: "0.04em" }}>
                  {project.fullCaseStudyLocked && <Lock size={11} />}
                  View Full Case Study →
                </button>
              )}
              {project.caseStudy && (
                <a href={project.caseStudy} target="_blank" rel="noreferrer"
                  className="hover:opacity-70 transition-opacity"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--c-text-50)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
                  External case study →
                </a>
              )}
            </div>
          );
        })()}

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
                    className="group relative cursor-pointer"
                    style={{ aspectRatio: "16/9", borderRadius: 14, background: "var(--c-bg-card)", border: "0.5px solid var(--c-border-soft)", outline: "none", overflow: "hidden" }}
                  >
                    {vpCover ? (
                      <>
                        <FadeInImage
                          src={vpCover}
                          alt={vp.name}
                          sizes="(min-width: 1024px) 33vw, 100vw"
                          objectPosition={vp.coverImagePosition || "center"}
                          scale={vp.coverImageScale ?? 1}
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
                      <div className="absolute inset-0 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={DEFAULT_LOGO_URL} alt="" style={{ width: "30%", maxWidth: 90, opacity: 0.12, filter: "brightness(0) invert(1)" }} />
                      </div>
                    )}
                    <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(6,9,12,0.95) 0%, rgba(6,9,12,0.6) 38%, transparent 100%)" }} />
                    <div className="absolute left-4 right-4 bottom-4">
                      {vp.tags[0] && (
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em", color: TEAL, textTransform: "uppercase", marginBottom: 4 }}>
                          {vp.tags[0]}
                        </div>
                      )}
                      <div style={{
                        fontFamily: "var(--font-heading)", fontSize: 14.5, fontWeight: 500, color: TEAL, lineHeight: 1.25,
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                      }}>
                        {vp.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
