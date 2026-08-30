"use client";

import { useRouter } from "next/navigation";
import type { ComponentType } from "react";
import { pathKeyToUrl } from "@/lib/paths";

interface OnNavigateProps {
  onNavigate: (path: string, projectId?: string, hash?: string) => void;
}

// Bridges an Experience* component's onNavigate(path, projectId?, hash?) callback — inherited
// from the pre-routing SPA, still the shared interface all 4 components and PathCTA speak —
// onto real navigation, so these components work unmodified under real routes. projectId, when
// given, always means "open this project on /work", regardless of which path navigated there
// (e.g. Evaluate's project list links out to Work). hash, when given, lands on a specific
// section of the target page (e.g. Work's stat cards jumping to Evaluate's matching section).
export function ExperiencePage<P extends OnNavigateProps>({
  Component,
  ...rest
}: { Component: ComponentType<P> } & Omit<P, keyof OnNavigateProps>) {
  const router = useRouter();

  function onNavigate(path: string, projectId?: string, hash?: string) {
    if (path === "work" && projectId) {
      router.push(`/work/${projectId}`);
      return;
    }
    const url = pathKeyToUrl(path);
    router.push(hash ? `${url}#${hash}` : url);
  }

  return <Component {...(rest as unknown as P)} onNavigate={onNavigate} />;
}
