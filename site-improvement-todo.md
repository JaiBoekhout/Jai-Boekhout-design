# Site Improvement Todo — from the SEO/CRO audit

Source: `portfolio-seo-cro-audit.md` (external audit built from `site-export.md`), plus everything
that's come up since. Reprioritized based on current state — see "Recommended next priorities"
below for what actually matters most right now.

## Recommended next priorities

1. **Review and publish the 7 retitled projects** (see below) — the highest-leverage item, since
   all the prep work is already done and it's purely a review/publish decision now.
2. **DNS cutover to `jaiboekhout.nl`** — checked directly this session: the domain still returns a
   403 from nginx, not your Vercel deployment. Every canonical tag, OG URL, and sitemap entry is
   correctly pointing at whatever domain *is* live right now, but none of that SEO work pays off
   until the real domain is serving the real site.
3. **`RESEND_API_KEY`** — still not set. The contact form works and saves to the CMS correctly,
   but you get zero notification when someone submits — the only way to know is manually checking
   the Enquiries tab. Cheap to fix once you have a Resend account.

---

## Already done
- [x] "Current Path" widget overlap — fixed (hides while scrolling)
- [x] Testimonials: optional Role, Company, LinkedIn fields — icon only shows when a URL is set
- [x] Dedicated OG descriptions for `/work`, `/story`, `/process`, `/evaluate`
- [x] Meta descriptions fixed for all 9 project pages, sentence-aware truncation, optional SEO
      Meta Description field per project/case-study with a character counter
- [x] Case-study pages (evolve, alfa-vital, aurin-yoga-centrum) have distinct titles + descriptions
      from their parent project page
- [x] Missing alt text fixed (Story page freediving photo, company-logo credit images)
- [x] `BreadcrumbList` structured data on project and case-study pages
- [x] "Get in touch" flow verified end-to-end — saves correctly to the CMS (email alerts still
      blocked on `RESEND_API_KEY`, see priorities above)
- [x] Annosky research/speaking credential surfaced on Story + Evaluate testimonials
- [x] FAQ section — built, reviewed, and **fully live**: all 10 questions published, master switch
      on, verified rendering with correct `FAQPage` JSON-LD
- [x] Testimonial CMS editor: Name shares a row with LinkedIn URL
- [x] Testimonial attribution — Benjamin Simmer's and Donny Verduijn's real role/company/LinkedIn
      filled in
- [x] `sameAs` (Person schema) — Behance/Dribbble/GitHub links added
- [x] Homepage H1 now reads "Based in Adelaide, Australia, I design digital experiences..."
- [x] Rich text editor: internal page/project linking + an explicit "open in new window" switch
      for both Link and Button, a Max Width control (click-to-type exact px), toolbar reorganized
      into 2 clean rows, and Desktop/Mobile content overrides added to every remaining field
      sitewide (testimonials, FAQ answers, process steps, story timeline, project/case-study
      summaries and detail blocks, homepage cards, the 404 page)
- [x] FAQ section: configurable 1/2-column layout with independent column heights (expanding one
      no longer shifts the other), configurable rows-to-show, and a "Show All" button
- [x] Testimonial cards restyled (role/company on top in the accent colour, name + LinkedIn below)
- [x] "At a Glance" stats can be set to Auto — live counts of testimonials/qualifications, or a
      summed total from a new "Years of Experience" field per Professional Experience entry
- [x] CMS sidebar: desktop icon-only collapse mode (persists across reloads), bolder active-item
      highlight with a left accent bar, connected + tightened Design System nested items, more
      visible mobile backdrop
- [x] Work tab's "Add New Highlighted Project" button resized to fit its content and left-aligned
- [x] All 7 previously-unpublished projects now have a full Role/Client/Platform/Scope detail
      block, framed as JABA Web Design employment work (confirmed via companyId, not guessed)

## Ready for your review — retitled and detailed, just needs a publish decision
- [ ] **CT Filtration** → *"Explaining whole-house water filtration to first-time buyers"*
- [ ] **Alliance Metal** → *"SEO-driven website design for an industrial fabrication company"*
- [ ] **Shadow Creek Winery** → *"Combining a wine shop, bookings and storytelling into one
      boutique winery experience"*
- [ ] **Underground Installations** → *"Turning trenching equipment into a website's visual
      identity — ranked #1 on Google"* — currently sitting as a draft "Save" rather than
      "Unpublished" like the other six, worth a quick look
- [ ] **Pitchford Farms** → *"Building a direct-to-consumer e-commerce site for a family cattle
      farm"*
- [ ] **North Star Rewards** → *"Designing a rewards brand and card system for three venues from
      one concept"*
- [ ] **Open Studios Australia** → *"Designing 5 user roles into one nationwide arts events
      platform"* — this one now also has `fullCaseStudy: true` set (a separate deep-dive
      `/case-study` sub-page), worth confirming that's intentional before publishing

## Needs your input before I touch it
- [ ] **Problem-framed subheadings on project pages** (e.g. "A small business WordPress rebuild
      case study" under the Aurin Yoga Centrum title) — new visible copy, want your voice on it.

## Deferred — not actionable yet
- [ ] **Domain/canonical mismatch** — see priorities above.
- [ ] **4th locked case study.** Worth reconsidering once the 7 above are published — Open Studios
      Australia (5-user-role platform, full-stack build) may be a stronger "flagship" 4th deep
      dive than Annosky's 2018 internship was originally.

## Explicitly not recommended (per audit's own conclusion)
- Blog/writing section — audit's own research found this isn't a baseline expectation for a
  recruiter-facing portfolio like this one; skip.
