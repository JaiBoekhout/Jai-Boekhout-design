"use client";

import { Component, ReactNode } from "react";

// Dev-mode-only failure mode: Turbopack recompiles and reassigns chunk hashes on every source
// edit (Fast Refresh), but a page that's already loaded keeps holding the *old* hash for any
// next/dynamic component it hasn't mounted yet — so the first time that component finally loads
// (e.g. opening Admin after an edit landed elsewhere), it can request a chunk file that's since
// been superseded. Doesn't happen in production (one precompiled build, nothing to go stale
// against) — this exists purely to make that one dev-mode race self-heal instead of surfacing as
// a visible crash.
const RELOAD_KEY = "chunk-error-last-reload";
const RELOAD_COOLDOWN_MS = 5000;

interface State {
  hasError: boolean;
}

export class ChunkErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    const isChunkError =
      error instanceof Error &&
      (error.name === "ChunkLoadError" || /Failed to load chunk/i.test(error.message));
    if (!isChunkError) return;

    // Guards against reloading forever if this particular failure turns out not to be the
    // stale-chunk race (e.g. a real network outage) — one retry per cooldown window, then it's
    // left to surface normally.
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < RELOAD_COOLDOWN_MS) return;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    window.location.reload();
  }

  render() {
    // Briefly blank while the reload above kicks in, rather than the default error overlay —
    // the reload lands within a frame or two in practice.
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
