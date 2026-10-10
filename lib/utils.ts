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
//
// line-height:0 is forced alongside it for a second, less obvious reason: a demoted span rarely
// sets its own font-size (that lives on the inline <span> the rich-text editor puts INSIDE it,
// per-run), so this block inherits font-size/line-height from whatever wraps the whole field —
// e.g. the hero <h1> in ExperienceStory.tsx/ExperienceWork.tsx/etc., which on a page with a hero
// photo sets a large clamp()'d font-size of its own. Per CSS's inline-formatting-context rules,
// every block generates an invisible "strut" sized by its OWN (here: inherited) font-size and
// line-height on each line it produces — even one that renders no text of its own. When that
// inherited size is larger than the block's real (inner-span) content, as with a smaller
// sub-heading nested under a much bigger hero line, the strut — not the content's own explicit
// line-height — ends up deciding how tall each wrapped line is, so an author-set "line-height: 1"
// on the visible text was silently being overridden by oversized invisible spacing they had no
// way to see or control. Collapsing the wrapper's own strut to zero leaves line-box height
// entirely up to the real inline content's own line-height, exactly as authored.
//
// That last sentence quietly assumed the inner content always sets a line-height of its own. Every
// hero statement happens to, so this worked — but evaluate.ctaHeading's inner span sets only
// font-size/weight/colour, so it inherited the zero and its line box collapsed to nothing: the
// text still painted, took no vertical space, and the block below it rendered straight over the
// top. That is what the "rte-demoted-heading" marker class is for; globals.css gives the demoted
// block's children a normal line-height, which an authored inline line-height still outranks, so
// the hero fields keep rendering exactly as before.
export function demoteNestedHeadings(html: string): string {
  return html
    .replace(/<h[1-6](\s[^>]*)?>/gi, (_, attrs = "") => {
      // The marker class is what lets globals.css hand a usable line-height back to whatever sits
      // INSIDE this block — see the strut note below.
      const withClass = /\bclass\s*=\s*(["'])/i.test(attrs)
        ? attrs.replace(/\bclass\s*=\s*(["'])/i, (_m: string, q: string) => `class=${q}rte-demoted-heading `)
        : `${attrs} class="rte-demoted-heading"`;
      const styleMatch = /\bstyle\s*=\s*(["'])/i.exec(withClass);
      if (styleMatch) {
        const quote = styleMatch[1];
        return `<span${withClass.replace(new RegExp(`style\\s*=\\s*${quote}`, "i"), `style=${quote}display:block;line-height:0;`)}>`;
      }
      return `<span${withClass} style="display:block;line-height:0">`;
    })
    .replace(/<\/h[1-6]>/gi, "</span>");
}

// The other half of the same problem demoteNestedHeadings solves, and the one that was actually
// breaking hydration on every page of the site.
//
// Rich-text fields get injected with dangerouslySetInnerHTML into hosts that are phrasing-content
// only — <p>, <span>, <h1>, <h2>, <h3> — and the editor wraps essentially everything it produces
// in <p>. That yields markup like <p style="..."><p>real text</p></p>, which is invalid: the HTML
// parser closes the outer <p> the instant it sees the inner one, so the browser's DOM comes out as
// two siblings plus a stray empty <p>, NOT the tree React serialised. React then finds a DOM it
// can't reconcile, throws away the entire server-rendered tree and re-renders the whole page on
// the client (error #418 — "Hydration failed… this tree will be regenerated"). Everything still
// looked right afterwards only because that second, client-side render builds the correct nesting
// via innerHTML, which parses in a context where no outer <p> is open to be closed. The cost was
// paid invisibly on every single page load: all the SSR work discarded, plus a duplicated
// <style id="cms-design-system"> from the re-render.
//
// Demoting the blocks to <span style="display:block"> keeps the parser happy — a span is phrasing
// content, so nothing auto-closes — while rendering identically: Tailwind's preflight already
// zeroes <p> margins, so a block-level span and a <p> compute the same box. Unlike the heading
// demotion above, line-height is deliberately NOT collapsed here; a paragraph's strut is what
// gives an intentionally-empty <p></p> its blank line, and these are body-copy fields where the
// inherited size is the right size.
//
// Lists are left alone: <ul>/<li> have no equivalent one-property stand-in, none of the fields
// that land in a phrasing host uses them today, and silently flattening a list would be a real
// visual change rather than a parser fix.
export function demoteNestedBlocks(html: string): string {
  return demoteNestedHeadings(html)
    .replace(/<(?:p|div|blockquote)(\s[^>]*)?>/gi, (_, attrs = "") => {
      const styleMatch = /\bstyle\s*=\s*(["'])/i.exec(attrs);
      if (styleMatch) {
        const quote = styleMatch[1];
        return `<span${attrs.replace(new RegExp(`style\\s*=\\s*${quote}`, "i"), `style=${quote}display:block;`)}>`;
      }
      return `<span${attrs} style="display:block">`;
    })
    .replace(/<\/(?:p|div|blockquote)>/gi, "</span>");
}

// Rich-text fields almost always end with a trailing empty <p></p> (the editor's own cursor
// rest-line). Harmless alone, but when two such fields get concatenated into one (e.g. Story's
// hero-statement + legacy sub-headline merge — see CMSStory.subheadline), the first field's
// trailing empty paragraph ends up sitting as a spacer between the two pieces of real content —
// and per the strut mechanics explained on demoteNestedHeadings above, an empty <p> still reserves
// a full inherited line-height's worth of vertical space, reading as an oversized gap. Only strips
// ONE trailing empty paragraph, so real intentional spacing elsewhere in the field is untouched.
export function dropTrailingEmptyParagraph(html: string): string {
  return html.replace(/<p>(?:<br\s*\/?>)?<\/p>\s*$/i, "");
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
