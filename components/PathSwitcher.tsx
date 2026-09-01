"use client";

import { motion } from "motion/react";
import { ArrowLeftRight } from "lucide-react";
import { PATH_DISPLAY_NAMES, type PathKey } from "@/lib/paths";
import { useHideOnScroll } from "@/store/useHideOnScroll";

interface PathSwitcherProps {
  selectedPath: string;
  onSwitch: () => void;
}

export function PathSwitcher({ selectedPath, onSwitch }: PathSwitcherProps) {
  const label = PATH_DISPLAY_NAMES[selectedPath as PathKey] ?? "";
  // Fixed to the viewport bottom, so with no scroll-awareness it permanently sat on top of
  // whatever page content happened to land there — stat cards on /work, an accordion section's
  // own heading on /process, both genuinely covered and unreadable underneath it. Same
  // hide-on-scroll-down/show-on-scroll-up behavior the top bar already uses, so it's out of the
  // way while actively reading and back the moment the user scrolls up to switch paths.
  const hidden = useHideOnScroll();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: "-50%" }}
      animate={{ opacity: hidden ? 0 : 1, y: hidden ? 40 : 0, x: "-50%" }}
      exit={{ opacity: 0, y: 20, x: "-50%" }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ pointerEvents: hidden ? "none" : "auto" }}
      className="fixed bottom-8 left-1/2 z-50"
    >
      <div
        className="flex items-center justify-center gap-4 px-5 py-3 rounded-full border"
        style={{
          background: "var(--c-bg-glass)",
          borderColor: "var(--c-border-med)",
          backdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        <div className="flex flex-col items-center">
          <span
            className="uppercase tracking-widest"
            style={{
              fontSize: "9px",
              color: "var(--c-text-muted)",
              fontFamily: "var(--font-mono)",
              textAlign: "center",
            }}
          >
            Current Path
          </span>
          <span
            style={{
              fontSize: "13px",
              color: "var(--c-teal)",
              fontFamily: "var(--font-body)",
              fontWeight: 400,
              maxWidth: "280px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textAlign: "center",
            }}
          >
            {label}
          </span>
        </div>
        <div
          style={{ width: "1px", height: "32px", background: "var(--c-surface-10)" }}
        />
        <button
          onClick={onSwitch}
          className="flex items-center gap-2 transition-opacity hover:opacity-70"
          style={{
            fontSize: "13px",
            color: "var(--c-teal)",
            fontFamily: "var(--font-mono)",
            fontWeight: 400,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            whiteSpace: "nowrap",
          }}
        >
          <ArrowLeftRight size={13} />
          <span className="hidden sm:inline">Switch Path</span>
        </button>
      </div>
    </motion.div>
  );
}
