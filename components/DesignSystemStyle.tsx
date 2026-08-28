"use client";

import { useEffect } from "react";
import {
  useContentStore,
  buildDesignSystemCss,
  DEFAULT_FAVICON_URL,
  DEFAULT_FAVICON_PNG_URL,
  DEFAULT_FAVICON_SVG_URL,
  DEFAULT_APPLE_TOUCH_ICON_URL,
} from "@/store/contentStore";

const STYLE_TAG_ID = "cms-design-system";

// Keeps the <style id="cms-design-system"> tag (first painted synchronously by the inline
// script in layout.tsx, before hydration) in sync with live CMS edits — so a Design System
// change made in one tab/window is reflected without a full page reload. Also keeps the
// favicon <link> in sync the same way — browsers pick up a changed href on an existing icon
// link without a reload, though a returning visitor's cached tab icon may lag a refresh or two.
export function DesignSystemStyle() {
  const { content } = useContentStore();

  useEffect(() => {
    let tag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
    if (!tag) {
      tag = document.createElement("style");
      tag.id = STYLE_TAG_ID;
      document.head.appendChild(tag);
    }
    tag.textContent = buildDesignSystemCss(content.designSystem);
  }, [content.designSystem]);

  useEffect(() => {
    const pairs: [string, string][] = [
      ["cms-favicon-png", content.branding.faviconPngUrl || DEFAULT_FAVICON_PNG_URL],
      ["cms-favicon-svg", content.branding.faviconSvgUrl || DEFAULT_FAVICON_SVG_URL],
      ["cms-favicon-ico", content.branding.faviconUrl || DEFAULT_FAVICON_URL],
      ["cms-apple-touch-icon", content.branding.appleTouchIconUrl || DEFAULT_APPLE_TOUCH_ICON_URL],
    ];
    for (const [id, href] of pairs) {
      const link = document.getElementById(id) as HTMLLinkElement | null;
      if (link) link.href = href;
    }
  }, [
    content.branding.faviconUrl,
    content.branding.faviconPngUrl,
    content.branding.faviconSvgUrl,
    content.branding.appleTouchIconUrl,
  ]);

  return null;
}
