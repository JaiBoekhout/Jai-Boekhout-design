"use client";

import { motion } from "motion/react";
import { useContentStore } from "@/store/contentStore";
import { PathCTA } from "@/components/PathCTA";

export function ExperienceStory({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { content } = useContentStore();
  const cms = content.story;

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
        {cms.interests.map((interest, i) => (
          <div
            key={interest.label}
            className="flex flex-col mb-5 pb-5"
            style={{ borderBottom: i < cms.interests.length - 1 ? "1px solid rgba(237,232,223,0.05)" : "none" }}
          >
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
            <div
              className="rte-content"
              style={{ fontSize: "13px", color: "var(--c-text-muted)" }}
              dangerouslySetInnerHTML={{ __html: interest.detail }}
            />
          </div>
        ))}
      </motion.div>

      {/* Quote */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
        className="mt-6 p-5 rounded-xl"
        style={{ background: "var(--c-bg-card)", border: "1px solid var(--c-border-soft)" }}
      >
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
      {/* Hero */}
      <div className="px-8 md:px-16 pt-20 pb-16 border-b" style={{ borderColor: "var(--c-border-soft)" }}>
        <motion.h1
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
        </motion.h1>
        <motion.h2
          className={cms.heroStatementMobile ? "hidden md:block hero-mobile-h2" : "hero-mobile-h2"}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(32px, 5vw, 64px)",
            color: "var(--c-text)",
            lineHeight: 1.1,
            fontWeight: 400,
            maxWidth: "700px",
          }}
          dangerouslySetInnerHTML={{ __html: cms.heroStatement }}
        />
        {cms.heroStatementMobile && (
          <motion.h2
            className="block md:hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            style={{
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(32px, 5vw, 64px)",
              color: "var(--c-text)",
              lineHeight: 1.1,
              fontWeight: 400,
              maxWidth: "700px",
            }}
            dangerouslySetInnerHTML={{ __html: cms.heroStatementMobile }}
          />
        )}
        <motion.p
          className={cms.subheadlineMobile ? "hidden md:block" : undefined}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "16px",
            color: "var(--c-text-muted)",
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
              color: "var(--c-text-muted)",
              lineHeight: 1.7,
              fontWeight: 300,
              maxWidth: "480px",
              marginTop: "16px",
            }}
            dangerouslySetInnerHTML={{ __html: cms.subheadlineMobile }}
          />
        )}
      </div>

      <div className="px-8 md:px-16 mt-16 grid md:grid-cols-5 gap-16">
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
          <div className="relative">
            <div
              className="absolute left-14 top-0 bottom-0 w-px"
              style={{ background: "var(--c-border-xs)" }}
            />
            {[...cms.timeline].reverse().map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex gap-6 mb-10 relative"
              >
                {/* Year — paddingRight keeps the text clear of the dot, which sits at a fixed
                    x-position (left: 56px below) regardless of how wide the year text is */}
                <div className="flex flex-col items-end" style={{ minWidth: "56px", flexShrink: 0 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "11px",
                      color: "var(--c-teal)",
                      marginTop: "3px",
                      paddingRight: "8px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.year}
                  </span>
                </div>

                {/* Dot */}
                <div
                  className="absolute"
                  style={{
                    left: "56px",
                    top: "5px",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "var(--c-teal)",
                    transform: "translateX(-50%)",
                    boxShadow: "0 0 0 3px var(--c-bg), 0 0 12px rgba(20,173,181,0.31)",
                  }}
                />

                {/* Content */}
                <div className="pl-6 flex-1">
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
                    className="rte-content"
                    style={{ fontSize: "14px", color: "var(--c-text-muted)" }}
                    dangerouslySetInnerHTML={{ __html: item.body }}
                  />
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
                separate grid row) so it sits flush against the photo/caption regardless of how
                tall the Timeline column happens to be — a sibling grid item in its own row-gap'd
                row can only ever start after the *entire* row (sized by Timeline) finishes, which
                left a large gap here whenever Timeline was taller than the photo, empty-caption
                or not. Mobile keeps its own copy below instead, since there Timeline still needs
                to sit between the photo and this sidebar. */}
            <div className={`hidden md:block${cms.portraitCaption ? " mt-10" : ""}`}>{interestsSidebar}</div>
          </div>
        )}

        {/* Sidebar: Interests — mobile-only when a portrait exists (desktop copy lives nested
            under the photo above); the only copy at all when there's no portrait. */}
        <div className={`md:col-start-4 md:col-span-2${cms.portraitImageUrl ? " md:hidden" : ""}`}>{interestsSidebar}</div>
      </div>
      <PathCTA currentPath="story" onNavigate={onNavigate} />
    </motion.div>
  );
}
