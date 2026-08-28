"use client";

import { motion, AnimatePresence } from "motion/react";
import { useContentStore } from "@/store/contentStore";

export interface LightboxProps {
  src: string | null;
  onClose: () => void;
  /** Fallback alt text when this image has no CMS-authored alt (e.g. the enclosing project/case study name). */
  fallbackAlt: string;
}

// Full-viewport enlarged-image overlay — shared by the project popup, the project page, the
// full case study overlay, and the case study page, all of which offer a gallery of zoomable
// thumbnails.
export function Lightbox({ src, onClose, fallbackAlt }: LightboxProps) {
  const { content } = useContentStore();
  return (
    <AnimatePresence>
      {src && (
        <motion.div
          key="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 60, background: "rgba(6,9,12,0.92)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}
        >
          <img
            src={src}
            alt={content.mediaMeta?.[src]?.alt || fallbackAlt}
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 12, objectFit: "contain", boxShadow: "0 40px 120px rgba(0,0,0,0.8)", cursor: "default" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
