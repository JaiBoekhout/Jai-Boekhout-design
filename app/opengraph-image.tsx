import { ImageResponse } from "next/og";
import { getContent } from "@/store/serverContent";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Jai Boekhout — UX & Product Design";

// A route handler generating an image from CMS data would otherwise be statically pre-rendered
// at build time and frozen (the exact bug fixed in app/not-found.tsx this same session) — unlike
// that special synthetic route, force-dynamic actually takes effect here, so a Branding → Social
// Share Image change (or removal) shows up immediately without a redeploy.
export const dynamic = "force-dynamic";

// Generated at request time from the site's own brand tokens (rather than a static file) so it
// can't silently drift out of sync with the real name/title/palette used everywhere else — unless
// a custom image is set (Design System → Branding → Social Share Image), in which case that photo
// is used directly, cropped to the focal point chosen there.
export default async function OpengraphImage() {
  const { branding } = await getContent();

  if (branding.ogImageUrl) {
    try {
      // Inlined as a data URI rather than passed as a bare remote <img src> — reliable across
      // every render environment this route might run in, same technique Next's own docs use
      // for local assets, just applied to a Blob-hosted one instead.
      const res = await fetch(branding.ogImageUrl);
      if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
      const buf = await res.arrayBuffer();
      const base64 = Buffer.from(buf).toString("base64");
      const dataUrl = `data:${res.headers.get("content-type") || "image/jpeg"};base64,${base64}`;

      return new ImageResponse(
        (
          <div style={{ width: "100%", height: "100%", display: "flex", overflow: "hidden" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUrl}
              width={size.width}
              height={size.height}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: branding.ogImagePosition || "50% 50%",
              }}
            />
          </div>
        ),
        { ...size }
      );
    } catch {
      // Falls through to the generated card below rather than a broken/blank share image.
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#0C1117",
          backgroundImage:
            "radial-gradient(circle at 88% 18%, rgba(20,173,181,0.16), transparent 55%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 44,
          }}
        >
          <div style={{ width: 34, height: 2, background: "#14ADB5", display: "flex" }} />
          <span
            style={{
              fontSize: 20,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#14ADB5",
              fontFamily: "sans-serif",
            }}
          >
            UX &amp; Product Design
          </span>
        </div>
        <div
          style={{
            fontSize: 96,
            color: "#EDE8DF",
            fontFamily: "sans-serif",
            fontWeight: 600,
            letterSpacing: -2,
            lineHeight: 1.05,
            display: "flex",
          }}
        >
          Jai Boekhout
        </div>
        <div
          style={{
            fontSize: 30,
            color: "#9AA7AE",
            fontFamily: "sans-serif",
            marginTop: 28,
            display: "flex",
          }}
        >
          Adelaide, Australia — 10+ years in UX, web design &amp; creative technology
        </div>
      </div>
    ),
    { ...size }
  );
}
