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

// A plain .slice(0, n) cuts mid-word whenever the text happens to run past the limit right in
// the middle of one — visibly broken in a real search result ("...across UX, brand, product, and
// buil"). Back up to the last whole word instead so a meta description always ends cleanly.
export function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
}
