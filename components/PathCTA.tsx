"use client";

import { useState, useRef, useEffect, useActionState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, animate } from "motion/react";
import { Send, X, Phone, MessageCircle, ArrowUpRight, AlertCircle } from "lucide-react";
import { FaLinkedin, FaGithub, FaDribbble, FaBehance, FaInstagram, FaXTwitter, FaYoutube, FaFacebook } from "react-icons/fa6";
import { useContentStore, BUTTON_CORNER_RADIUS, BUTTON_SIZE_STYLE, DEFAULT_DESIGN_SYSTEM } from "@/store/contentStore";
import type { CMSSocials } from "@/store/contentStore";
import { Button, TextField, TextArea, Checkbox } from "@/components/SiteKit";
import { submitEnquiry } from "@/app/actions/contact";
import { pathKeyToUrl } from "@/lib/paths";

// Keep in sync with SOCIAL_PLATFORMS in DesignSystemSection.tsx (same 8 keys/order) — split into
// two copies since the admin list needs muted icons + CMSUrlInput fields and this one needs
// theme-aware icons + outbound links, but both should offer the same platform set.
const SOCIAL_LINKS: { key: keyof CMSSocials; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { key: "linkedin", label: "LinkedIn", Icon: FaLinkedin },
  { key: "github", label: "GitHub", Icon: FaGithub },
  { key: "dribbble", label: "Dribbble", Icon: FaDribbble },
  { key: "behance", label: "Behance", Icon: FaBehance },
  { key: "instagram", label: "Instagram", Icon: FaInstagram },
  { key: "x", label: "X (Twitter)", Icon: FaXTwitter },
  { key: "youtube", label: "YouTube", Icon: FaYoutube },
  { key: "facebook", label: "Facebook", Icon: FaFacebook },
];

const BUTTON_FONT_VAR = { heading: "var(--font-heading)", body: "var(--font-body)", mono: "var(--font-mono)" } as const;

const NEXT: Record<string, { path: string; label: string }> = {
  work:    { path: "process", label: "See My Process" },
  recruit: { path: "work",   label: "View My Work" },
  process: { path: "recruit", label: "Evaluate Me" },
  story:   { path: "work",   label: "View My Work" },
};

const PHONE = "+61 0458 941 417";
const PHONE_RAW = "+610458941417";

interface PathCTAProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  /** Compact mode: just the button + form, no heading/body/grid wrapper */
  compact?: boolean;
  /** In compact mode, renders this content above the button in the left column */
  heroContent?: React.ReactNode;
}

