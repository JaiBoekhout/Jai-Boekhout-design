import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lighthouse flagged three render-blocking stylesheets (27 KiB) on the critical path. Inlining
  // them into <style> tags removes that request waterfall — the styles arrive with the HTML, so
  // the browser can paint without a round trip first.
  //
  // The trade-off (per node_modules/next/dist/docs/.../inlineCss.md) is that inlined CSS can't be
  // cached separately, so returning visitors re-download it per page. That's the right side of the
  // trade here: the CSS is small and Tailwind-atomic, and a portfolio's traffic is mostly
  // first-time visitors, who are exactly who the render-blocking cost falls on.
  experimental: {
    inlineCss: true,
  },
  // ── Redirects from the old WordPress site ────────────────────────────────────────────────
  // Every project lived under /portfolio/<permalink> there. These are the URLs Search Console
  // still lists as 404s, mapped to the project each one became; the permalinks were written by
  // hand back then, so most differ from the slug the CMS generates now.
  //
  // permanent: true is a 308 (Next uses 307/308 rather than 302/301 so the request method is
  // preserved), which tells Google to pass the old page's ranking on to the new one.
  //
  // The two catch-alls at the end are deliberately last — redirects are matched in array order,
  // so every specific mapping above wins first, and anything else under the old portfolio tree
  // lands on the Work index instead of a 404. /about is NOT here: app/(public)/about/page.tsx
  // already redirects it to /evaluate, and splitting that across two mechanisms would just make
  // it harder to find.
  async redirects() {
    return [
      { source: "/portfolio/goffee-coffee-mandalay", destination: "/work/goffee-coffee", permanent: true },
      { source: "/portfolio/open-studio-australia", destination: "/work/open-studios-australia", permanent: true },
      { source: "/portfolio/ux-design-car-rental-prototype", destination: "/work/evolve", permanent: true },
      { source: "/portfolio/the-zythologist-brewed-by-science", destination: "/work/zythologist", permanent: true },
      { source: "/portfolio/aquaponics-systems", destination: "/work/aquaponics", permanent: true },
      { source: "/portfolio/prototype-game", destination: "/work/labyrinth-game", permanent: true },
      { source: "/portfolio/alliance-metal", destination: "/work/alliance-metal", permanent: true },
      { source: "/portfolio/ct-filtration", destination: "/work/ct-filtration", permanent: true },
      { source: "/portfolio/aurin-yoga-centrum", destination: "/work/aurin-yoga-centrum", permanent: true },
      { source: "/portfolio/annosky", destination: "/work/annosky", permanent: true },
      { source: "/portfolio/shadow-creek-winery", destination: "/work/shadow-creek", permanent: true },
      { source: "/portfolio", destination: "/work", permanent: true },
      { source: "/portfolio/:path*", destination: "/work", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
