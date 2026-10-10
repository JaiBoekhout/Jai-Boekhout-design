// The site's public origin — the one place it's defined.
//
// Everything that has to emit an absolute URL reads this: metadataBase and the Open Graph tags
// (app/layout.tsx), the sitemap's <loc> entries (app/sitemap.ts), the Sitemap: line in robots.txt
// (app/robots.ts), and the BreadcrumbList structured data on a project page
// (app/(public)/(experience)/work/[slug]/page.tsx). It used to be a separate copy of the same
// expression in each of those four files, which is exactly the kind of thing that goes stale in
// three places during a domain move.
//
// Per-page canonicals stay RELATIVE (`alternates: { canonical: "/work" }`) — Next resolves those
// against metadataBase, so they follow this automatically and must not be made absolute.
//
// NEXT_PUBLIC_SITE_URL overrides it, for preview deployments that need to describe themselves
// rather than production. Be aware that setting it in the hosting environment BEATS the fallback
// below — if production is serving the wrong domain in its canonicals, that variable is where to
// look first, not this file.
//
// Trailing slashes are stripped because every caller builds paths as `${SITE_URL}/work`; a
// variable set with one would otherwise produce `https://example.com//work`.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.jaiboekhout.nl").replace(/\/+$/, "");
