"use client";

import { useState, useRef, useEffect, useActionState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, animate, useReducedMotion } from "motion/react";
import { Send, X, Phone, MessageCircle, ArrowUpRight, AlertCircle, Check } from "lucide-react";
import { FaLinkedin, FaGithub, FaDribbble, FaBehance, FaInstagram, FaXTwitter, FaYoutube, FaFacebook } from "react-icons/fa6";
import { useContentStore, BUTTON_CORNER_RADIUS, BUTTON_SIZE_STYLE, DEFAULT_DESIGN_SYSTEM } from "@/store/contentStore";
import type { CMSSocials } from "@/store/contentStore";
import { Button, TextField, TextArea, Checkbox } from "@/components/SiteKit";
import { submitEnquiry } from "@/app/actions/contact";
import { pathKeyToUrl } from "@/lib/paths";
import { demoteNestedBlocks } from "@/lib/utils";

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
  /** Full-width, stacked buttons (Get in touch above, next-path button below) instead of the
      default side-by-side row — used by the Story page to match its magazine-style layout.
      Defaults to false so every other path (Work, Evaluate, Process) is unaffected. Only
      changes the button-group wrapper's layout; the buttons themselves, the flying-plane
      animation, and the form panel are untouched. */
  stackedButtons?: boolean;
}

