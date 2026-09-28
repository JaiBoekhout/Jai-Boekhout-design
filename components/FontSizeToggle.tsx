"use client";

import { ALargeSmall } from "lucide-react";
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

export function FontSizeToggle() {
  const { fontScale, setFontScale } = useFontScale();
  const current = LEVELS[fontScale];
  const next = LEVELS[(fontScale + 1) % LEVELS.length];

  return (
    <HeaderIconButton
      onClick={() => setFontScale(next.scale)}
      aria-label="Change font size"
      title={`${current.label} — click for ${next.label.toLowerCase()}`}
      icon={<ALargeSmall size={20} strokeWidth={2} />}
    />
  );
}
