"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useContentStore } from "@/store/contentStore";
import { useHideOnScroll } from "@/store/useHideOnScroll";
import { PathCTA } from "@/components/PathCTA";

// Matches the public top bar's rendered height (app/(public)/(experience)/layout.tsx) — the
// stepper sticks right below it when shown, and slides up to top:0 when the bar hides, using
// the same useHideOnScroll() hook so both stay in sync without any prop-passing.
const TOP_BAR_HEIGHT = 64;

export function ExperienceProcess({ onNavigate }: { onNavigate: (path: string) => void }) {
  // A Set (not a single value) — each step opens/closes independently, so opening one never
  // closes another. A shared single-open-id used to mean opening any step below an already-open
  // one collapsed that other step at the same instant, yanking the just-clicked step (and
  // everything below it) upward as the space above it disappeared — exactly the "title jumps
  // when I click it" bug this was rewritten to fix.
  const [openSteps, setOpenSteps] = useState<Set<string>>(() => new Set(["problem"]));
  const { content } = useContentStore();
  const cmsSteps = content.process.steps;
  const topBarHidden = useHideOnScroll();
  const stepperRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  // Measured (not hardcoded) so it stays correct across font-scale changes, which resize the
  // stepper's own text/circles — used as each panel's scroll-margin-top so scrollIntoView lands
  // it just below the sticky stepper instead of underneath it.
  const [stepperHeight, setStepperHeight] = useState(0);

  useEffect(() => {
    const el = stepperRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setStepperHeight(entry.contentRect.height));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function toggleStep(id: string) {
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Selecting a step from the sticky nav opens its panel (without closing any other — see
  // openSteps above) and scrolls it into view right below the stepper, so a step further down
  // the page doesn't open off-screen. No delay needed before scrolling: since opening this step
  // never collapses a different one, nothing above it is still moving.
  function goToStep(id: string) {
    setOpenSteps((prev) => new Set(prev).add(id));
    panelRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

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
          Path 03 — Process
        </motion.h1>
        <motion.h2
          className={content.process.heroStatementMobile ? "hidden md:block hero-mobile-h2" : "hero-mobile-h2"}
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
          dangerouslySetInnerHTML={{ __html: content.process.heroStatement }}
        />
        {content.process.heroStatementMobile && (
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
            dangerouslySetInnerHTML={{ __html: content.process.heroStatementMobile }}
          />
        )}
      </div>

      {/* Process Steps */}
      <div className="px-8 md:px-16 mt-12 flex flex-col items-center">
        {/* Flow connector — sticky, functioning as a mini nav while scrolling the accordion
            below. Follows the top bar's own hide/show state (same hook, independently
            computed from the same scroll position) so it slides up to fill the gap once
            the top bar hides, rather than leaving an empty band above it. */}
        <div
          ref={stepperRef}
          className="flex items-center justify-center gap-0 mb-12 overflow-x-auto pt-4 pb-2 w-full max-w-3xl lg:max-w-[1000px] sticky z-30"
          style={{
            top: topBarHidden ? 0 : TOP_BAR_HEIGHT,
            transition: "top 0.3s ease",
            background: "var(--c-bg)",
          }}
        >
          {cmsSteps.map((step, i) => (
            <div key={step.id} className="flex items-center flex-shrink-0">
              <button
                onClick={() => goToStep(step.id)}
                className="flex flex-col items-center gap-1 md:gap-2 transition-opacity hover:opacity-80 min-w-[36px] md:min-w-[80px]"
              >
                <span
                  className="text-[10px] md:text-xs"
                  style={{
                    fontFamily: "var(--font-mono)",
                    color: openSteps.has(step.id) ? "var(--c-teal)" : "var(--c-text-dim)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {"0" + (i + 1)}
                </span>
                <div
                  className="w-6 h-6 md:w-9 md:h-9"
                  style={{
                    borderRadius: "50%",
                    border: `1px solid ${openSteps.has(step.id) ? "var(--c-teal)" : "var(--c-surface-10)"}`,
                    background: openSteps.has(step.id) ? "rgba(160,142,200,0.12)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s",
                  }}
                >
                  <span className="text-[10px] md:text-xs" style={{ color: openSteps.has(step.id) ? "var(--c-teal)" : "var(--c-text-muted)" }}>
                    {step.title.charAt(0)}
                  </span>
                </div>
                {/* Title — hidden on mobile so the full step row fits the screen width without
                    horizontal scroll; the number + circle initial above stay as the compact
                    mobile identifier, full label returns at md: and up. */}
                <span
                  className="hidden md:block"
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "12px",
                    color: openSteps.has(step.id) ? "var(--c-text)" : "var(--c-text-muted)",
                    fontWeight: 400,
                  }}
                >
                  {step.title}
                </span>
              </button>
              {i < cmsSteps.length - 1 && (
                <div
                  className="mx-0.5 md:mx-1 min-w-[8px] md:min-w-[20px]"
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "var(--c-border)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-2 max-w-3xl lg:max-w-[1000px] w-full">
          {cmsSteps.map((step, i) => (
            <motion.div
              key={step.id}
              ref={(el) => { panelRefs.current[step.id] = el; }}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
              // Always reserves space as if the top bar were visible, even though it's
              // conditionally hidden — useHideOnScroll shows it again on *any* upward scroll
              // (no threshold), so goToStep's own scroll-up reliably brings it back before
              // landing. Reserving less here would size this correctly for an instant where
              // the bar happens to be hidden, then have the bar slide back over the panel's
              // header the moment our scroll starts moving.
              style={{ scrollMarginTop: TOP_BAR_HEIGHT + stepperHeight + 16 }}
            >
              <button
                className="w-full text-left p-5 rounded-xl border transition-colors"
                style={{
                  background: "rgba(160,142,200,0.06)",
                  borderColor: "rgba(160,142,200,0.3)",
                }}
                onClick={() => toggleStep(step.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "10px",
                        color: "var(--c-teal)",
                        opacity: 0.7,
                        minWidth: "24px",
                      }}
                    >
                      {"0" + (i + 1)}
                    </span>
                    <div>
                      <h3
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontSize: "20px",
                          color: "var(--c-text)",
                          fontWeight: 400,
                        }}
                      >
                        {step.title}
                      </h3>
                      <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--c-text-muted)", fontWeight: 300 }}>
                        {step.tagline}
                      </p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: openSteps.has(step.id) ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={16} style={{ color: "var(--c-text-muted)" }} />
                  </motion.div>
                </div>

                <AnimatePresence>
                  {openSteps.has(step.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      {/* pl-9 (desktop only) aligns this content under the title, which itself
                          sits right of the number/circle badge in the header row above — on
                          mobile that extra left inset isn't needed and just made the left/right
                          padding around the Example box uneven (wider on the left). */}
                      <div className="pt-5 pl-0 md:pl-9 grid md:grid-cols-5 gap-6">
                        {/* Left column: description then Methods & Activities, stacked in
                            normal flow so the list sits a fixed 30px under the description
                            regardless of how tall the Example box next to them runs — a
                            shared grid row would instead clamp the list to start only once
                            the taller of the two columns finishes. */}
                        <div className="md:col-span-3">
                          <div
                            className="rte-content"
                            style={{ color: "var(--c-text-body)", marginBottom: "30px" }}
                            dangerouslySetInnerHTML={{ __html: step.description }}
                          />
                          <p
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "10px",
                              color: "var(--c-teal)",
                              letterSpacing: "0.1em",
                              textTransform: "uppercase",
                              marginBottom: "10px",
                            }}
                          >
                            Methods & Activities
                          </p>
                          {step.activities.map((a) => (
                            <div key={a} className="flex items-center gap-2 mb-2">
                              <span style={{ color: "var(--c-teal)", fontSize: "10px" }}>·</span>
                              <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--c-text-body)", fontWeight: 300 }}>
                                {a}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div
                          className="md:col-span-2 p-4 rounded-lg"
                          style={{ background: "var(--c-surface-3)", border: "1px solid rgba(237,232,223,0.04)" }}
                        >
                          <p
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "10px",
                              color: "var(--c-teal)",
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              marginBottom: "8px",
                            }}
                          >
                            Example
                          </p>
                          <div
                            className="rte-content"
                            style={{ fontSize: "13px", color: "var(--c-text-muted)", fontStyle: "italic" }}
                            dangerouslySetInnerHTML={{ __html: step.example }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          ))}
        </div>

        {/* Closing Quote */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 p-5 rounded-xl max-w-3xl lg:max-w-[1000px] w-full"
          style={{ background: "var(--c-bg-card)", border: "1px solid var(--c-border-soft)" }}
        >
          <div
            className={content.process.closingQuoteMobile ? "rte-content rte-quote hidden md:block" : "rte-content rte-quote"}
            style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontSize: "16px", color: "var(--c-text)" }}
            dangerouslySetInnerHTML={{ __html: content.process.closingQuote }}
          />
          {content.process.closingQuoteMobile && (
            <div
              className="rte-content rte-quote block md:hidden"
              style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontSize: "16px", color: "var(--c-text)" }}
              dangerouslySetInnerHTML={{ __html: content.process.closingQuoteMobile }}
            />
          )}
        </motion.div>
      </div>
      <PathCTA currentPath="process" onNavigate={onNavigate} />
    </motion.div>
  );
}
