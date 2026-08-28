"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User } from "lucide-react";
import { useHideOnScroll } from "@/store/useHideOnScroll";
import { useContentStore, DEFAULT_LOGO_URL } from "@/store/contentStore";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FontSizeToggle } from "@/components/FontSizeToggle";
import { PathSwitcher } from "@/components/PathSwitcher";
import { useAdminShell } from "@/components/AdminShell";
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
  const router = useRouter();
  const { openAdminLogin, adminUI } = useAdminShell();
  const selectedPath = pathKeyFromPathname(pathname);

  return (
    <div className="min-h-screen w-full" style={{ background: "var(--background)", transition: "background 0.3s ease" }}>
      <div
        className="sticky top-0 z-40 px-8 md:px-16 py-4 flex justify-between items-center"
        style={{
          background: "var(--c-bg-glass)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--c-border-xs)",
          transform: topBarHidden ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 0.3s ease",
        }}
      >
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
            ← Jai Boekhout
          </Link>
          <span
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

        {/* Logo — absolutely centred so left/right content widths don't shift it */}
        <img
          src={logoUrl}
          alt="Jai Boekhout Design"
          className="nav-logo"
          style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", height: "26px", width: "auto", pointerEvents: "none" }}
        />

        <div className="flex items-center justify-end gap-3">
          <ThemeToggle />
          <FontSizeToggle />
          <button
            onClick={openAdminLogin}
            title="Admin"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "15px",
              margin: "-15px",
              color: "var(--c-text-muted)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--c-teal)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--c-text-muted)"; }}
          >
            <User size={21} />
          </button>
        </div>
      </div>

      {children}

      {selectedPath && <PathSwitcher selectedPath={selectedPath} onSwitch={() => router.push("/")} />}

      {adminUI}
    </div>
  );
}
