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

// BreadcrumbList structured data — helps search results show the page's place in the site
// hierarchy (e.g. "jaiboekhout.nl > Work > Evolve Car Rental") instead of just a bare URL, and
// gives Google an explicit signal for how project/case-study pages relate to /work.
export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

// A plain .slice(0, n) cuts mid-word whenever the text happens to run past the limit right in
// the middle of one — visibly broken in a real search result ("...across UX, brand, product, and
// buil"). Ending at the last whole word is legible but often still reads as an unfinished
// thought ("...everything from brand"). Prefer the last complete SENTENCE within the limit
// instead, so an auto-derived description reads as a finished statement — falling back to a
// clean word boundary when no sentence end exists in range, or when the only one available
// would throw away too much of the budget to be worth it.
export function truncateAtWord(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength);

  const sentenceEnds = [...cut.matchAll(/[.!?](?=\s|$)/g)];
  const lastSentenceEnd = sentenceEnds[sentenceEnds.length - 1];
  if (lastSentenceEnd && lastSentenceEnd.index! + 1 >= maxLength * 0.4) {
    return cut.slice(0, lastSentenceEnd.index! + 1).trim();
  }

  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
}
