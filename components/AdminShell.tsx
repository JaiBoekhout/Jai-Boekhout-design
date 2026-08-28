"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { AdminLogin } from "@/components/AdminLogin";
import { ChunkErrorBoundary } from "@/components/ChunkErrorBoundary";

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

// Admin login/CMS lifecycle, shared between the landing page and every experience path's own
// top bar — each mounts its own instance (they're never on screen at the same time, since
// navigating between routes replaces the whole tree), so there's no state to share across them,
// just this one login→CMS flow to avoid re-implementing per route.
export function useAdminShell() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [cmsOpen, setCmsOpen] = useState(false);
  // Stays false until the admin flow is actually triggered — gates when the AdminCMS chunk
  // is first fetched. Once true it stays true for the rest of the session (rather than toggling
  // with cmsOpen) so re-opening the panel later doesn't lose its tab state or refetch anything.
  const [adminLoaded, setAdminLoaded] = useState(false);

  function openAdminLogin() {
    setAdminLoaded(true);
    setLoginOpen(true);
  }

  const adminUI = (
    <>
      <AdminLogin
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => { setLoginOpen(false); setCmsOpen(true); }}
      />
      {adminLoaded && (
        <ChunkErrorBoundary>
          <AdminCMS isOpen={cmsOpen} onClose={() => setCmsOpen(false)} />
        </ChunkErrorBoundary>
      )}
    </>
  );

  return { openAdminLogin, adminUI };
}
