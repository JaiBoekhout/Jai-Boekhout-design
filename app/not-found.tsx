"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useContentStore } from "@/store/contentStore";
import { ThemeProvider } from "@/store/themeStore";
import { FontScaleProvider } from "@/store/fontScaleStore";
import { DesignSystemStyle } from "@/components/DesignSystemStyle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/SiteKit";

// Copy/image are CMS-editable (Design System → 404 Page) rather than hardcoded, so this stays
// on-brand without a code change — colors/fonts already come from the same Design System tokens
// every other page uses, applied globally by the inline script in app/layout.tsx.
export default function NotFound() {
  const { content } = useContentStore();
  const nf = content.notFound;

  return (
    <ThemeProvider>
    <FontScaleProvider>
      <DesignSystemStyle />
      <div
        className="min-h-screen flex flex-col items-center justify-center px-8 py-16 text-center"
        style={{ background: "var(--c-bg)", transition: "background 0.3s ease" }}
      >
        <div className="fixed top-6 right-6 md:top-8 md:right-8">
          <ThemeToggle />
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
            color: "var(--c-text)",
            fontWeight: 400,
            lineHeight: 1.1,
            marginBottom: "16px",
          }}
        >
          {nf.heading || "Page not found"}
        </h1>

        <div
          className="rte-content"
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

        <Link href="/">
          <Button icon={<ArrowLeft size={13} />}>{nf.buttonLabel || "Back to home"}</Button>
        </Link>
      </div>
    </FontScaleProvider>
    </ThemeProvider>
  );
}
