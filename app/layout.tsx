import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { InlineScript } from "@/components/InlineScript";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jaiboekhout.com";

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

// Hand-maintained rather than read from the CMS: the real social links live in client-side
// localStorage (store/contentStore.ts, "use client") and aren't reliably readable from this
// server component. Update this array to match Design System → Socials whenever those change.
// The public "Follow me on Socials" row (PathCTA.tsx) reads the live CMS value directly and
// doesn't have this limitation — this is purely a server-rendered-metadata constraint.
const SAME_AS: string[] = [];

const personJsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Jai Boekhout",
  jobTitle: "UX & Product Designer",
  url: SITE_URL,
  sameAs: SAME_AS,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="antialiased" suppressHydrationWarning>
      <head>
        {/* Plain, statically-rendered tags we fully own — not Next's own app/favicon.ico
            metadata convention, which renders via its internal metadata system and can fight
            with (and silently revert) any client-side href change made to it. The actual files
            live in public/ (root, for legacy browser/crawler fallback conventions) as plain
            static assets, no metadata processing involved. Client-side code below targets
            these exact ids. Standard 4-icon set matching what a favicon generator produces. */}
        <link rel="icon" type="image/png" sizes="96x96" id="cms-favicon-png" href="/favicon-96x96.png" />
        <link rel="icon" type="image/svg+xml" id="cms-favicon-svg" href="/favicon.svg" />
        <link rel="shortcut icon" id="cms-favicon-ico" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" id="cms-apple-touch-icon" href="/apple-touch-icon.png" />
        <InlineScript html={`(function(){try{var t=localStorage.getItem('portfolio_theme');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`} />
        <InlineScript html={`(function(){try{var s=parseInt(localStorage.getItem('portfolio_font_scale')||'0',10);var pct={0:100,1:112.5,2:125}[s]||100;document.documentElement.style.zoom=pct+'%';}catch(e){}})();`} />
        {/* Applies any saved Design System colors/fonts before first paint — mirrors
            buildDesignSystemCss() in store/contentStore.ts so there's no flash of default
            styling while React hydrates. Duplicated here (rather than imported) because this
            has to run as a plain synchronous script, before any JS bundle loads. */}
        <InlineScript html={`(function(){try{
              var raw = localStorage.getItem('portfolio_cms_content');
              if(!raw) return;
              var content = JSON.parse(raw);
              var ds = content && content.designSystem;
              if(!ds || !ds.colors) return;
              var c = ds.colors;
              var pairings = {
                modern:    { h: "'Poppins', sans-serif", b: "'DM Sans', sans-serif", m: "'DM Mono', monospace" },
                editorial: { h: "'Fraunces', serif", b: "'DM Sans', sans-serif", m: "'DM Mono', monospace" },
                technical: { h: "'Space Grotesk', sans-serif", b: "'DM Sans', sans-serif", m: "'Space Mono', monospace" }
              };
              var f = pairings[ds.fontPairing] || pairings.modern;
              function hexToRgb(hex){
                var m = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec((hex||'').trim());
                if(!m) return '20, 173, 181';
                return parseInt(m[1],16) + ', ' + parseInt(m[2],16) + ', ' + parseInt(m[3],16);
              }
              var cc = ds.componentColors || {};
              var componentVarMap = [
                ['--btn-color', 'buttonDark', 'buttonLight'],
                ['--link-color', 'linkDark', 'linkLight'],
                ['--link-hover-color', 'linkHoverDark', 'linkHoverLight'],
                ['--label-color', 'labelDark', 'labelLight'],
                ['--field-color', 'fieldDark', 'fieldLight'],
                ['--textarea-color', 'textareaDark', 'textareaLight'],
                ['--checkbox-color', 'checkboxDark', 'checkboxLight'],
                ['--radio-color', 'radioDark', 'radioLight'],
                ['--switch-color', 'switchDark', 'switchLight'],
                ['--menu-color', 'menuDark', 'menuLight'],
                ['--tabbar-color', 'tabBarDark', 'tabBarLight']
              ];
              // A role with no literal hex override follows whichever accent swatch it's set
              // to track (defaulting to the primary Accent) — mirrors resolveFollow() in
              // store/contentStore.ts's buildDesignSystemCss().
              function resolveFollow(role, mode) {
                var follow = (cc.followAccent && cc.followAccent[role]) || 'accent';
                if (follow === 'accent2') return mode === 'Dark' ? c.accent2Dark : c.accent2Light;
                if (follow === 'accent3') return mode === 'Dark' ? c.accent3Dark : c.accent3Light;
                return mode === 'Dark' ? c.accentDark : c.accentLight;
              }
              var darkComponentVars = '', lightComponentVars = '';
              for (var i = 0; i < componentVarMap.length; i++) {
                var row = componentVarMap[i];
                var role = row[1].replace(/Dark$/, '');
                var darkVal = cc[row[1]] || resolveFollow(role, 'Dark');
                var lightVal = cc[row[2]] || resolveFollow(role, 'Light');
                if (darkVal) darkComponentVars += row[0] + ':' + darkVal + ';';
                if (lightVal) lightComponentVars += row[0] + ':' + lightVal + ';';
              }
              var underline = ds.linkUnderline || 'none';
              var linkCss =
                '.site-link{text-decoration:' + (underline === 'always' ? 'underline' : 'none') + ';}' +
                '.site-link:hover{text-decoration:' + (underline === 'none' ? 'none' : 'underline') + ';}';
              var css =
                ':root{' +
                  '--c-teal:' + c.accentDark + ';--c-teal-rgb:' + hexToRgb(c.accentDark) + ';--primary:' + c.accentDark + ';--sidebar-primary:' + c.accentDark + ';' +
                  '--c-heading:' + c.headingDark + ';--c-text:' + c.textDark + ';--c-text-dim:' + c.textDark + ';--foreground:' + c.textDark + ';--card-foreground:' + c.textDark + ';' +
                  '--c-text-muted:' + c.mutedDark + ';--muted-foreground:' + c.mutedDark + ';--c-text-body:' + c.bodyDark + ';' +
                  '--c-bg:' + c.bgDark + ';--background:' + c.bgDark + ';--c-bg-card:' + c.cardDark + ';--card:' + c.cardDark + ';--c-divider:' + c.dividerDark + ';' +
                  '--font-heading:' + f.h + ';--font-body:' + f.b + ';--font-mono:' + f.m + ';' +
                  darkComponentVars +
                '}' +
                ':root[data-theme="light"]{' +
                  '--c-teal:' + c.accentLight + ';--c-teal-rgb:' + hexToRgb(c.accentLight) + ';--primary:' + c.accentLight + ';--sidebar-primary:' + c.accentLight + ';' +
                  '--c-heading:' + c.headingLight + ';--c-text:' + c.textLight + ';--c-text-dim:' + c.textLight + ';--foreground:' + c.textLight + ';--card-foreground:' + c.textLight + ';' +
                  '--c-text-muted:' + c.mutedLight + ';--muted-foreground:' + c.mutedLight + ';--c-text-body:' + c.bodyLight + ';' +
                  '--c-bg:' + c.bgLight + ';--background:' + c.bgLight + ';--c-bg-card:' + c.cardLight + ';--card:' + c.cardLight + ';--c-divider:' + c.dividerLight + ';' +
                  lightComponentVars +
                '}' +
                linkCss;
              var style = document.createElement('style');
              style.id = 'cms-design-system';
              style.textContent = css;
              document.head.appendChild(style);

              var branding = content && content.branding;
              if(branding){
                var faviconMap = [
                  ['cms-favicon-png', branding.faviconPngUrl],
                  ['cms-favicon-svg', branding.faviconSvgUrl],
                  ['cms-favicon-ico', branding.faviconUrl],
                  ['cms-apple-touch-icon', branding.appleTouchIconUrl]
                ];
                for (var j = 0; j < faviconMap.length; j++) {
                  if (!faviconMap[j][1]) continue;
                  var favLink = document.getElementById(faviconMap[j][0]);
                  if (favLink) favLink.href = faviconMap[j][1];
                }
              }
            }catch(e){}})();`} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
      </head>
      <body
        suppressHydrationWarning
        style={{ background: "var(--c-bg)", minHeight: "100vh", transition: "background 0.3s ease" }}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
