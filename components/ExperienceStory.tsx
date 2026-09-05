"use client";

import { motion } from "motion/react";
import { useContentStore } from "@/store/contentStore";
import { PathCTA } from "@/components/PathCTA";
import { HeroOverlayLayer, STORY_HERO_OVERLAY_DEFAULTS } from "@/components/HeroOverlayFields";

export function ExperienceStory({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { content } = useContentStore();
  const cms = content.story;
  const hasHeroPhoto = !!cms.heroImageUrl;

  // Rendered in two different spots depending on viewport (see the Profile Image / Sidebar
  // grid items below) — extracted once so both stay in sync.
  const interestsSidebar = (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--c-teal)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: "16px",
          }}
        >
          {cms.interestsHeading || "Outside of Design"}
        </p>
        {cms.interests.map((interest, i) => {
          return (
            <div
              key={i}
              className="flex flex-col mb-5 pb-5"
              style={{ borderBottom: i < cms.interests.length - 1 ? "1px solid rgba(237,232,223,0.05)" : "none" }}
            >
              {/* Label — only rendered when set. Jai's real "Outside of Design" entry already
                  builds its own collapsed-by-default accordion (Kitesurfing/Freediving/
                  Travelling, each a native <details data-icon="chevron"> block styled in
                  globals.css) directly inside `detail`'s rich text, with an empty top-level
                  label — so this section must not wrap the whole detail block in a second,
                  redundant expand/collapse control on top of that. */}
              {interest.label && (
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: "17px",
                    color: "var(--c-text)",
                    fontWeight: 400,
                    marginBottom: "4px",
                  }}
                >
                  {interest.label}
                </span>
              )}
              <div
                className={`rte-content ${interest.detailMobile ? "hidden md:block" : ""}`}
                style={{ fontSize: "13px", color: "var(--c-text-muted)" }}
                dangerouslySetInnerHTML={{ __html: interest.detail }}
              />
              {interest.detailMobile && (
                <div
                  className="rte-content block md:hidden"
                  style={{ fontSize: "13px", color: "var(--c-text-muted)" }}
                  dangerouslySetInnerHTML={{ __html: interest.detailMobile }}
                />
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Quote — flanked by thin teal divider lines rather than a bordered card, matching the
          flush divider-based treatment already applied to the Stats bar and Skills section. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-8"
      >
        <div style={{ height: "1px", background: "rgba(20,173,181,0.3)", marginBottom: "20px" }} />
        <div
          className={cms.closingQuoteMobile ? "rte-content rte-quote hidden md:block" : "rte-content rte-quote"}
          style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontSize: "16px", color: "var(--c-text)" }}
          dangerouslySetInnerHTML={{ __html: cms.closingQuote }}
        />
        {cms.closingQuoteMobile && (
          <div
            className="rte-content rte-quote block md:hidden"
            style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontSize: "16px", color: "var(--c-text)" }}
            dangerouslySetInnerHTML={{ __html: cms.closingQuoteMobile }}
          />
        )}
        <div style={{ height: "1px", background: "rgba(20,173,181,0.3)", marginTop: "20px" }} />
      </motion.div>
    </>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen pb-32"
      style={{ background: "var(--c-bg)" }}
    >
      {/* Hero — falls back to today's plain background when no photo is set in the CMS. With a
          photo set, it becomes a full-bleed banner with the same proven dark-gradient-over-photo
          treatment already used for legible on-image text elsewhere (FeaturedProjects.tsx
          cards), so text color switches to a fixed light tone instead of the theme-flipping
          var(--c-text)/var(--c-text-muted) — a dark overlay needs light text regardless of
          which site theme is active. */}
      <div
        className={`relative px-8 md:px-16 ${hasHeroPhoto ? "pt-32 pb-20 md:pt-44 md:pb-24" : "pt-20 pb-16 border-b"} overflow-hidden`}
        style={{ borderColor: hasHeroPhoto ? undefined : "var(--c-border-soft)" }}
      >
        <HeroOverlayLayer data={cms} defaults={STORY_HERO_OVERLAY_DEFAULTS} />
        {/* Capped and centered independently of the full-bleed photo above, which stays edge to
            edge — see the same pattern in ExperienceWork.tsx/ExperienceProcess.tsx/
            ExperienceRecruiter.tsx. */}
        <div className="relative max-w-[1280px] mx-auto">
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
            Path 04 — Story
          </motion.p>
          <motion.h1
            className={cms.heroStatementMobile ? "hidden md:block hero-mobile-h2" : "hero-mobile-h2"}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            style={{
              fontFamily: "var(--font-heading)",
              // Not the actual rendered size (every span in this rich-text field carries its own
              // explicit font-size) — small and neutral so it never inflates the invisible per-line
              // "strut" CSS reserves for a line whose real content is smaller than this. See the
              // matching comment in ExperienceWork.tsx for the full explanation.
              fontSize: hasHeroPhoto ? "clamp(36px, 5.5vw, 68px)" : "16px",
              color: hasHeroPhoto ? "#F5F1EA" : "var(--c-text)",
              lineHeight: 1.1,
              fontWeight: 400,
              maxWidth: hasHeroPhoto ? "800px" : "700px",
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
                fontSize: "clamp(32px, 5vw, 64px)",
                color: hasHeroPhoto ? "#F5F1EA" : "var(--c-text)",
                lineHeight: 1.1,
                fontWeight: 400,
                maxWidth: "700px",
              }}
              dangerouslySetInnerHTML={{ __html: cms.heroStatementMobile }}
            />
          )}
          <motion.p
            className={cms.subheadlineMobile ? "hidden md:block" : ""}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "16px",
              color: hasHeroPhoto ? "rgba(245,241,234,0.75)" : "var(--c-text-muted)",
              lineHeight: 1.7,
              fontWeight: 300,
              maxWidth: "480px",
              marginTop: "16px",
            }}
            dangerouslySetInnerHTML={{ __html: cms.subheadline }}
          />
          {cms.subheadlineMobile && (
            <motion.p
              className="block md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "16px",
                color: hasHeroPhoto ? "rgba(245,241,234,0.75)" : "var(--c-text-muted)",
                lineHeight: 1.7,
                fontWeight: 300,
                maxWidth: "480px",
                marginTop: "16px",
              }}
              dangerouslySetInnerHTML={{ __html: cms.subheadlineMobile }}
            />
          )}
        </div>
      </div>

      <div className="px-8 md:px-16 mt-16 grid md:grid-cols-5 gap-16 max-w-[1280px] mx-auto">
        {/* Timeline */}
        <div className="md:col-start-1 md:col-span-3">
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "10px",
              color: "var(--c-teal)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              marginBottom: "28px",
            }}
          >
            {cms.timelineHeading || "The Journey"}
          </p>
          <div>
            {[...cms.timeline].reverse().map((item, i, arr) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex gap-6 md:gap-10 pb-8 mb-8"
                style={{ borderBottom: i < arr.length - 1 ? "1px solid var(--c-border-soft)" : "none" }}
              >
                {/* Year — large italic serif, same treatment as the reference's timeline years */}
                <div style={{ minWidth: "72px", flexShrink: 0 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontStyle: "italic",
                      fontSize: "clamp(26px, 3.2vw, 34px)",
                      color: "var(--c-teal)",
                      lineHeight: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.year}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "9px",
                      color: "var(--c-teal)",
                      opacity: 0.6,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    {item.tag}
                  </span>
                  <h3
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: "20px",
                      color: "var(--c-text)",
                      fontWeight: 400,
                      marginBottom: "8px",
                    }}
                  >
                    {item.title}
                  </h3>
                  <div
                    className={`rte-content ${item.bodyMobile ? "hidden md:block" : ""}`}
                    style={{ fontSize: "14px", color: "var(--c-text-muted)" }}
                    dangerouslySetInnerHTML={{ __html: item.body }}
                  />
                  {item.bodyMobile && (
                    <div
                      className="rte-content block md:hidden"
                      style={{ fontSize: "14px", color: "var(--c-text-muted)" }}
                      dangerouslySetInnerHTML={{ __html: item.bodyMobile }}
                    />
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Profile Image — a separate grid item (not nested in the Interests sidebar below) so
            it can be independently reordered: order-first puts it above the Timeline/"The
            Journey" section on mobile, while md:order-none + explicit column/row placement
            restores its normal spot above Interests in the desktop sidebar column. */}
        {cms.portraitImageUrl && (
          <div className="order-first md:order-none md:col-start-4 md:col-span-2 md:row-start-1 mb-10">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="rounded-2xl overflow-hidden mx-auto md:mx-0"
              style={{ border: "1px solid var(--c-border-soft)", aspectRatio: "3/4", maxWidth: "50%" }}
            >
              <div
                role="img"
                aria-label="Jai Boekhout"
                className="w-full h-full"
                style={{
                  backgroundImage: `url(${cms.portraitImageUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: cms.portraitImagePosition || "center",
                  transform: `scale(${cms.portraitImageScale ?? 1})`,
                  transformOrigin: cms.portraitImagePosition || "center",
                  filter: "brightness(0.9) saturate(0.95)",
                }}
              />
            </motion.div>
            {cms.portraitCaption && (
              <div
                className={cms.portraitCaptionMobile ? "rte-content hidden md:block text-center md:text-left" : "rte-content text-center md:text-left"}
                style={{ fontSize: "12px", color: "var(--c-text-muted)", marginTop: "12px" }}
                dangerouslySetInnerHTML={{ __html: cms.portraitCaption }}
              />
            )}
            {cms.portraitCaptionMobile && (
              <div
                className="rte-content block md:hidden text-center"
                style={{ fontSize: "12px", color: "var(--c-text-muted)", marginTop: "12px" }}
                dangerouslySetInnerHTML={{ __html: cms.portraitCaptionMobile }}
              />
            )}
            {/* Desktop-only: nested directly under the photo (in normal document flow, not a
                separate grid row) so it sits a fixed 60px below the photo/caption regardless of
                how tall the Timeline column happens to be — a sibling grid item in its own
                row-gap'd row can only ever start after the *entire* row (sized by Timeline)
                finishes, which left a large gap here whenever Timeline was taller than the photo.
                Mobile keeps its own copy below instead, since there Timeline still needs to sit
                between the photo and this sidebar. */}
            <div className="hidden md:block mt-[60px]">{interestsSidebar}</div>
          </div>
        )}

        {/* Sidebar: Interests — mobile-only when a portrait exists (desktop copy lives nested
            under the photo above); the only copy at all when there's no portrait. */}
        <div className={`md:col-start-4 md:col-span-2${cms.portraitImageUrl ? " md:hidden" : ""}`}>{interestsSidebar}</div>
      </div>
      <PathCTA currentPath="story" onNavigate={onNavigate} stackedButtons />
    </motion.div>
  );
}
