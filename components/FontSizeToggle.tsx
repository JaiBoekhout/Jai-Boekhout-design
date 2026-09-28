"use client";

import { useFontScale } from "@/store/fontScaleStore";
import type { FontScale } from "@/store/fontScaleStore";
import { HeaderIconButton } from "@/components/HeaderIconButton";

// One button, three levels — clicking always advances to the next one, wrapping back to
// Default after Larger.
const LEVELS: { scale: FontScale; label: string }[] = [
  { scale: 0, label: "Default text size" },
  { scale: 1, label: "Large text size" },
  { scale: 2, label: "Larger text size" },
];

// A large "T" + smaller "t" — lucide has no ready-made equivalent of its own ALargeSmall for the
// letter T, so this is hand-drawn to match lucide's stroke conventions (round caps/joins) instead
// of swapping in an unrelated icon. Slightly larger than the other two header icons (23px vs
// 20px) since a two-letter outline reads visually lighter/smaller than a solid glyph like
// PaintRoller or Menu at the same box size — this brings its apparent weight in line with them.
function FontSizeGlyph({ size = 23 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {/* Large T */}
      <line x1="3" y1="5" x2="14" y2="5" />
      <line x1="8.5" y1="5" x2="8.5" y2="17" />
      {/* Small t */}
      <line x1="16.5" y1="6" x2="16.5" y2="14" />
      <line x1="14.5" y1="9" x2="18.5" y2="9" />
      <path d="M16.5 14 Q16.5 17 19 17" />
    </svg>
  );
}

export function FontSizeToggle() {
  const { fontScale, setFontScale } = useFontScale();
  const current = LEVELS[fontScale];
  const next = LEVELS[(fontScale + 1) % LEVELS.length];

  return (
    <HeaderIconButton
      onClick={() => setFontScale(next.scale)}
      aria-label="Change font size"
      title={`${current.label} — click for ${next.label.toLowerCase()}`}
      icon={<FontSizeGlyph />}
    />
  );
}
