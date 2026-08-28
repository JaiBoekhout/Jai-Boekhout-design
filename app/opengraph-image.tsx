import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Jai Boekhout — UX & Product Design";

// Generated at request time from the site's own brand tokens (rather than a static file) so it
// can't silently drift out of sync with the real name/title/palette used everywhere else.
export default async function OpengraphImage() {
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
