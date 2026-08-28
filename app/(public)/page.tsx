"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { track } from "@vercel/analytics";
import { Loader2, User } from "lucide-react";
import { HomePage } from "@/components/HomePage";
import { PathSwitcher } from "@/components/PathSwitcher";
import { ExperienceWork } from "@/components/ExperienceWork";
import { ExperienceRecruiter } from "@/components/ExperienceRecruiter";
import { ExperienceProcess } from "@/components/ExperienceProcess";
import { ExperienceStory } from "@/components/ExperienceStory";
import { AdminLogin } from "@/components/AdminLogin";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";
import { ThemeProvider } from "@/store/themeStore";
import { FontScaleProvider } from "@/store/fontScaleStore";
import { DesignSystemStyle } from "@/components/DesignSystemStyle";
import { useHideOnScroll } from "@/store/useHideOnScroll";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FontSizeToggle } from "@/components/FontSizeToggle";
import { useContentStore, DEFAULT_LOGO_URL } from "@/store/contentStore";

// The admin CMS (rich-text editor, all section editors, media library) is a heavy,
// admin-only bundle — code-split it so ordinary visitors never download it. Paired below
// with `adminLoaded`, which mounts this for the first time only once the admin flow is
// actually triggered, rather than on initial page load.
const AdminCMS = dynamic(() => import("@/components/AdminCMS").then((mod) => mod.AdminCMS), {
  ssr: false,
  loading: () => (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(12,17,23,0.6)", backdropFilter: "blur(4px)" }}
    >
      <Loader2 size={22} className="animate-spin" style={{ color: "#14ADB5" }} />
    </div>
  ),
});

type Path = "work" | "recruit" | "process" | "story";
type Phase = "landing" | "experience";

type ExperienceProps = { onNavigate: (path: string, projectId?: string) => void };
const EXPERIENCE_COMPONENTS: Record<Path, React.ComponentType<ExperienceProps>> = {
  work: ExperienceWork,
  recruit: ExperienceRecruiter,
  process: ExperienceProcess,
  story: ExperienceStory,
};

export default function PortfolioPage() {
  const [phase, setPhase] = useState<Phase>("landing");
  const [selectedPath, setSelectedPath] = useState<Path | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [cmsOpen, setCmsOpen] = useState(false);
  // Stays false until the admin flow is actually triggered — gates when the AdminCMS chunk
  // is first fetched. Once true it stays true for the rest of the session (rather than toggling
  // with cmsOpen) so re-opening the panel later doesn't lose its tab state or refetch anything.
  const [adminLoaded, setAdminLoaded] = useState(false);
  const topBarHidden = useHideOnScroll();
  const { content } = useContentStore();
  const logoUrl = content.branding.logoUrl || DEFAULT_LOGO_URL;
  const router = useRouter();

  function handleSelect(path: string, projectId?: string) {
    // A project id means "open this specific project" — that's now a real page/modal at
    // /work/[id] rather than local view state, so it's a real navigation, not a path switch.
    if (projectId) {
      router.push(`/work/${projectId}`);
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    setSelectedPath(path as Path);
    setPhase("experience");
    // The 4 paths are client-side view state, not real routes — Vercel Analytics' automatic
    // pageview tracking never sees them, so without this event every visit looks identical
    // regardless of which path someone actually explored.
    track("path_selected", { path });
  }

  function handleSwitch() {
    setPhase("landing");
    setSelectedPath(null);
  }

  function openAdminLogin() {
    setAdminLoaded(true);
    setLoginOpen(true);
  }

  const ExperienceComponent = selectedPath ? EXPERIENCE_COMPONENTS[selectedPath] : null;

  return (
    <MotionConfig reducedMotion="user">
    <ThemeProvider>
    <FontScaleProvider>
    <DesignSystemStyle />
    <div
      className="min-h-screen w-full"
      style={{ background: "var(--background)", transition: "background 0.3s ease" }}
    >
      <AnimatePresence mode="wait">
        {phase === "landing" ? (
          <motion.div key="landing">
            <HomePage onSelect={handleSelect} onNameClick={openAdminLogin} logoUrl={logoUrl} />
          </motion.div>
        ) : ExperienceComponent ? (
          <motion.div
            key={`experience-${selectedPath}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
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
                <button
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    color: "var(--c-text-muted)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    letterSpacing: "0.06em",
                    transition: "color 0.2s",
                    alignSelf: "flex-start",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--c-teal)"; }}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-text-muted)")}
                  onClick={handleSwitch}
                >
                  ← Jai Boekhout
                </button>
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
            <ExperienceComponent onNavigate={handleSelect} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "experience" && selectedPath && (
          <PathSwitcher selectedPath={selectedPath} onSwitch={handleSwitch} />
        )}
      </AnimatePresence>

      <AdminLogin
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => { setLoginOpen(false); setCmsOpen(true); }}
      />

      {adminLoaded && (
        <ChunkErrorBoundary>
          <AdminCMS
            isOpen={cmsOpen}
            onClose={() => setCmsOpen(false)}
          />
        </ChunkErrorBoundary>
      )}
    </div>
    </FontScaleProvider>
    </ThemeProvider>
    </MotionConfig>
  );
}
