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
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
