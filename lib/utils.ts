import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Summary/description fields are stored as rich-text HTML; strip tags for compact plain-text
// previews (grid card blurbs, generateMetadata() descriptions) where showing raw markup, or
// letting a line-clamp cut mid-tag, would break.
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
