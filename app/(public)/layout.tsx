"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "@/store/themeStore";
import { FontScaleProvider } from "@/store/fontScaleStore";
import { DesignSystemStyle } from "@/components/DesignSystemStyle";

// Shared across the landing page AND every real experience route (/work, /evaluate, /process,
// /story, and their sub-routes) — previously these only wrapped the old single-URL SPA inside
// page.tsx, so a direct/hard navigation straight to e.g. /story never got the theme toggle's
// persisted preference, font-scale, or any admin-customised Design System colors (CSS custom
// properties still had globals.css's baseline defaults, so this wasn't visually broken, just
// incomplete).
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <ThemeProvider>
        <FontScaleProvider>
          <DesignSystemStyle />
          {children}
        </FontScaleProvider>
      </ThemeProvider>
    </MotionConfig>
  );
}