export function PathCTA({ currentPath, onNavigate, compact = false, heroContent }: PathCTAProps) {
  const { content } = useContentStore();
  const socialLinks = SOCIAL_LINKS
    .map((s) => ({ ...s, url: content.socials?.[s.key] }))
    .filter((s): s is typeof s & { url: string } => !!s.url);
  const [open, setOpen] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [animating, setAnimating] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitState, formAction, pending] = useActionState(submitEnquiry, null);
  // Separate from submitState.ok (which persists until the next submit attempt) so the "Message
  // sent" confirmation fades back to a reusable form after a few seconds instead of permanently
  // replacing it — matches the transient-confirmation pattern this panel already used.
  const [justSent, setJustSent] = useState(false);
  const next = NEXT[currentPath];

  useEffect(() => {
    if (submitState?.ok) {
      setJustSent(true);
      setName("");
      setEmail("");
      setMessage("");
      const t = setTimeout(() => setJustSent(false), 3000);
      return () => clearTimeout(t);
    }
  }, [submitState]);

  // The main CTA button keeps its own hand-tuned fly-in-plane animation (measures its DOM rect
  // via btnRef, so it can't be swapped for the generic <Button>), but still reads its corner/
  // font/size/icon-position from the Design System's Primary button config, same as every other
  // primary button on the site.
  const primaryStyle = content.designSystem.buttonStyles?.primary ?? DEFAULT_DESIGN_SYSTEM.buttonStyles.primary;
  const primarySize = BUTTON_SIZE_STYLE[primaryStyle.size];

  const btnRef = useRef<HTMLButtonElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const formAnchorRef = useRef<HTMLDivElement>(null);

  function handleClose() {
    setOpen(false);
    setContentReady(false);
    setAnimating(false);
    clearTimeout(timerRef.current);
  }

  async function handleOpen() {
    if (open || animating) return;
    const btn = btnRef.current;
    const anchor = formAnchorRef.current;
    if (!btn || !anchor) return;

    const bRect = btn.getBoundingClientRect();
    const aRect = anchor.getBoundingClientRect();

    const ix = bRect.right - 22;
    const iy = bRect.top + bRect.height / 2;

    // Target: the Send icon in the "Get in touch" header at the top of the form panel.
    // The anchor div is always in the DOM (even when form is closed), so its rect gives
    // us the exact position the form will grow from (transformOrigin: "top center").
    const formTargetX = aRect.left + 32;   // p-6 padding (24px) + icon center (8px)
    const formTargetY = aRect.top + 38;    // p-6 padding (24px) + header row center (14px)

    setAnimating(true);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    const plane = planeRef.current;
    if (!plane) { setAnimating(false); return; }

    await animate(plane, { x: ix, y: iy, rotate: 0, opacity: 1, scale: 1 }, { duration: 0 }).finished;

    // ── Smooth arc via cubic bezier ───────────────────────────────────────
    // Control points adapt to the relative position of the form header so the
    // arc rises naturally above the midpoint and arrives at a gentle downward
    // angle regardless of how far up/right the target is.
    const P0x = ix,  P0y = iy;
    const P1x = ix + (formTargetX - ix) * 0.3;
    const P1y = iy + (formTargetY - iy) * 0.2 - 60;   // peak above midpoint — launch arc
    const P2x = ix + (formTargetX - ix) * 0.72;
    const P2y = iy + (formTargetY - iy) * 0.8 + 18;   // slight overshoot before landing
    const P3x = formTargetX,  P3y = formTargetY;

    const N = 24;
    const kx: number[] = [], ky: number[] = [], kr: number[] = [];

    for (let i = 0; i <= N; i++) {
      const t = i / N, u = 1 - t;
      kx.push(u*u*u*P0x + 3*u*u*t*P1x + 3*u*t*t*P2x + t*t*t*P3x);
      ky.push(u*u*u*P0y + 3*u*u*t*P1y + 3*u*t*t*P2y + t*t*t*P3y);
    }

    for (let i = 0; i <= N; i++) {
      const a = Math.max(0, i - 1), b = Math.min(N, i + 1);
      kr.push(Math.atan2(ky[b] - ky[a], kx[b] - kx[a]) * 180 / Math.PI);
    }

    await animate(plane, { x: kx, y: ky, rotate: kr }, {
      duration: 0.9,
      ease: [0.25, 0.1, 0.25, 1],
      times: kx.map((_, i) => i / N),
    }).finished;

    // ── Open form (paper unfolds) + plane fades out together ────────────
    setOpen(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setContentReady(true), 850);

    await animate(plane, { opacity: 0, scale: 0.3 }, { duration: 0.35 }).finished;

    setAnimating(false);
  }

  // Shared: the button + form panel (used in both modes)
  const plane = (
    <>
      {/* Fixed-position plane — flies across the viewport during the loop */}
      {animating && (
        <div
          ref={planeRef}
          style={{
            position: "fixed",
            top: -10,
            left: -10,
            width: 20,
            height: 20,
            zIndex: 9999,
            pointerEvents: "none",
            color: "var(--c-teal)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            willChange: "transform",
          }}
        >
          <Send size={15} />
        </div>
      )}
    </>
  );

  const primaryIdleFill: React.CSSProperties =
    primaryStyle.fill === "fill"
      ? { background: "var(--btn-color)", color: "var(--c-bg)", border: "1px solid var(--btn-color)" }
      : primaryStyle.fill === "outline"
      ? { background: "transparent", color: "var(--btn-color)", border: "1px solid color-mix(in srgb, var(--btn-color) 40%, transparent)" }
      : { background: "transparent", color: "var(--btn-color)", border: "none" };

  const showIcon = !open && !animating;

  const button = (
    <motion.button
      ref={btnRef}
      layout
      onClick={handleOpen}
      className="flex items-center gap-3"
      style={{
        ...(open || animating
          ? { background: "rgba(20,173,181,0.08)", color: "var(--c-teal)", border: "1px solid rgba(20,173,181,0.2)" }
          : primaryIdleFill),
        fontFamily: BUTTON_FONT_VAR[primaryStyle.font],
        fontSize: primarySize.fontSize,
        padding: primarySize.padding,
        borderRadius: BUTTON_CORNER_RADIUS[primaryStyle.corner],
        fontWeight: 400,
        textTransform: primaryStyle.uppercase ? "uppercase" : "none",
        letterSpacing: primaryStyle.uppercase ? "0.06em" : "normal",
        cursor: open || animating ? "default" : "pointer",
        transition: "background 0.4s ease, color 0.4s ease, border 0.4s ease",
      }}
    >
      {showIcon && primaryStyle.icon === "left" && (
        <span style={{ display: "flex", alignItems: "center" }}>
          <Send size={14} />
        </span>
      )}
      Get in touch
      {showIcon && primaryStyle.icon === "right" && (
        <span style={{ display: "flex", alignItems: "center" }}>
          <Send size={14} />
        </span>
      )}
    </motion.button>
  );

  const formPanel = (
    <AnimatePresence>
      {open && (
        <motion.div
          key="form-panel"
          className="relative rounded-2xl"
          style={{
            background: "var(--c-bg-deep)",
            transformOrigin: "top center",
            overflow: "hidden",
          }}
          initial={{ scaleX: 0.04, scaleY: 0.12 }}
          animate={{ scaleX: 1, scaleY: 1 }}
          exit={{
            scaleX: 0.04,
            scaleY: 0.12,
            transition: { duration: 0.3, ease: [0.4, 0, 0.6, 1] },
          }}
          transition={{
            scaleX: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
            scaleY: { duration: 0.5,  ease: [0.16, 1, 0.3, 1], delay: 0.2 },
          }}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            <motion.rect
              x="0.75" y="0.75" width="98.5" height="98.5" rx="7" ry="7"
              fill="none" stroke="var(--c-teal)" strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: 0.7 }}
            />
          </svg>

          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <Send size={15} style={{ color: "var(--c-teal)" }} />
                <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "18px", color: "var(--c-text)", fontWeight: 400 }}>
                  Get in touch
                </h3>
              </div>
              <button
                onClick={handleClose}
                className="transition-opacity hover:opacity-60"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--c-text-muted)" }}
              >
                <X size={16} />
              </button>
            </div>

            <motion.form
              action={formAction}
              initial={{ opacity: 0 }}
              animate={{ opacity: contentReady ? 1 : 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-3"
            >
              {submitState?.error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.3)" }}>
                  <AlertCircle size={14} style={{ color: "#C0392B", flexShrink: 0 }} />
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--c-text)" }}>{submitState.error}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TextField required name="name" type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} style={{ fontSize: 16 }} />
                <TextField required name="email" type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ fontSize: 16 }} />
              </div>
              <TextArea required name="message" placeholder="Tell me about the opportunity or project…" value={message} onChange={(e) => setMessage(e.target.value)}
                rows={3} style={{ fontSize: 16, resize: "none" }} />

              <Checkbox
                checked={consent}
                onChange={setConsent}
                label="I agree to my information being stored and your information will not be shared with third parties."
              />

              <div className="flex flex-col sm:flex-row gap-3 mt-1 items-start sm:items-center">
                <Button type="submit" disabled={!consent || pending} icon={pending || justSent ? undefined : <Send size={12} />}>
                  {pending ? "Sending…" : justSent ? "Message sent" : "Send message"}
                </Button>
                <div className="hidden sm:block flex-shrink-0" style={{ width: "1px", height: "28px", background: "var(--c-border)" }} />
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                  <a href={`tel:${PHONE_RAW}`} className="flex items-center gap-2 transition-opacity hover:opacity-70"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--c-text-muted)", textDecoration: "none" }}>
                    <Phone size={12} style={{ color: "var(--c-teal)" }} />{PHONE}
                  </a>
                  <span className="hidden sm:inline" style={{ color: "var(--c-border-med)", fontSize: "12px" }}>·</span>
                  <a href={`https://wa.me/${PHONE_RAW.replace("+", "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 transition-opacity hover:opacity-70"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--c-text-muted)", textDecoration: "none" }}>
                    <MessageCircle size={12} style={{ color: "var(--c-teal)" }} />WhatsApp
                  </a>
                </div>
              </div>
            </motion.form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Compact mode: heroContent + button left, form opens top-right ────────
  if (compact) {
    return (
      <>
        {plane}
        <div className="grid md:grid-cols-2 gap-12 items-start">
          <div>
            {heroContent}
            <div className={heroContent ? "mt-8" : undefined}>
              {button}
            </div>
          </div>
          <div ref={formAnchorRef}>{formPanel}</div>
        </div>
      </>
    );
  }

  // ── Full mode: 2-column layout with heading + body ───────────────────────
  return (
    <>
      {plane}

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="px-8 md:px-16 mt-20 mb-20"
      >
        {/* Separates this CTA from whatever content precedes it on every path (Work's project
            list, Evaluate, Process, Story) — this component is shared across all of them. */}
        <div style={{ width: "100%", height: "0.5px", background: "var(--c-divider)", marginBottom: 56 }} />

        <div className="grid md:grid-cols-2 gap-12 items-start">

          {/* ── Left: heading + body + buttons ── */}
          <div>
            <h3
              className={content.evaluate.ctaHeadingMobile ? "hidden md:block hero-mobile-h3" : "hero-mobile-h3"}
              style={{
                fontFamily: "var(--font-heading)",
                fontStyle: "italic",
                fontSize: "clamp(28px, 4vw, 52px)",
                color: "var(--c-text)",
                fontWeight: 300,
                lineHeight: 1.15,
                marginBottom: "16px",
              }}
              dangerouslySetInnerHTML={{ __html: content.evaluate.ctaHeading }}
            />
            {content.evaluate.ctaHeadingMobile && (
              <h3
                className="block md:hidden"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontStyle: "italic",
                  fontSize: "clamp(28px, 4vw, 52px)",
                  color: "var(--c-text)",
                  fontWeight: 300,
                  lineHeight: 1.15,
                  marginBottom: "16px",
                }}
                dangerouslySetInnerHTML={{ __html: content.evaluate.ctaHeadingMobile }}
              />
            )}
            <div
              className={content.evaluate.ctaBodyMobile ? "rte-content hidden md:block" : "rte-content"}
              style={{ fontSize: "16px", color: "var(--c-text-muted)", marginBottom: "28px" }}
              dangerouslySetInnerHTML={{ __html: content.evaluate.ctaBody }}
            />
            {content.evaluate.ctaBodyMobile && (
              <div
                className="rte-content block md:hidden"
                style={{ fontSize: "16px", color: "var(--c-text-muted)", marginBottom: "28px" }}
                dangerouslySetInnerHTML={{ __html: content.evaluate.ctaBodyMobile }}
              />
            )}

            <div className="flex flex-wrap items-center gap-3">
              {button}

              {next && (
                <span style={{ position: "relative", display: "inline-flex" }}>
                  <Button variant="secondary" icon={<ArrowUpRight size={13} />}>
                    {next.label}
                  </Button>
                  {/* A real, crawlable link to the next path — layered over the Button, which
                      stays a plain <button> since it's shared by every non-navigational action
                      on the site (Send message, etc.) and isn't safe to turn into an <a>. */}
                  <Link href={pathKeyToUrl(next.path)} aria-label={next.label} className="absolute inset-0" />
                </span>
              )}
            </div>

            {socialLinks.length > 0 && (
              <div className="flex flex-col gap-3 mt-6">
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--c-text-muted)", letterSpacing: "0.04em" }}>
                  Follow me on Socials:
                </span>
                <div className="flex items-center gap-3">
                  {socialLinks.map(({ key, label, Icon, url }) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="transition-opacity hover:opacity-70"
                      style={{ color: "var(--c-text-muted)", display: "flex", width: 48, height: 48 }}
                    >
                      <Icon size={48} />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: form panel ── */}
          <div ref={formAnchorRef}>{formPanel}</div>
        </div>
      </motion.div>
    </>
  );
}
