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

// The rich-text editor's heading toolbar buttons let an author mark a run of text as h1-h6 —
// meant for standalone body copy (Project Detail, Process sections) where that's a real,
// correctly-nested heading. The same rich-text field also gets used for hero statements, which
// this app already wraps in its own literal <h1>/<p> — a saved heading tag inside that wrapper
// produces an invalid nested-heading (heading-inside-heading, or heading-inside-paragraph on the
// mobile variant) instead of a description list of what content options exist. Rather than
// rewriting already-saved CMS content (a real, separate decision — see TASKS.md), this demotes
// any heading tag found in a hero field's HTML to a plain <span> at render time, keeping
// whatever inline styling the editor attached (font-size, color, etc. all live on the tag's own
// style attribute, not on its tag name) while removing the invalid nesting.
//
// display:block is forced on every demoted span so it still starts its own line — a plain <span>
// is inline by default, so an author's two separate heading blocks (e.g. a big headline followed
// by a smaller sub-line, each its own <h2>) would otherwise run together on one line the moment
// they're demoted, with no visual sign anything's wrong until it's live. Merged into any style
// attribute the tag already carries rather than appended as a second one.
export function demoteNestedHeadings(html: string): string {
  return html
    .replace(/<h[1-6](\s[^>]*)?>/gi, (_, attrs = "") => {
      const styleMatch = /\bstyle\s*=\s*(["'])/i.exec(attrs);
      if (styleMatch) {
        const quote = styleMatch[1];
        return `<span${attrs.replace(new RegExp(`style\\s*=\\s*${quote}`, "i"), `style=${quote}display:block;`)}>`;
      }
      return `<span${attrs} style="display:block">`;
    })
    .replace(/<\/h[1-6]>/gi, "</span>");
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
