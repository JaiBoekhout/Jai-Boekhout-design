"use client";

import { useState, useEffect, useRef } from "react";
import NextImage from "next/image";

// A next/image `fill` that starts invisible and fades in on its own load, instead of popping in
// the instant it's decoded — used anywhere a batch of images can appear together (the gallery,
// View More) so the reveal reads as deliberate rather than as a layout hiccup. Deliberately not
// a slower fetch (that would undo the actual perf work); the fetch stays exactly as fast as
// next/image already makes it, only the reveal is paced.
export function FadeInImage({ src, alt, sizes, objectPosition = "center", scale = 1, className }: { src: string; alt: string; sizes: string; objectPosition?: string; scale?: number; className?: string }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  // A cached image can finish loading before this component's onLoad listener is ever attached
  // — the browser resolves it synchronously from cache and `.complete` is already true the
  // moment this mounts, so the `load` event that would normally flip `loaded` never fires at
  // all. A ref-callback checked at attach time is too early here (next/image hasn't applied the
  // real src/srcset to the underlying <img> yet at that point) — checking again after mount, once
  // next/image's own effects have had a chance to run, is what actually catches the cached case.
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) setLoaded(true);
  }, [src]);
  return (
    <NextImage
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      ref={imgRef}
      style={{
        objectFit: "cover",
        objectPosition,
        transform: `scale(${scale})`,
        transformOrigin: objectPosition,
        opacity: loaded ? 1 : 0,
        transition: "opacity 0.35s ease",
      }}
      onLoad={() => setLoaded(true)}
    />
  );
}
