"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useHideOnScroll } from "@/store/useHideOnScroll";
import { useContentStore, DEFAULT_LOGO_URL } from "@/store/contentStore";
import { ThemeDropdown } from "@/components/ThemeDropdown";
import { FontSizeToggle } from "@/components/FontSizeToggle";
import { MobileNavMenu } from "@/components/MobileNavMenu";
import { HamburgerEasterEgg } from "@/components/HamburgerEasterEgg";
import { PathSwitcher } from "@/components/PathSwitcher";
import { pathKeyFromPathname } from "@/lib/paths";

// Shared chrome for every experience path (/work, /evaluate, /process, /story, and their
// sub-routes) — the top bar + "Current Path" switcher that used to live inline in
// app/(public)/page.tsx for the single-URL SPA. Each Experience* component underneath still
// renders its own fade-in on mount, so this layout doesn't need its own page-transition.
export default function ExperienceLayout({ children }: { children: React.ReactNode }) {
  const topBarHidden = useHideOnScroll();
  const { content } = useContentStore();
  const logoUrl = content.branding.logoUrl || DEFAULT_LOGO_URL;
  const pathname = usePathname();
  const selectedPath = pathKeyFromPathname(pathname);

  return (
    <div className="min-h-screen w-full" style={{ background: "var(--background)", transition: "background 0.3s ease" }}>
      <div
        className="sticky top-0 z-40 px-8 md:px-16 py-4"
        style={{
          background: "var(--c-bg-glass)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--c-border-xs)",
          transform: topBarHidden ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 0.3s ease",
        }}
      >
        {/* Desktop: text left, logo absolutely centred, icon cluster right. */}
        <div className="hidden md:flex justify-between items-center" style={{ position: "relative" }}>
          {/* The back control is its own 40x40 button beside the whole name/tagline block rather
              than an "←" glued to the front of the first line — it reads as a control at the size
              the rest of the header's buttons use, and it sits level with both lines instead of
              just the top one. .header-icon-btn is the same class ThemeDropdown/FontSizeToggle/
              HamburgerEasterEgg use, so size and hover (navy circle, inverted icon) match exactly;
              it stays an <a> rather than HeaderIconButton's <button> so it's a real crawlable link
              home, and so it never nests interactive elements. */}
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Back to home" className="header-icon-btn">
              <ArrowLeft size={20} />
            </Link>
            <div className="flex flex-col gap-1">
              <Link
                href="/"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--c-text-muted)",
                  textDecoration: "none",
                  letterSpacing: "0.06em",
                  transition: "color 0.2s",
                  alignSelf: "flex-start",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--c-teal)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--c-text-muted)"; }}
              >
                Jai Boekhout
              </Link>
              <span
                className="nav-tagline"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--c-text-dim)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                UX & Product Design
              </span>
            </div>
          </div>

          <img
            src={logoUrl}
            alt="Jai Boekhout Design"
            className="nav-logo"
            style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", height: "26px", width: "auto", pointerEvents: "none" }}
          />

          <div className="flex items-center justify-end gap-3">
            <ThemeDropdown />
            <FontSizeToggle />
            <HamburgerEasterEgg />
          </div>
        </div>

        {/* Mobile: logo + text centred and stacked, hamburger menu top-right. */}
        <div className="flex md:hidden flex-col items-center" style={{ position: "relative" }}>
          <div style={{ position: "absolute", top: 0, left: 0 }}>
            <Link href="/" aria-label="Back to home" className="header-icon-btn">
              <ArrowLeft size={20} />
            </Link>
          </div>
          <div style={{ position: "absolute", top: 0, right: 0 }}>
            <MobileNavMenu />
          </div>
          <Link href="/" style={{ display: "flex" }}>
            <img
              src={logoUrl}
              alt="Jai Boekhout Design"
              className="nav-logo"
              style={{ height: "26px", width: "auto" }}
            />
          </Link>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--c-text-muted)",
              letterSpacing: "0.06em",
              marginTop: "8px",
            }}
          >
            Jai Boekhout
          </span>
          <span
            className="nav-tagline"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              color: "var(--c-text-dim)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            UX & Product Design
          </span>
        </div>
      </div>

      {children}

      {selectedPath && <PathSwitcher selectedPath={selectedPath} />}
    </div>
  );
}
