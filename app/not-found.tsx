"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useContentStore } from "@/store/contentStore";
import { ThemeProvider } from "@/store/themeStore";
import { StyleThemeProvider } from "@/store/styleThemeStore";
import { FontScaleProvider } from "@/store/fontScaleStore";
import { DesignSystemStyle } from "@/components/DesignSystemStyle";
import { ThemeDropdown } from "@/components/ThemeDropdown";
import { Button } from "@/components/SiteKit";

// Copy/image are CMS-editable (Design System → 404 Page) rather than hardcoded, so this stays
// on-brand without a code change — colors/fonts already come from the same Design System tokens
// every other page uses, applied globally by the inline script in app/layout.tsx.
//
// The special root not-found boundary gets statically pre-rendered into one /404 HTML file at
// build time — confirmed live (production was serving x-vercel-cache: HIT / x-matched-path: /404,
// hours stale) — same as any other page, and `export const dynamic = "force-dynamic"` does NOT
// change that classification for this specific synthetic route (tried it; the build's route
// summary still listed /_not-found as static). `next dev` never statically prerenders anything,
// which is why this never showed up locally — only in an actual production build/deploy. Without
// a workaround, every CMS edit to the 404 page's copy/image/graphic stays invisible on the live
// site until the next deployment, no matter how many times it's saved.
//
// Since the framework won't let this route re-render per-request, this instead forces the
// content this component already reads (via useContentStore()) to refetch itself immediately
// after the frozen static shell hydrates — reusing the exact event persistContent() itself
// dispatches after a real save (see store/useContentStoreHook.ts), so no change to that shared
// hook is needed. First paint briefly shows whatever was live at the last deployment; within one
// network round trip it swaps to the actual current content.
function useForceFreshContent() {
  useEffect(() => {
    window.dispatchEvent(new Event("cms_content_updated"));
  }, []);
}

export default function NotFound() {
  const { content } = useContentStore();
  const nf = content.notFound;
  useForceFreshContent();

  return (
    <ThemeProvider>
    <StyleThemeProvider>
    <FontScaleProvider>
      <DesignSystemStyle />
      <div
        className="min-h-screen flex flex-col items-center justify-center px-8 py-16 text-center"
        style={{ background: "var(--c-bg)", transition: "background 0.3s ease" }}
      >
        <div className="fixed top-6 right-6 md:top-8 md:right-8 flex items-center gap-3">
          <ThemeDropdown />
        </div>

        {nf.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={nf.imageUrl} alt="" style={{ width: "100%", maxWidth: 160, marginBottom: 32 }} />
        )}

        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            color: "var(--c-teal)",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            marginBottom: "20px",
          }}
        >
          {nf.eyebrow || "404"}
        </p>

        <h1
          className="hero-mobile-h3"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: "clamp(32px, 5vw, 52px)",
            color: "var(--c-teal)",
            fontWeight: 400,
            lineHeight: 1.1,
            marginBottom: "16px",
          }}
        >
          {nf.heading || "Page not found"}
        </h1>

        <div
          className={`rte-content ${nf.bodyMobile ? "hidden md:block" : ""}`}
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "16px",
            color: "var(--c-text-muted)",
            fontWeight: 300,
            maxWidth: "440px",
            lineHeight: 1.6,
            marginBottom: "36px",
          }}
          dangerouslySetInnerHTML={{
            __html: nf.body || "The page you're looking for doesn't exist or may have moved.",
          }}
        />
        {nf.bodyMobile && (
          <div
            className="rte-content block md:hidden"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: "16px",
              color: "var(--c-text-muted)",
              fontWeight: 300,
              maxWidth: "440px",
              lineHeight: 1.6,
              marginBottom: "36px",
            }}
            dangerouslySetInnerHTML={{ __html: nf.bodyMobile }}
          />
        )}

        <Link href="/">
          <Button icon={<ArrowLeft size={13} />}>{nf.buttonLabel || "Back to home"}</Button>
        </Link>
      </div>
    </FontScaleProvider>
    </StyleThemeProvider>
    </ThemeProvider>
  );
}
