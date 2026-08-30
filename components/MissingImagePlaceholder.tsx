import { DEFAULT_LOGO_URL } from "@/store/contentStore";

// Logo + "Coming Soon" — shown wherever a project card/section expects an image (cover,
// featured-grid slot) that hasn't been set yet. Callers own their own positioning wrapper
// (this only renders the stacked logo+label content) — just make sure it's a flex column
// with centered items.
export function MissingImagePlaceholder({
  logoWidth,
  logoMaxWidth,
  logoOpacity = 0.12,
  textSize = 10.5,
}: {
  logoWidth: string;
  logoMaxWidth: number;
  logoOpacity?: number;
  textSize?: number;
}) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={DEFAULT_LOGO_URL}
        alt=""
        style={{ width: logoWidth, maxWidth: logoMaxWidth, opacity: logoOpacity, filter: "brightness(0) invert(1)", marginBottom: 10 }}
      />
      <span style={{ fontFamily: "var(--font-mono)", fontSize: textSize, letterSpacing: "0.1em", color: "var(--c-text-40)" }}>
        Coming Soon
      </span>
    </>
  );
}
