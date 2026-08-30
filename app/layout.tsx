import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { InlineScript } from "@/components/InlineScript";
import { getContent } from "@/store/serverContent";
import { ContentProvider } from "@/store/ContentProvider";
import {
  buildDesignSystemCss,
  DEFAULT_FAVICON_URL,
  DEFAULT_FAVICON_PNG_URL,
  DEFAULT_FAVICON_SVG_URL,
  DEFAULT_APPLE_TOUCH_ICON_URL,
} from "@/store/contentStore";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jaiboekhout.nl";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Jai Boekhout — UX & Product Design",
    template: "%s — Jai Boekhout",
  },
  description:
    "Portfolio of Jai Boekhout, UX & Product Designer based in Adelaide, Australia. 10+ years of experience in UX, web design, and creative technology.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_AU",
    url: SITE_URL,
    siteName: "Jai Boekhout — UX & Product Design",
    title: "Jai Boekhout — UX & Product Design",
    description:
      "Portfolio of Jai Boekhout, UX & Product Designer based in Adelaide, Australia. 10+ years of experience in UX, web design, and creative technology.",
    // Image comes from app/opengraph-image.tsx (Next's file convention) — generated from the
    // site's own brand tokens at request time, so it's picked up automatically without needing
    // a manual `images` entry here.
  },
  twitter: {
    card: "summary_large_image",
    title: "Jai Boekhout — UX & Product Design",
    description:
      "Portfolio of Jai Boekhout, UX & Product Designer based in Adelaide, Australia.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialContent = await getContent();
  // Same CMSSocials object PathCTA.tsx's public "Follow me on Socials" row reads — now that
  // this layout fetches real content server-side, the Person JSON-LD's sameAs list can finally
  // be wired up to it directly instead of the hand-maintained empty array this used to be stuck
  // with (back when the real values only lived in client-side localStorage).
  const sameAs = Object.values(initialContent.socials).filter((url): url is string => Boolean(url));
  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Jai Boekhout",
    jobTitle: "UX & Product Designer",
    url: SITE_URL,
    sameAs,
    address: {
      "@type": "PostalAddress",
      addressLocality: "Adelaide",
      addressCountry: "AU",
    },
    knowsAbout: [
      "UX Design",
      "Product Design",
      "Web Design",
      "User Research",
      "Interaction Design",
    ],
  };
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        {/* Plain, statically-rendered tags we fully own — not Next's own app/favicon.ico
            metadata convention, which renders via its internal metadata system and can fight
            with (and silently revert) any client-side href change made to it. The actual files
            live in public/ (root, for legacy browser/crawler fallback conventions) as plain
            static assets, no metadata processing involved. Hrefs come from the same
            server-fetched content as everything else — DesignSystemStyle.tsx (a client
            component, mounted further down the tree) re-targets these same ids if a Design
            System change lands later in the same session. Standard 4-icon set matching what a
            favicon generator produces. */}
        <link rel="icon" type="image/png" sizes="96x96" id="cms-favicon-png" href={initialContent.branding.faviconPngUrl || DEFAULT_FAVICON_PNG_URL} />
        <link rel="icon" type="image/svg+xml" id="cms-favicon-svg" href={initialContent.branding.faviconSvgUrl || DEFAULT_FAVICON_SVG_URL} />
        <link rel="shortcut icon" id="cms-favicon-ico" href={initialContent.branding.faviconUrl || DEFAULT_FAVICON_URL} />
        <link rel="apple-touch-icon" sizes="180x180" id="cms-apple-touch-icon" href={initialContent.branding.appleTouchIconUrl || DEFAULT_APPLE_TOUCH_ICON_URL} />
        <InlineScript html={`(function(){try{var t=localStorage.getItem('portfolio_theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`} />
        <InlineScript html={`(function(){try{var s=parseInt(localStorage.getItem('portfolio_font_scale')||'0',10);var pct={0:100,1:112.5,2:125}[s]||100;document.documentElement.style.zoom=pct+'%';}catch(e){}})();`} />
        {/* Real Design System CSS, computed server-side from the same content the rest of the
            page uses — same id DesignSystemStyle.tsx (a client component) targets to keep this
            in sync with any later same-session edit, so there's exactly one <style id="cms-
            design-system"> tag throughout the page's life, not a client-created duplicate. */}
        <style id="cms-design-system" dangerouslySetInnerHTML={{ __html: buildDesignSystemCss(initialContent.designSystem) }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </head>
      <body
        suppressHydrationWarning
        style={{ background: "var(--c-bg)", minHeight: "100vh", transition: "background 0.3s ease" }}
      >
        <ContentProvider initialContent={initialContent}>
          {children}
        </ContentProvider>
        <Analytics />
      </body>
    </html>
  );
}
