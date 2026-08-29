"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, User } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FontSizeToggle } from "@/components/FontSizeToggle";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { useContentStore } from "@/store/contentStore";
import type { CMSHomeCard } from "@/store/contentStore";
import { pathKeyToUrl } from "@/lib/paths";

// cta/hoverLabel stay fixed (not CMS-editable, per the Home tab's scoped fields); question and
// description are pulled live from content.homepage.cards[id] at render time instead.
const CARDS: { id: keyof CMSHomeCardMap; cta: string; hoverLabel: string }[] = [
  { id: "work", cta: "Show me your work", hoverLabel: "View Portfolio" },
  { id: "recruit", cta: "Evaluate me", hoverLabel: "View Resume" },
  { id: "process", cta: "Show your process", hoverLabel: "View Process" },
  { id: "story", cta: "Get to know me", hoverLabel: "About Me" },
];

type CMSHomeCardMap = Record<"work" | "recruit" | "process" | "story", CMSHomeCard>;

interface HomePageProps {
  onSelect: (path: string) => void;
  onNameClick?: () => void;
  logoUrl: string;
}

export function HomePage({ onSelect, onNameClick, logoUrl }: HomePageProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { content } = useContentStore();
  const home = content.homepage;

  // A real <Link> (see the full-card overlay below) keeps each card genuinely crawlable —
  // Google reads the href directly out of the HTML, it doesn't wait 700ms for a click handler.
  // Human clicks still get the hand-tuned "select, fade the others, then transition" moment:
  // preventDefault on a plain left-click runs that first and navigates afterwards; a modified
  // click (new tab, etc.) is left alone so it behaves exactly like any other link.
  function handleSelect(e: MouseEvent, id: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    setSelectedId(id);
    setTimeout(() => onSelect(id), 700);
  }

  return (
    <motion.div
      className="min-h-screen flex flex-col justify-between px-8 pt-6 pb-16 md:px-16"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      style={{ background: "var(--background)", transition: "background 0.3s ease" }}
    >
      {/* Header — desktop: logo absolutely centred between the left text block and right
          icon cluster. Mobile: the icon cluster collapses into one hamburger menu (its hover-
          driven font-size dropdown and closely-packed icons don't work well as tap targets),
          and the text block moves from beside the logo to centred underneath it. */}
      <div className="hidden md:flex justify-between items-start" style={{ position: "relative" }}>
        <img
          src={logoUrl}
          alt="Jai Boekhout Design"
          className="nav-logo"
          style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", height: "48px", width: "auto", pointerEvents: "none" }}
        />
        <div className="flex flex-col gap-1">
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--c-text-muted)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Jai Boekhout — Portfolio
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--c-text-muted)",
              letterSpacing: "0.08em",
            }}
          >
            UX & Product Designer
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <FontSizeToggle />
          <button
            onClick={onNameClick}
            title="Admin"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "15px",
              margin: "-15px",
              color: "var(--c-text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "var(--c-teal)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "var(--c-text-muted)"; }}
          >
            <User size={21} />
          </button>
        </div>
      </div>

      <div className="flex md:hidden flex-col items-center" style={{ position: "relative" }}>
        <div style={{ position: "absolute", top: 0, right: 0 }}>
          <MobileNavMenu onAdminClick={() => onNameClick?.()} />
        </div>
        <img
          src={logoUrl}
          alt="Jai Boekhout Design"
          className="nav-logo"
          style={{ height: "40px", width: "auto", pointerEvents: "none" }}
        />
        <div className="flex flex-col items-center gap-1" style={{ marginTop: "10px" }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--c-text-muted)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            Jai Boekhout — Portfolio
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--c-text-muted)",
              letterSpacing: "0.08em",
              textAlign: "center",
            }}
          >
            UX & Product Designer
          </span>
        </div>
      </div>

      {/* Hero */}
      <div className="flex flex-col gap-6 max-w-3xl mx-auto w-full text-center mt-16 mb-8">
        <motion.h1
          className="hero-mobile-h1"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(52px, 8vw, 96px)",
            color: "var(--foreground)",
            lineHeight: 1.05,
            fontWeight: 400,
            letterSpacing: "-0.02em",
          }}
          dangerouslySetInnerHTML={{ __html: home.headline }}
        />
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "var(--muted-foreground)",
            lineHeight: 1.6,
            fontWeight: 300,
          }}
          dangerouslySetInnerHTML={{ __html: home.subheadline }}
        />
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          style={{
            fontFamily: "var(--font-heading)",
            fontStyle: "italic",
            fontSize: "32px",
            color: "var(--c-teal)",
            marginTop: "8px",
          }}
          dangerouslySetInnerHTML={{ __html: home.question }}
        />
      </div>

      {/* Cards Grid */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.55, ease: "easeOut" }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto w-full"
      >
        {CARDS.map((card, i) => {
          const isSelected = selectedId === card.id;
          const isFaded = selectedId !== null && !isSelected;
          const isHovered = hoveredId === card.id && !selectedId;
          const cardText = home.cards[card.id];

          return (
            <motion.div
              key={card.id}
              onHoverStart={() => setHoveredId(card.id)}
              onHoverEnd={() => setHoveredId(null)}
              animate={{
                opacity: isFaded ? 0 : 1,
                scale: isSelected ? 1.02 : isFaded ? 0.97 : 1,
                y: isHovered ? -3 : 0,
              }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="text-left relative overflow-hidden p-6 rounded-xl border"
              style={{
                background: "var(--card)",
                borderColor: isSelected
                  ? "var(--c-teal)"
                  : isHovered
                  ? "rgba(var(--c-teal-rgb), 0.6)"
                  : "var(--c-border-soft)",
                cursor: "pointer",
                minHeight: "160px",
                boxShadow: isSelected
                  ? "0 0 0 1px rgba(var(--c-teal-rgb), 0.4), 0 8px 32px rgba(0,0,0,0.4)"
                  : isHovered
                  ? `0 6px 24px rgba(0,0,0,0.12)`
                  : "none",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease",
              }}
            >
              {/* Number */}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  color: "var(--c-teal)",
                  opacity: 0.6,
                  letterSpacing: "0.1em",
                  display: "block",
                  marginBottom: "12px",
                }}
              >
                0{i + 1}
              </span>

              {/* Question */}
              <h3
                style={{
                  fontFamily: "var(--font-heading)",
                  fontSize: "clamp(16px, 1.5vw, 20px)",
                  color: "var(--foreground)",
                  lineHeight: 1.3,
                  fontWeight: 400,
                  marginBottom: "10px",
                  transition: "opacity 0.2s ease",
                  opacity: isHovered ? 0.5 : 1,
                }}
                dangerouslySetInnerHTML={{ __html: cardText.question }}
              />

              {/* Swappable: description ↔ hover label */}
              <div style={{ position: "relative", minHeight: "44px", marginBottom: "20px" }}>
                <AnimatePresence mode="wait" initial={false}>
                  {isHovered ? (
                    <motion.p
                      key="hover-label"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      className="flex items-center gap-2"
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontSize: "clamp(17px, 1.6vw, 21px)",
                        color: "var(--c-teal)",
                        fontWeight: 400,
                        lineHeight: 1.3,
                        position: "absolute",
                        top: 0,
                        left: 0,
                        margin: 0,
                      }}
                    >
                      {card.hoverLabel}
                      <ArrowRight size={16} />
                    </motion.p>
                  ) : (
                    <motion.p
                      key="description"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                      style={{
                        fontFamily: "var(--font-body)",
                        fontSize: "13px",
                        color: "var(--muted-foreground)",
                        lineHeight: 1.6,
                        fontWeight: 300,
                        position: "absolute",
                        top: 0,
                        left: 0,
                        margin: 0,
                      }}
                      dangerouslySetInnerHTML={{ __html: cardText.description }}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* CTA */}
              <motion.span
                className="flex items-center gap-2"
                animate={{ opacity: isHovered ? 0 : 1 }}
                transition={{ duration: 0.15 }}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                  color: "var(--c-teal)",
                  letterSpacing: "0.04em",
                }}
              >
                {card.cta}
                <ArrowRight size={12} />
              </motion.span>

              {/* Subtle teal glow on hover */}
              <motion.div
                className="absolute inset-0 pointer-events-none rounded-xl"
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  background: "radial-gradient(ellipse at 10% 90%, rgba(var(--c-teal-rgb), 0.04) 0%, transparent 55%)",
                }}
              />

              {/* Full-card link — a real, crawlable href; see handleSelect above for why this
                  isn't a plain onClick. */}
              <Link
                href={pathKeyToUrl(card.id)}
                aria-label={card.cta}
                className="absolute inset-0"
                style={{ borderRadius: "inherit" }}
                onClick={(e) => handleSelect(e, card.id)}
              />
            </motion.div>
          );
        })}
      </motion.div>

      {/* Footer */}
      <div className="flex justify-center mt-10">
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "var(--c-text-dim)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            textAlign: "center",
          }}
        >
          {content.global.location} · <span dangerouslySetInnerHTML={{ __html: home.footerNote }} />
        </span>
      </div>
    </motion.div>
  );
}
