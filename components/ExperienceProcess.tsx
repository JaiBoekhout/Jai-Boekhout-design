"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useContentStore } from "@/store/contentStore";
import { useHideOnScroll } from "@/store/useHideOnScroll";
import { PathCTA } from "@/components/PathCTA";

// Matches the public top bar's rendered height (app/(public)/page.tsx) — the stepper
// sticks right below it when shown, and slides up to top:0 when the bar hides, using
// the same useHideOnScroll() hook so both stay in sync without any prop-passing.
const TOP_BAR_HEIGHT = 64;

export function ExperienceProcess({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [openStep, setOpenStep] = useState<string | null>("problem");
  const { content } = useContentStore();
  const cmsSteps = content.process.steps;
  const topBarHidden = useHideOnScroll();

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
          Path 03 — Process
        </motion.span>
        <motion.h1
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
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "16px",
            color: "var(--c-text-muted)",
            lineHeight: 1.7,
            fontWeight: 300,
            maxWidth: "540px",
            marginTop: "16px",
          }}
        >
          {content.process.heroSubheading || "My design process is structured but not rigid. Each project shapes how I apply these principles. Select any stage to explore how I work."}
        </motion.p>
      </div>

      {/* Process Steps */}
      <div className="px-8 md:px-16 mt-12 flex flex-col items-center">
        {/* Flow connector — sticky, functioning as a mini nav while scrolling the accordion
            below. Follows the top bar's own hide/show state (same hook, independently
            computed from the same scroll position) so it slides up to fill the gap once
            the top bar hides, rather than leaving an empty band above it. */}
        <div
          className="hidden md:flex items-center justify-center gap-0 mb-12 overflow-x-auto pt-4 pb-2 w-full max-w-3xl lg:max-w-[900px] sticky z-30"
          style={{
            top: topBarHidden ? 0 : TOP_BAR_HEIGHT,
            transition: "top 0.3s ease",
            background: "var(--c-bg)",
          }}
        >
          {cmsSteps.map((step, i) => (
            <div key={step.id} className="flex items-center flex-shrink-0">
              <button
                onClick={() => setOpenStep(openStep === step.id ? null : step.id)}
                className="flex flex-col items-center gap-2 transition-opacity hover:opacity-80"
                style={{ minWidth: "80px" }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "12px",
                    color: openStep === step.id ? "var(--c-teal)" : "var(--c-text-dim)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {"0" + (i + 1)}
                </span>
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    border: `1px solid ${openStep === step.id ? "var(--c-teal)" : "var(--c-surface-10)"}`,
                    background: openStep === step.id ? "rgba(160,142,200,0.12)" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.3s",
                  }}
                >
                  <span style={{ fontSize: "12px", color: openStep === step.id ? "var(--c-teal)" : "var(--c-text-muted)" }}>
                    {step.title.charAt(0)}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: "12px",
                    color: openStep === step.id ? "var(--c-text)" : "var(--c-text-muted)",
                    fontWeight: 400,
                  }}
                >
                  {step.title}
                </span>
              </button>
              {i < cmsSteps.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    background: "var(--c-border)",
                    margin: "0 4px",
                    minWidth: "20px",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Accordion */}
        <div className="flex flex-col gap-2 max-w-3xl lg:max-w-[900px] w-full">
          {cmsSteps.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.06 }}
            >
              <button
                className="w-full text-left p-5 rounded-xl border transition-colors"
                style={{
                  background: "rgba(160,142,200,0.06)",
                  borderColor: "rgba(160,142,200,0.3)",
                }}
                onClick={() => setOpenStep(openStep === step.id ? null : step.id)}
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
                    animate={{ rotate: openStep === step.id ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={16} style={{ color: "var(--c-text-muted)" }} />
                  </motion.div>
                </div>

                <AnimatePresence>
                  {openStep === step.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-5 pl-9 grid md:grid-cols-5 gap-6">
                        <div className="md:col-span-3">
                          <div
                            className="rte-content"
                            style={{ color: "var(--c-text-body)", marginBottom: "16px" }}
                            dangerouslySetInnerHTML={{ __html: step.description }}
                          />
                          <div
                            className="p-4 rounded-lg"
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
                        <div className="md:col-span-2">
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
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          ))}
        </div>
      </div>
      <PathCTA currentPath="process" onNavigate={onNavigate} />
    </motion.div>
  );
}