export function PathCTA({ currentPath, onNavigate, compact = false, heroContent, stackedButtons = false }: PathCTAProps) {
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
  // Captured before the fields are cleared, so the thank-you can greet them by name.
  const [sentName, setSentName] = useState("");
  const reduceMotion = useReducedMotion();
  const next = NEXT[currentPath];

  useEffect(() => {
    if (!submitState?.ok) return;
    // Greet them by first name, captured before the fields are cleared below.
    setSentName(name.trim().split(/\s+/)[0] ?? "");
    setJustSent(true);
    setName("");
    setEmail("");
    setMessage("");
    // Long enough to read the thank-you, then the plane carries it away and the panel folds up.
    const t = setTimeout(() => { void flyHomeAndClose(); }, 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setJustSent(false);
    clearTimeout(timerRef.current);
  }

  // Where the plane starts and lands. The anchor div is always in the DOM (even while the form is
  // closed), so its rect gives the exact spot the panel grows from.
  function buttonPoint() {
    const b = btnRef.current!.getBoundingClientRect();
    return { x: b.right - 22, y: b.top + b.height / 2 };
  }
  function formPoint() {
    const a = formAnchorRef.current!.getBoundingClientRect();
    return { x: a.left + 32, y: a.top + 38 }; // p-6 padding + icon/header-row centre
  }

  // ── Smooth arc via cubic bezier ───────────────────────────────────────────
  // Control points adapt to the relative position of the two ends, so the arc rises above the
  // midpoint and arrives at a gentle angle whichever way it is flying. Pulled out of handleOpen
  // so the return flight after a send is the same curve in reverse rather than a second copy.
  async function flyPlane(from: { x: number; y: number }, to: { x: number; y: number }) {
    const plane = planeRef.current;
    if (!plane) return;

    await animate(plane, { x: from.x, y: from.y, rotate: 0, opacity: 1, scale: 1 }, { duration: 0 }).finished;

    const P1x = from.x + (to.x - from.x) * 0.3;
    const P1y = from.y + (to.y - from.y) * 0.2 - 60;   // peak above midpoint — launch arc
    const P2x = from.x + (to.x - from.x) * 0.72;
    const P2y = from.y + (to.y - from.y) * 0.8 + 18;   // slight overshoot before landing

    const N = 24;
    const kx: number[] = [], ky: number[] = [], kr: number[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, u = 1 - t;
      kx.push(u*u*u*from.x + 3*u*u*t*P1x + 3*u*t*t*P2x + t*t*t*to.x);
      ky.push(u*u*u*from.y + 3*u*u*t*P1y + 3*u*t*t*P2y + t*t*t*to.y);
    }
    // Nose points along the path.
    for (let i = 0; i <= N; i++) {
      const a = Math.max(0, i - 1), b = Math.min(N, i + 1);
      kr.push(Math.atan2(ky[b] - ky[a], kx[b] - kx[a]) * 180 / Math.PI);
    }

    await animate(plane, { x: kx, y: ky, rotate: kr }, {
      duration: 0.9,
      ease: [0.25, 0.1, 0.25, 1],
      times: kx.map((_, i) => i / N),
    }).finished;
  }

  async function handleOpen() {
    if (open || animating) return;
    if (!btnRef.current || !formAnchorRef.current) return;

    const from = buttonPoint();
    const to = formPoint();

    setAnimating(true);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    if (!planeRef.current) { setAnimating(false); return; }

    await flyPlane(from, to);

    // ── Open form (paper unfolds) + plane fades out together ────────────
    setOpen(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setContentReady(true), 850);

    await animate(planeRef.current, { opacity: 0, scale: 0.3 }, { duration: 0.35 }).finished;
    setAnimating(false);
  }

  // The message leaving: the plane flies back out of the panel to the "Get in touch" button it
  // came from, and the panel folds away behind it. Both end points are measured BEFORE the panel
  // closes, so the flight starts from where the form actually was.
  async function flyHomeAndClose() {
    const btn = btnRef.current, anchor = formAnchorRef.current;
    // Phones get the thank-you and nothing else. The return flight is a fixed-position element
    // animated across viewport coordinates, which is exactly the kind of thing mobile browsers
    // disrupt mid-flight — collapsing chrome and the on-screen keyboard dismissing after a submit
    // both move the viewport out from under it, so the plane visibly jumped. The outbound flight
    // on open is untouched; nothing is moving the viewport at that moment.
    const onPhone = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
    if (!btn || !anchor || reduceMotion || onPhone) {
      handleClose();
      return;
    }
    const from = formPoint();
    const to = buttonPoint();

    setAnimating(true);
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    if (!planeRef.current) { handleClose(); return; }

    setOpen(false);
    setContentReady(false);

    await flyPlane(from, to);
    await animate(planeRef.current, { opacity: 0, scale: 0.3 }, { duration: 0.3 }).finished;

    setAnimating(false);
    setJustSent(false);
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

  // layout="size" (not the bare `layout` shorthand, which tracks position too) — this only
  // needs to smoothly animate the button's own width when showIcon toggles the Send icon on
  // open/close. The plain `layout` prop also animates the button's Y position whenever it moves
  // in the page's normal flow for any unrelated reason (e.g. content above it changing height,
  // like the FAQ list expanding via "Show All") — reads as the button jumping into place late,
  // out of sync with everything else that reflows instantly around it.
  const button = (
    <motion.button
      ref={btnRef}
      layout="size"
      onClick={open ? handleClose : handleOpen}
      className={`flex items-center gap-3${stackedButtons ? " w-full justify-center" : ""}`}
      style={{
        ...(open || animating
          ? { background: "color-mix(in srgb, var(--c-teal) 8%, transparent)", color: "var(--c-teal)", border: "1px solid color-mix(in srgb, var(--c-teal) 20%, transparent)" }
          : primaryIdleFill),
        fontFamily: BUTTON_FONT_VAR[primaryStyle.font],
        fontSize: primarySize.fontSize,
        padding: primarySize.padding,
        borderRadius: BUTTON_CORNER_RADIUS[primaryStyle.corner],
        fontWeight: 400,
        textTransform: primaryStyle.uppercase ? "uppercase" : "none",
        letterSpacing: primaryStyle.uppercase ? "0.06em" : "normal",
        cursor: animating ? "default" : "pointer",
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
          className="relative"
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
              x="0.75" y="0.75" width="98.5" height="98.5" rx="0" ry="0"
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

            {justSent ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex flex-col items-center text-center gap-2"
                style={{ padding: "18px 8px 12px" }}
                role="status"
                aria-live="polite"
              >
                <div
                  style={{
                    width: 42, height: 42, borderRadius: "50%", display: "flex",
                    alignItems: "center", justifyContent: "center", color: "var(--c-teal)",
                    background: "color-mix(in srgb, var(--c-teal) 14%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--c-teal) 35%, transparent)",
                  }}
                >
                  <Check size={20} />
                </div>
                <h4 style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 500, color: "var(--c-text)", margin: 0 }}>
                  {sentName ? `Thanks, ${sentName}!` : "Thanks!"}
                </h4>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 14, lineHeight: 1.5, color: "var(--c-text-muted)", margin: 0, maxWidth: 320 }}>
                  Your message is on its way — I&rsquo;ll get back to you soon.
                </p>
              </motion.div>
            ) : (
            <motion.form
              action={formAction}
              initial={{ opacity: 0 }}
              animate={{ opacity: contentReady ? 1 : 0 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col gap-3"
            >
              {submitState?.error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--destructive) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--destructive) 30%, transparent)" }}>
                  <AlertCircle size={14} style={{ color: "var(--destructive)", flexShrink: 0 }} />
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
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                  <a href={`tel:${PHONE_RAW}`} className="flex items-center gap-2 transition-opacity hover:opacity-70"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "14px", color: "var(--c-text-muted)", textDecoration: "none" }}>
                    <Phone size={17} style={{ color: "var(--c-teal)" }} />{PHONE}
                  </a>
                  <span className="hidden sm:inline" style={{ color: "var(--c-border-med)", fontSize: "12px" }}>·</span>
                  <a href={`https://wa.me/${PHONE_RAW.replace("+", "")}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 transition-opacity hover:opacity-70"
                    style={{ fontFamily: "var(--font-mono)", fontSize: "14px", color: "var(--c-text-muted)", textDecoration: "none" }}>
                    <MessageCircle size={17} style={{ color: "var(--c-teal)" }} />WhatsApp
                  </a>
                </div>
              </div>
            </motion.form>
            )}
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

      {/* Anchor target for /contact, which the old site had as its own page and Google still has
          indexed — next.config.ts redirects it to /work#contact. Only the full (non-compact)
          variant carries the id, and Evaluate's hero renders the compact one, so it stays unique
          per page. scrollMarginTop keeps the heading clear of the sticky top bar, which would
          otherwise sit over it once the browser jumps here. */}
      <motion.div
        id="contact"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{ scrollMarginTop: 88 }}
        className="px-8 md:px-16 mt-20 mb-20 max-w-[1280px] mx-auto"
      >
        {/* Separates this CTA from whatever content precedes it on every path (Work's project
            list, Evaluate, Process, Story) — this component is shared across all of them. */}
        <div style={{ width: "100%", height: "0.5px", background: "var(--c-divider)", marginBottom: 56 }} />

        <div className="grid md:grid-cols-2 gap-12 items-start">

          {/* ── Left: heading + body + buttons ── */}
          <div>
            <h3
              className={`cta-heading ${content.evaluate.ctaHeadingMobile ? "hidden md:block hero-mobile-h3" : "hero-mobile-h3"}`}
              style={{
                fontFamily: "var(--font-heading)",
                fontStyle: "italic",
                fontSize: "clamp(28px, 4vw, 52px)",
                color: "var(--c-text)",
                fontWeight: 300,
                lineHeight: 1.15,
                marginBottom: "16px",
              }}
              dangerouslySetInnerHTML={{ __html: demoteNestedBlocks(content.evaluate.ctaHeading) }}
            />
            {content.evaluate.ctaHeadingMobile && (
              <h3
                className="cta-heading block md:hidden"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontStyle: "italic",
                  fontSize: "clamp(28px, 4vw, 52px)",
                  color: "var(--c-text)",
                  fontWeight: 300,
                  lineHeight: 1.15,
                  marginBottom: "16px",
                }}
                dangerouslySetInnerHTML={{ __html: demoteNestedBlocks(content.evaluate.ctaHeadingMobile) }}
              />
            )}
            <div
              className={content.evaluate.ctaBodyMobile ? "cta-body rte-content hidden md:block" : "cta-body rte-content"}
              style={{ fontSize: "16px", color: "var(--c-text-muted)", marginBottom: "28px" }}
              dangerouslySetInnerHTML={{ __html: content.evaluate.ctaBody }}
            />
            {content.evaluate.ctaBodyMobile && (
              <div
                className="cta-body rte-content block md:hidden"
                style={{ fontSize: "16px", color: "var(--c-text-muted)", marginBottom: "28px" }}
                dangerouslySetInnerHTML={{ __html: content.evaluate.ctaBodyMobile }}
              />
            )}

            <div className={stackedButtons ? "flex flex-col items-stretch gap-3" : "flex flex-wrap items-center gap-3"}>
              {button}

              {next && (
                <span style={{ position: "relative", display: stackedButtons ? "flex" : "inline-flex" }}>
                  <Button
                    variant="secondary"
                    icon={<ArrowUpRight size={13} />}
                    style={stackedButtons ? { width: "100%", justifyContent: "center" } : undefined}
                  >
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
