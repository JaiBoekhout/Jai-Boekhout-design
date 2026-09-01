# Site Improvement Todo — from the SEO/CRO audit

Source: `portfolio-seo-cro-audit.md` (external audit built from `site-export.md`). Adjusted for context you gave me: DNS cutover to `jaiboekhout.nl` is planned but not yet live, and ~6 more projects/testimonials are pending approval and currently unpublished.

## Already done this session
- [x] "Current Path" widget overlap — fixed (hides while scrolling, was already live before this audit was run against it)
- [x] Testimonials: optional Role, Company, LinkedIn fields added to the CMS — icon only shows when a URL is actually set
- [x] Dedicated OG descriptions for `/work`, `/story`, `/process`, `/evaluate` (previously fell back to the homepage's generic OG description)
- [x] Meta descriptions fixed for all 9 project pages — added sentence-aware truncation (prefers ending at a complete sentence over a bare word boundary) plus hand-written overrides for evolve, zythologist, and windmills where the source text had no sentence break short enough to use. Also added an optional **SEO Meta Description** field per project/case-study in the CMS (with a character counter) so this stays easy to maintain as new projects get added.
- [x] Case-study pages (evolve, alfa-vital, aurin-yoga-centrum) now have genuinely distinct titles + descriptions from their parent project page instead of duplicating them word-for-word
- [x] Missing alt text fixed: the Story page's freediving photo, and the company-logo `<img>` in project attribution credits (the other "missing" ones the audit found are legitimate decorative hover-crossfade images and low-opacity branding watermarks — verified each individually, not bugs)
- [x] `BreadcrumbList` structured data added to project and case-study pages (Home > Work > Project > Case Study)
- [x] **"Get in touch" flow — verified end-to-end, with one real finding:** submitted a real test message through the live form and confirmed it saves correctly to the database (visible in the CMS's Enquiries tab) — so it is **not** a dead end. However, `RESEND_API_KEY` is not set in your environment, so **no email notification is sent when someone submits** — the only way to know a message arrived right now is to manually check the CMS Enquiries tab. I also found an earlier real test entry from you (Aug 29, "test mobile") sitting there, suggesting this may not have been on your radar. Worth setting up a Resend account and adding `RESEND_API_KEY` (+ optionally `NOTIFICATION_EMAIL`/`FROM_EMAIL`) before launch if you want real-time alerts — happy to help wire that up once you have a key.

## Deferred — not actionable yet per your context
- [ ] **Domain/canonical mismatch.** Not a bug to fix now — you said the DNS cutover to `jaiboekhout.nl` hasn't happened yet, so canonicals/OG/sitemap correctly point at whatever the live domain currently is. Re-run this check once DNS is live and confirm everything (canonical tags, OG URLs, sitemap `<loc>` values) agrees on the one real domain.
- [ ] **4th case study (Annosky).** Audit suggested this given it's the strongest non-case-study project. Holding off since you're about to add ~6 new projects/testimonials — worth revisiting priority once those land, since a couple of them may be stronger case-study candidates than a 2018 internship project.

## Needs your input before I touch it
These all change actual visible copy/voice or need real information only you have — flagging rather than guessing:
- [ ] **Testimonial attribution** — the CMS fields are built, but I'm not filling in Benjamin Simmer's or Donny Verduijn's actual role/company/LinkedIn myself since I don't know their real details. Send those over (or add them directly in the CMS) whenever you have them.
- [ ] **Work "Adelaide"/"Australia" into the homepage H1 or opening line.** Currently only in the meta description and footer. This changes your actual headline copy — want a specific suggestion, or would you rather word it yourself?
- [ ] **Problem-framed subheadings on project pages** (e.g. a line like "A small business WordPress rebuild case study" under the Aurin Yoga Centrum title) to give cold-search visitors something to land on. Same reason — it's new visible copy, want your voice on it.
- [ ] **FAQ section with `FAQPage` schema.** Needs actual questions you want answered (e.g. "Open to contract or full-time?", "What tools do you design in?") — send me the Q&As you want and I'll build it.
- [ ] **Testimonial-adjacent: attribute the Annosky usability-testing/speaking credential** more visibly (currently a buried bullet point) — just flagging since it's a content/emphasis call, not a bug.
- [ ] **`sameAs` (Person schema) — add Behance/Dribbble/GitHub links** if you have profiles there; the mechanism already exists (same `socials` the footer "Follow me" row uses), it just needs the URLs added in the CMS if you want them included.

## Explicitly not recommended (per audit's own conclusion)
- Blog/writing section — audit's own research found this isn't a baseline expectation for a recruiter-facing portfolio like this one; skip.
