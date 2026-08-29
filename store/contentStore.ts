// No "use client" here — this module is imported by both Server Components (work/[slug]'s
// generateStaticParams/generateMetadata, reading getContent()'s DEFAULT_CONTENT branch) and
// Client Components (everything using useContentStore()). Every browser-only API below
// (localStorage, window) is already guarded by `typeof window === "undefined"`, and the one
// piece that uses React hooks (useContentStore itself) lives in its own "use client" file —
// see the re-export at the bottom — so nothing here pulls React's client-only APIs into a
// module a Server Component might import.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CMSGlobal {
  email: string;
  phone: string;
  location: string;
  tagline: string;
}

// Question + description text for one of the 4 fixed homepage path cards — CTA label and
// hover-swap label stay hardcoded (not CMS-editable), only these two are.
export interface CMSHomeCard {
  question: string;
  description: string;
}

export interface CMSHomepage {
  headline: string;
  subheadline: string;
  question: string;
  // "Available for opportunities" — the second half of the footer line. The first half (the
  // location) keeps pulling from Global Settings -> Location rather than being duplicated here.
  footerNote: string;
  cards: {
    work: CMSHomeCard;
    recruit: CMSHomeCard;
    process: CMSHomeCard;
    story: CMSHomeCard;
  };
}

// Both optional — undefined means "use the built-in default asset," so existing sites don't
// need to upload anything for these to keep working exactly as they do today.
// The 4 favicon variants mirror the standard set a favicon generator (e.g. realfavicongenerator.net)
// produces — browsers and devices each look for a different one:
//   .ico   → legacy "shortcut icon" fallback, and what some crawlers request directly at /favicon.ico
//   96x96 PNG → modern browser tab icon
//   .svg   → scalable icon for browsers that support it (takes priority when they do)
//   apple-touch-icon → iOS/iPadOS home screen bookmark icon
export interface CMSBranding {
  logoUrl?: string;
  faviconUrl?: string;
  faviconPngUrl?: string;
  faviconSvgUrl?: string;
  appleTouchIconUrl?: string;
}

// Each value is a full profile URL, or undefined/empty if that platform isn't linked. Drives
// both the public "Follow me on Socials" row (PathCTA.tsx) and the Person JSON-LD sameAs list
// (app/layout.tsx).
export interface CMSSocials {
  linkedin?: string;
  github?: string;
  dribbble?: string;
  behance?: string;
  instagram?: string;
  x?: string;
  youtube?: string;
  facebook?: string;
}

// Drives app/not-found.tsx — kept editable rather than hardcoded so the 404 page follows the
// same branded look (fonts/colors already come from the Design System) with its own copy,
// instead of falling back to Next's unstyled default.
export interface CMSNotFound {
  eyebrow?: string;
  heading?: string;
  body?: string;
  buttonLabel?: string;
  imageUrl?: string;
}

// An employer/agency a project was completed for, rather than for the client directly — lets
// a project credit "created while working at [Company]" for copyright/IP clarity, distinct
// from the project's own `client` field (the agency's client, not Jai's own client relationship).
export interface CMSCompany {
  id: string;
  name: string;
  logoUrl?: string;
}

// The file this constant used to point at (logo-Jai-Boekhout-Design.png) no longer exists
// anywhere in public/imports — favicon.svg is the closest remaining brand mark and, being
// vector, scales cleanly at both the small nav-logo size and the larger decorative watermark
// sizes this same constant is used for elsewhere.
export const DEFAULT_LOGO_URL = "/imports/branding/favicon.svg";
export const DEFAULT_FAVICON_URL = "/favicon.ico";
export const DEFAULT_FAVICON_PNG_URL = "/favicon-96x96.png";
export const DEFAULT_FAVICON_SVG_URL = "/favicon.svg";
export const DEFAULT_APPLE_TOUCH_ICON_URL = "/apple-touch-icon.png";

// Fallback for CMSContent.companyCreditCopy — see that field's doc comment below.
export const DEFAULT_COMPANY_CREDIT_COPY =
  "This project was completed while working at {company}. {client} was a client of {company} — not my personal client — and this work was carried out as part of my employment there, alongside the wider team.";

// "View More Projects" section shown at the bottom of a project/case study's full popup.
// Up to 3 specific projects can be pinned directly (viewMorePinnedIds, same id space as
// featuredProjectOrder — a CMSProject id, or "cs-<id>"); any slot that isn't pinned (0-3 of
// them) is auto-filled dynamically, optionally scoped to a tag (viewMoreCategory) and sorted
// oldest/newest first (viewMoreSort). See resolveViewMore() below for the fill algorithm.
export type ViewMoreSort = "oldest" | "newest";

export interface CMSCaseStudy {
  id: number;
  // Custom /work/<slug> URL path — only meaningful when this case study has no linked
  // CMSProject (see projectUrlSlug below); a linked project's own slug wins otherwise, since
  // they render at the same URL.
  slug?: string;
  title: string;
  client: string;
  // "agency" shows a companyId dropdown instead of the free-text client field below.
  // Undefined behaves as "custom" so existing content with only `client` set is unaffected.
  clientMode?: "custom" | "agency";
  // References CMSCompany.id — set when this project was completed while working at an
  // employer/agency (as opposed to `client`, which is that company's own client).
  companyId?: string;
  summary: string;
  status?: "published" | "saved" | "updated" | "unpublished";
  createdAt?: string;
  updatedAt?: string;
  viewMoreHeading?: string;
  viewMorePinnedIds?: string[];
  viewMoreCategory?: string;
  viewMoreSort?: ViewMoreSort;
  fullContent?: string;
  fullCaseStudy?: boolean;
  fullCaseStudyLocked?: boolean;
  fullCaseStudyPassword?: string;
  fullCaseStudyBannerUrl?: string;
  fullCaseStudyContent?: string;
  coverImageUrl?: string;
  coverImagePosition?: string;
  coverImageScale?: number;
  coverImageHoverUrl?: string;
  coverImageHoverPosition?: string;
  coverImageHoverScale?: number;
  heroImageUrl?: string;
  heroImagePosition?: string;
  heroImageScale?: number;
  // Manual override for the tall-hero scroll hint (dots/arrow) on the public project popup — set
  // when the auto height-ratio rule (see FeaturedProjects.tsx) still shows it on an image that
  // doesn't really warrant it, or the reverse.
  hideScrollIndicator?: boolean;
  img1Url?: string;
  img1Position?: string;
  img1Scale?: number;
  img2Url?: string;
  img2Position?: string;
  img2Scale?: number;
  img3Url?: string;
  img3Position?: string;
  img3Scale?: number;
  outcomes: string[];
  tags: string[];
  liveUrl?: string;
}

export interface CMSProject {
  id: string;
  // Custom /work/<slug> URL path — see projectUrlSlug below. Falls back to `id` when unset, so
  // existing projects (and any link already out in the wild) keep resolving unchanged.
  slug?: string;
  num: string;
  name: string;
  client: string;
  // "agency" shows a companyId dropdown instead of the free-text client field below.
  // Undefined behaves as "custom" so existing content with only `client` set is unaffected.
  clientMode?: "custom" | "agency";
  // References CMSCompany.id — set when this project was completed while working at an
  // employer/agency (as opposed to `client`, which is that company's own client).
  companyId?: string;
  // References CMSCaseStudy.id — the stable link between a project and its matching case
  // study. Preferred over title-based matching (see resolveLinkedCaseStudy below) wherever
  // set; renaming either side no longer breaks the pairing once this is set. Admin sets/clears
  // it via a picker in the Work tab; unset falls back to the fuzzy title match for old content.
  linkedCaseStudyId?: number;
  tags: string[];
  desc: string;
  outcomes: string[];
  imgs: string[];
  coverImageUrl?: string;
  heroImageUrl?: string;
  coverImagePosition?: string;
  coverImageScale?: number;
  coverImageHoverUrl?: string;
  coverImageHoverPosition?: string;
  coverImageHoverScale?: number;
  heroImagePosition?: string;
  heroImageScale?: number;
  hideScrollIndicator?: boolean;
  img1Position?: string;
  img1Scale?: number;
  img2Position?: string;
  img2Scale?: number;
  img3Position?: string;
  img3Scale?: number;
  fullContent?: string;
  fullCaseStudy?: boolean;
  fullCaseStudyLocked?: boolean;
  fullCaseStudyPassword?: string;
  fullCaseStudyBannerUrl?: string;
  fullCaseStudyContent?: string;
  status?: "published" | "saved" | "updated" | "unpublished";
  createdAt?: string;
  updatedAt?: string;
  viewMoreHeading?: string;
  viewMorePinnedIds?: string[];
  viewMoreCategory?: string;
  viewMoreSort?: ViewMoreSort;
  live: string | null;
  caseStudy: string | null;
}

export type ProjectListLayout = "list" | "card";

export interface CMSWork {
  heroStatement: string;
  caseStudies: CMSCaseStudy[];
  homeStats: CMSWorkStatsConfig;
  projects: CMSProject[];
  featuredProjectOrder: string[];
  deletedProjectIds?: string[];
  // Layout of the "View more projects" list on the public site. "list" is the original
  // row-per-project layout; "card" shows the same projects in a responsive grid that steps
  // down from projectListColumns (large screens) to 3/2/1 per row on smaller ones.
  projectListLayout: ProjectListLayout;
  projectListColumns: number;
  // How many rows are visible before a "Load more Projects" button appears — one row is one
  // project in List view, or one grid row (projectListColumns cards) in Card view. Clicking
  // Load more reveals the same number of additional rows each time.
  projectListRows: number;
}

export interface CMSStat {
  // Stable id so the Work-page stats bar can reference a specific At a Glance entry by
  // identity rather than copying its value/label text — see CMSWorkStatsConfig below.
  id: string;
  value: string;
  label: string;
  sub?: string;
  // Optional icon (a key into STAT_ICON_MAP, lib/statIcons.ts) shown next to this stat
  // wherever it's rendered — the At a Glance list and the Work-page stats bar both use it.
  icon?: string;
}

export interface CMSSkillGroup {
  title: string;
  skills: string[];
}

// One entry the admin has curated for an experience entry's "Projects" list — an explicit
// order/visibility override layered on top of the auto-matched (by companyId) project set,
// the same pattern as featuredProjectOrder/viewMorePinnedIds elsewhere in this file.
export interface CMSExperienceProjectRef {
  id: string; // CMSProject.id
  hidden?: boolean;
}

export interface CMSExperience {
  org: string;
  period: string;
  role: string;
  highlights: string[];
  tags: string[];
  /** Optional rich-text elaboration shown above the highlight bullets — for entries that
      need more than a bullet list can carry (context, links, formatting). */
  description?: string;
  // References CMSCompany.id — when set, the public Evaluate page shows a "Projects" list
  // under this experience entry's Key Skills, auto-populated from every CMSProject whose own
  // companyId matches this one (ordered/hidden per projectOrder below).
  companyId?: string;
  projectOrder?: CMSExperienceProjectRef[];
  // "list" (default) shows every visible project as a compact row, unchanged from before.
  // "card" shows exactly one project as a rich image card matching the Work page's featured
  // grid — projectsFeaturedId picks which one from the same resolved set.
  projectsDisplayMode?: "list" | "card";
  projectsFeaturedId?: string;
}

// Work-page stats bar config — a selector over CMSEvaluate.stats ("At a Glance") rather than
// its own authored content, so editing a stat's value/label there is reflected here without
// needing to re-pick it. slotIds is always kept at SLOT_COUNT length (padded with null); count
// controls how many of the leading slots actually render on the public site.
export interface CMSWorkStatsConfig {
  enabled: boolean;
  count: number; // 1-6
  slotIds: (string | null)[]; // CMSStat.id references, length 6
}

export interface CMSQualification {
  title: string;
  org: string | null; // institution — field is labelled "Institution" in the CMS
  year?: string; // free text: a single year, a range ("2017 – 2019"), or "Completed 2020"
  major?: string;
  minor?: string;
}

export interface CMSTestimonial {
  name: string;
  quote: string;
  highlights: string[];
}

export interface CMSClient {
  name: string;
  logoUrl?: string;
  url?: string;
  row?: 1 | 2;
}

export interface CMSEvaluate {
  // The big page heading (e.g. "Are you the right person for this role?") — separate from
  // heroStatement below, which is the smaller paragraph underneath it. Optional so existing
  // saved content without it falls back to the original hardcoded text.
  heroTitle?: string;
  heroStatement: string;
  bio: string;
  industries: string[];
  stats: CMSStat[];
  // Downloadable PDF shown under At a Glance — uploaded via a dedicated endpoint
  // (app/api/resume/upload), not the general Media Library.
  resumeUrl?: string;
  skills: CMSSkillGroup[];
  clients: CMSClient[];
  clientSliderSpeed: number;
  // Hides the Clients & Companies section everywhere it's rendered (Evaluate and Work pages
  // both read this same flag, since they share the same underlying clients data/section).
  clientsHidden?: boolean;
  experience: CMSExperience[];
  qualifications: CMSQualification[];
  additional: string[];
  testimonials: CMSTestimonial[];
  beyondDesign: string;
  ctaHeading: string;
  ctaBody: string;
  // Section eyebrow labels (the small teal uppercase kicker above each section on the public
  // page) — optional so existing saved content without them falls back to the current text.
  bioHeading?: string;
  industriesHeading?: string;
  statsHeading?: string;
  experienceHeading?: string;
  skillsHeading?: string;
  clientsHeading?: string; // shared with CMSWork's public rendering of the same clients data
  qualificationsHeading?: string;
  testimonialsHeading?: string;
  beyondDesignHeading?: string;
  beyondDesignHidden?: boolean;
}

export interface CMSProcessStep {
  id: string;
  title: string;
  tagline: string;
  description: string;
  activities: string[];
  example: string;
}

export interface CMSProcess {
  heroStatement: string;
  // The paragraph under the hero heading (e.g. "My design process is structured but not
  // rigid..."). Optional so existing saved content without it falls back to the original text.
  heroSubheading?: string;
  steps: CMSProcessStep[];
}

export interface CMSTimelineItem {
  year: string;
  title: string;
  body: string;
  tag: string;
}

export interface CMSInterest {
  label: string;
  detail: string;
}

export interface CMSStory {
  heroStatement: string;
  subheadline: string;
  portraitImageUrl?: string;
  portraitImagePosition?: string;
  portraitImageScale?: number;
  timeline: CMSTimelineItem[];
  timelineHeading?: string;
  interests: CMSInterest[];
  interestsHeading?: string;
  closingQuote: string;
}

export interface CMSEnquiry {
  id: string;
  name: string;
  email: string;
  message: string;
  timestamp: string;
}

export interface CMSMediaMeta {
  displayName?: string;
  alt?: string;
  description?: string;
}

// Every color is stored as an explicit dark-mode + light-mode hex value (matching how the
// underlying CSS variables already work — see globals.css) rather than auto-derived, so there's
// no color-math to get wrong. Only the variables with real visual weight are exposed here;
// secondary/alpha-overlay variables (hover states, subtle borders) are left as-is on purpose.
export interface CMSDesignColors {
  accentDark: string;
  accentLight: string;
  // Optional extra accents — undefined means "not added yet" (Color Palette shows an
  // "+ Add another accent color" affordance rather than always rendering these). Once set,
  // any component color's followAccent can point at "accent2"/"accent3" instead of "accent".
  accent2Dark?: string;
  accent2Light?: string;
  accent3Dark?: string;
  accent3Light?: string;
  headingDark: string;
  headingLight: string;
  textDark: string;
  textLight: string;
  mutedDark: string;
  mutedLight: string;
  bodyDark: string;
  bodyLight: string;
  bgDark: string;
  bgLight: string;
  cardDark: string;
  cardLight: string;
  dividerDark: string;
  dividerLight: string;
}

export type CMSFontPairingId = "modern" | "editorial" | "technical" | "custom";

// ─── Custom type scale (used only when fontPairing === "custom") ────────────────
// Governs the site's true heading hierarchy (.rte-content h1–h3, plus a new h6 tier),
// body copy, and small mono labels — sized as baseFontSize × scaleRatio^N, matching the
// familiar type-scale.com model. Deliberately does NOT touch .rte-content h4/h5, which
// already have their own distinct treatments (a body-font subheading and a mono-font
// eyebrow label respectively) unrelated to the H1–H6 hierarchy.
export const TYPE_SCALE_RATIOS: { value: number; label: string }[] = [
  { value: 1.067, label: "1.067 — Minor Second" },
  { value: 1.125, label: "1.125 — Major Second" },
  { value: 1.2, label: "1.200 — Minor Third" },
  { value: 1.25, label: "1.250 — Major Third" },
  { value: 1.333, label: "1.333 — Perfect Fourth" },
  { value: 1.414, label: "1.414 — Augmented Fourth" },
  { value: 1.5, label: "1.500 — Perfect Fifth" },
  { value: 1.618, label: "1.618 — Golden Ratio" },
];

export interface FontOption {
  label: string;
  css: string;
}

// Curated so every option is already imported in globals.css — same reasoning as the 3 preset
// pairings above. Fonts reused across roles (Work Sans, Manrope, Poppins) only need importing once.
export const CUSTOM_HEADING_FONTS: FontOption[] = [
  { label: "Poppins", css: "'Poppins', sans-serif" },
  { label: "Fraunces", css: "'Fraunces', serif" },
  { label: "Space Grotesk", css: "'Space Grotesk', sans-serif" },
  { label: "Playfair Display", css: "'Playfair Display', serif" },
  { label: "Work Sans", css: "'Work Sans', sans-serif" },
  { label: "Manrope", css: "'Manrope', sans-serif" },
  { label: "DM Sans", css: "'DM Sans', sans-serif" },
];

export const CUSTOM_BODY_FONTS: FontOption[] = [
  { label: "DM Sans", css: "'DM Sans', sans-serif" },
  { label: "Inter", css: "'Inter', sans-serif" },
  { label: "Work Sans", css: "'Work Sans', sans-serif" },
  { label: "Manrope", css: "'Manrope', sans-serif" },
  { label: "Poppins", css: "'Poppins', sans-serif" },
];

export const CUSTOM_MONO_FONTS: FontOption[] = [
  { label: "DM Mono", css: "'DM Mono', monospace" },
  { label: "Space Mono", css: "'Space Mono', monospace" },
  { label: "JetBrains Mono", css: "'JetBrains Mono', monospace" },
  { label: "IBM Plex Mono", css: "'IBM Plex Mono', monospace" },
];

export const FONT_WEIGHTS = [300, 400, 500, 600, 700];

export interface CMSTypeScaleBody {
  font: string;
  weight: number;
  lineHeight: number;
  letterSpacing: number;
}

export interface CMSTypeScaleHeadings {
  font: string;
  weight: number;
  lineHeight: number;
  letterSpacing: number;
  // A second, distinct font-family selectable inline in the rich text editor (e.g. to accent
  // a word within an otherwise body-font sentence) — independent of the main heading role.
  secondaryFont: string;
}

export interface CMSTypeScaleLabels {
  font: string;
  fontSize: number;
  weight: number;
}

export interface CMSTypeScale {
  baseFontSize: number;
  scaleRatio: number;
  previewText: string;
  body: CMSTypeScaleBody;
  headings: CMSTypeScaleHeadings;
  labels: CMSTypeScaleLabels;
}

// p is the reference point (base × ratio^0); each level above steps up one more power of the
// ratio (h6 = ratio^1 ... h1 = ratio^6), and "small"/"xsmall" step one and two powers below
// (ratio^-1, ratio^-2) — matching type-scale.com's convention exactly.
export function computeTypeScaleSizes(baseFontSize: number, scaleRatio: number): Record<"h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "small" | "xsmall", number> {
  const step = (n: number) => Math.round(baseFontSize * Math.pow(scaleRatio, n) * 100) / 100;
  return {
    h1: step(6), h2: step(5), h3: step(4), h4: step(3), h5: step(2), h6: step(1),
    p: step(0),
    small: step(-1),
    xsmall: step(-2),
  };
}

// Every field here is optional and, when unset, the component just follows the Accent color
// above — so a fresh site (or a "Reset to Accent" click, which simply deletes the pair) needs
// no special-casing anywhere else. Setting a value lets one component type (e.g. just Links)
// diverge from the shared Accent without touching it.
export interface CMSComponentColors {
  buttonDark?: string;
  buttonLight?: string;
  linkDark?: string;
  linkLight?: string;
  linkHoverDark?: string;
  linkHoverLight?: string;
  labelDark?: string;
  labelLight?: string;
  fieldDark?: string;
  fieldLight?: string;
  textareaDark?: string;
  textareaLight?: string;
  checkboxDark?: string;
  checkboxLight?: string;
  radioDark?: string;
  radioLight?: string;
  switchDark?: string;
  switchLight?: string;
  menuDark?: string;
  menuLight?: string;
  tabBarDark?: string;
  tabBarLight?: string;
  // Which accent swatch a role tracks when it has no literal hex override above (keyed by role
  // name, e.g. "button", "link", "linkHover" — the xDark/xLight field name minus "Dark"/"Light").
  // Unset/"accent" = primary Accent (the pre-existing, only-option behavior).
  followAccent?: Partial<Record<string, AccentFollow>>;
}

export type AccentFollow = "accent" | "accent2" | "accent3";

export type LinkUnderline = "none" | "hover" | "always";

export type ButtonFill = "fill" | "outline" | "text";
export type ButtonCorner = "sharp" | "soft" | "round" | "pill";
export type ButtonIconPosition = "none" | "left" | "right";
export type ButtonFontChoice = "heading" | "body" | "mono";
export type ButtonSize = "sm" | "md" | "lg";

export interface CMSButtonVariantStyle {
  fill: ButtonFill;
  corner: ButtonCorner;
  icon: ButtonIconPosition;
  font: ButtonFontChoice;
  uppercase: boolean;
  size: ButtonSize;
}

export type ButtonVariantId = "primary" | "secondary" | "tertiary";

export interface CMSButtonStyles {
  primary: CMSButtonVariantStyle;
  secondary: CMSButtonVariantStyle;
  tertiary: CMSButtonVariantStyle;
}

export const BUTTON_CORNER_RADIUS: Record<ButtonCorner, number> = {
  sharp: 4,
  soft: 8,
  round: 12,
  pill: 999,
};

export const BUTTON_SIZE_STYLE: Record<ButtonSize, { padding: string; fontSize: number }> = {
  sm: { padding: "8px 16px", fontSize: 13 },
  md: { padding: "12px 24px", fontSize: 15 },
  lg: { padding: "16px 32px", fontSize: 17 },
};

export type MenuHoverEffect = "background" | "underline" | "color";

export interface CMSMenuStyle {
  hoverEffect: MenuHoverEffect;
  corner: ButtonCorner;
  panelBgDark: string;
  panelBgLight: string;
  panelBorderDark: string;
  panelBorderLight: string;
}

export type TabBarFill = "fill" | "outline";

export interface CMSTabBarStyle {
  fill: TabBarFill;
  corner: ButtonCorner;
  fontSize: number;
  bgDark: string;
  bgLight: string;
  borderDark: string;
  borderLight: string;
}

export interface CMSTextAreaStyle {
  bgDark: string;
  bgLight: string;
  textDark: string;
  textLight: string;
}

export interface CMSSwitchStyle {
  thumbDark: string;
  thumbLight: string;
  trackOffDark: string;
  trackOffLight: string;
}

export interface CMSSavedTheme {
  id: string;
  name: string;
  colors: CMSDesignColors;
}

export interface CMSDesignSystem {
  colors: CMSDesignColors;
  fontPairing: CMSFontPairingId;
  typeScale: CMSTypeScale;
  componentColors: CMSComponentColors;
  linkUnderline: LinkUnderline;
  buttonStyles: CMSButtonStyles;
  menuStyle: CMSMenuStyle;
  tabBarStyle: CMSTabBarStyle;
  textAreaStyle: CMSTextAreaStyle;
  switchStyle: CMSSwitchStyle;
  // User-saved custom color snapshots, shown in the Color Palette's Theme Gallery alongside
  // the 3 curated THEME_PRESETS below.
  savedThemes: CMSSavedTheme[];
}

// 3 curated, ready-to-apply color combinations shown in the Color Palette's Theme Gallery —
// each a full CMSDesignColors set designed to hang together (accent hue relates to the
// dark/light neutrals rather than sitting on top of the site's default teal-and-cream base).
export const THEME_PRESETS: { id: string; name: string; colors: CMSDesignColors }[] = [
  {
    id: "sunset-coral",
    name: "Sunset Coral",
    colors: {
      accentDark: "#FF7A59", accentLight: "#E85A3C",
      headingDark: "#FBF3EC", headingLight: "#241611",
      textDark: "#F0E6DC", textLight: "#2B1D16",
      mutedDark: "#F0E6DC", mutedLight: "#7A6255",
      bodyDark: "#C4B2A6", bodyLight: "#5C4A3F",
      bgDark: "#17110D", bgLight: "#FBF1E9",
      cardDark: "#241A14", cardLight: "#F2E5D8",
      dividerDark: "#94827A", dividerLight: "#C7B6A9",
    },
  },
  {
    id: "violet-dusk",
    name: "Violet Dusk",
    colors: {
      accentDark: "#9B7BFF", accentLight: "#7C5CE0",
      headingDark: "#F3F0FB", headingLight: "#150E2A",
      textDark: "#E8E3F5", textLight: "#1E1735",
      mutedDark: "#E8E3F5", mutedLight: "#5C5480",
      bodyDark: "#B3A9CE", bodyLight: "#4A4270",
      bgDark: "#0F0B1A", bgLight: "#F5F2FB",
      cardDark: "#1B1530", cardLight: "#E9E4F5",
      dividerDark: "#8C82A6", dividerLight: "#B0A6CB",
    },
  },
  {
    id: "sage-forest",
    name: "Sage Forest",
    colors: {
      accentDark: "#6FBF8B", accentLight: "#3F9A63",
      headingDark: "#F1F6EF", headingLight: "#10190F",
      textDark: "#E5EDE1", textLight: "#182A17",
      mutedDark: "#E5EDE1", mutedLight: "#526B4F",
      bodyDark: "#ABC0A6", bodyLight: "#445E41",
      bgDark: "#0D1410", bgLight: "#F3F6EF",
      cardDark: "#172119", cardLight: "#E6EBDE",
      dividerDark: "#8A9C85", dividerLight: "#A9BBA2",
    },
  },
];

// [cssVariable, darkFieldKey, lightFieldKey] — the single source of truth for which
// CMSComponentColors field feeds which CSS variable, used by buildDesignSystemCss() below.
export const COMPONENT_COLOR_MAP: [string, keyof CMSComponentColors, keyof CMSComponentColors, string][] = [
  ["--btn-color", "buttonDark", "buttonLight", "Buttons"],
  ["--link-color", "linkDark", "linkLight", "Links"],
  ["--link-hover-color", "linkHoverDark", "linkHoverLight", "Links (hover)"],
  ["--label-color", "labelDark", "labelLight", "Labels"],
  ["--field-color", "fieldDark", "fieldLight", "Input Fields"],
  ["--textarea-color", "textareaDark", "textareaLight", "Text Areas"],
  ["--checkbox-color", "checkboxDark", "checkboxLight", "Checkboxes"],
  ["--radio-color", "radioDark", "radioLight", "Radio Buttons"],
  ["--switch-color", "switchDark", "switchLight", "Switches"],
  ["--menu-color", "menuDark", "menuLight", "Menus"],
  ["--tabbar-color", "tabBarDark", "tabBarLight", "Tab Bar"],
];

export interface CMSContent {
  global: CMSGlobal;
  homepage: CMSHomepage;
  work: CMSWork;
  evaluate: CMSEvaluate;
  process: CMSProcess;
  story: CMSStory;
  enquiries: CMSEnquiry[];
  mediaMeta: Record<string, CMSMediaMeta>;
  designSystem: CMSDesignSystem;
  branding: CMSBranding;
  socials: CMSSocials;
  notFound: CMSNotFound;
  companies: CMSCompany[];
  // Template for the "agency attribution" callout shown on a project/case study popup when it's
  // linked to a company (the "i" info icon next to "Created while working at X"). {company} and
  // {client} are replaced with that project's company name and client name. Optional so existing
  // saved content without it falls back to the original hardcoded copy.
  companyCreditCopy?: string;
}

// ─── Font pairings ──────────────────────────────────────────────────────────────
// A curated, pre-loaded set rather than a free-form Google Fonts picker — every font below is
// already imported in globals.css, so switching pairings is instant with no runtime font
// loading, flash-of-fallback-font, or risk of an untested combination looking broken.
export interface FontPairing {
  id: CMSFontPairingId;
  name: string;
  description: string;
  heading: string;
  body: string;
  mono: string;
}

export const FONT_PAIRINGS: FontPairing[] = [
  {
    id: "modern",
    name: "Modern",
    description: "The current look — clean geometric sans throughout.",
    heading: "'Poppins', sans-serif",
    body: "'DM Sans', sans-serif",
    mono: "'DM Mono', monospace",
  },
  {
    id: "editorial",
    name: "Editorial",
    description: "A serif heading brings a more crafted, magazine-like feel.",
    heading: "'Fraunces', serif",
    body: "'DM Sans', sans-serif",
    mono: "'DM Mono', monospace",
  },
  {
    id: "technical",
    name: "Technical",
    description: "Geometric grotesk heading + monospace pairing for a technical, engineering-forward feel.",
    heading: "'Space Grotesk', sans-serif",
    body: "'DM Sans', sans-serif",
    mono: "'Space Mono', monospace",
  },
];

export const DEFAULT_DESIGN_SYSTEM: CMSDesignSystem = {
  colors: {
    accentDark: "#14ADB5",
    accentLight: "#0B9AA2",
    headingDark: "#F5F1EA",
    headingLight: "#0D1318",
    textDark: "#EDE8DF",
    textLight: "#1A2128",
    mutedDark: "#EDE8DF",
    mutedLight: "#4A5D6B",
    bodyDark: "#A8B4BC",
    bodyLight: "#3D5260",
    bgDark: "#0F1519",
    bgLight: "#F5F1EB",
    cardDark: "#1A2128",
    cardLight: "#EBE7E0",
    dividerDark: "#989793",
    dividerLight: "#A9A9A7",
  },
  fontPairing: "modern",
  typeScale: {
    baseFontSize: 14,
    scaleRatio: 1.2,
    previewText: "Jai Boekhout Design Portfolio",
    body: { font: "'DM Sans', sans-serif", weight: 300, lineHeight: 1.75, letterSpacing: 0 },
    headings: { font: "'Poppins', sans-serif", weight: 500, lineHeight: 1.2, letterSpacing: 0, secondaryFont: "'Fraunces', serif" },
    labels: { font: "'DM Mono', monospace", fontSize: 10, weight: 400 },
  },
  componentColors: {},
  linkUnderline: "none",
  buttonStyles: {
    primary: { fill: "fill", corner: "round", icon: "right", font: "heading", uppercase: false, size: "md" },
    secondary: { fill: "outline", corner: "round", icon: "right", font: "heading", uppercase: false, size: "md" },
    tertiary: { fill: "text", corner: "round", icon: "none", font: "heading", uppercase: false, size: "md" },
  },
  menuStyle: {
    hoverEffect: "background",
    corner: "round",
    panelBgDark: "#1A2128",
    panelBgLight: "#EBE7E0",
    panelBorderDark: "#989793",
    panelBorderLight: "#A9A9A7",
  },
  tabBarStyle: {
    fill: "fill",
    corner: "pill",
    fontSize: 11,
    bgDark: "#1A2128",
    bgLight: "#EBE7E0",
    borderDark: "#989793",
    borderLight: "#A9A9A7",
  },
  textAreaStyle: {
    bgDark: "#161B20",
    bgLight: "#FBFAF8",
    textDark: "#EDE8DF",
    textLight: "#1A2128",
  },
  switchStyle: {
    thumbDark: "#0F1519",
    thumbLight: "#F5F1EB",
    trackOffDark: "#2F353A",
    trackOffLight: "#D6D3CE",
  },
  savedThemes: [],
};

// Builds a <style> tag's worth of CSS overriding both the app's own --c-* variables and the
// handful of shadcn-style variables (--background, --foreground, etc.) still read directly by
// a few components — so a color/font change applies everywhere without needing every component
// migrated onto one variable system first.
// "#14ADB5" -> "20, 173, 181" — lets components build rgba(var(--c-teal-rgb), alpha) for
// hover/glow effects instead of concatenating an alpha suffix onto a hex string (which breaks
// the moment the value is a CSS var() rather than a literal hex).
function hexToRgbChannels(hex: string): string {
  const m = /^#?([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex.trim());
  if (!m) return "20, 173, 181";
  return `${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}`;
}

export function buildDesignSystemCss(ds: CMSDesignSystem): string {
  const c = ds.colors;
  const cc = ds.componentColors ?? {};
  const isCustom = ds.fontPairing === "custom";
  const pairing = FONT_PAIRINGS.find((f) => f.id === ds.fontPairing) ?? FONT_PAIRINGS[0];
  const ts = ds.typeScale;
  const fontHeading = isCustom ? ts.headings.font : pairing.heading;
  const fontBody = isCustom ? ts.body.font : pairing.body;
  const fontMono = isCustom ? ts.labels.font : pairing.mono;
  const fontSecondary = isCustom ? ts.headings.secondaryFont : pairing.heading;

  // A role with no literal hex override falls back to whichever accent swatch it's set to
  // follow (defaulting to the primary Accent) rather than emitting nothing — resolveFollow
  // only returns undefined when even that accent swatch isn't configured, in which case the
  // static --btn-color: var(--c-teal) fallback already in globals.css takes over.
  function resolveFollow(role: string, mode: "Dark" | "Light"): string | undefined {
    const follow = cc.followAccent?.[role] ?? "accent";
    if (follow === "accent2") return mode === "Dark" ? c.accent2Dark : c.accent2Light;
    if (follow === "accent3") return mode === "Dark" ? c.accent3Dark : c.accent3Light;
    return mode === "Dark" ? c.accentDark : c.accentLight;
  }

  const darkComponentVars = COMPONENT_COLOR_MAP
    .map(([cssVar, darkKey]) => {
      const role = darkKey.replace(/Dark$/, "");
      const value = cc[darkKey] || resolveFollow(role, "Dark");
      return value ? `  ${cssVar}: ${value};` : "";
    })
    .filter(Boolean)
    .join("\n");
  const lightComponentVars = COMPONENT_COLOR_MAP
    .map(([cssVar, darkKey, lightKey]) => {
      const role = darkKey.replace(/Dark$/, "");
      const value = cc[lightKey] || resolveFollow(role, "Light");
      return value ? `  ${cssVar}: ${value};` : "";
    })
    .filter(Boolean)
    .join("\n");

  // Only emitted in Custom mode — the 3 preset pairings keep the fixed sizes/weights already
  // declared in globals.css (those rules read these same vars with a hardcoded CSS fallback).
  const typeScaleVars = isCustom
    ? (() => {
        const sizes = computeTypeScaleSizes(ts.baseFontSize, ts.scaleRatio);
        return `
  --h1-size: ${sizes.h1}px; --h2-size: ${sizes.h2}px; --h3-size: ${sizes.h3}px; --h6-size: ${sizes.h6}px;
  --body-size: ${sizes.p}px; --small-size: ${sizes.small}px;
  --heading-weight: ${ts.headings.weight}; --heading-line-height: ${ts.headings.lineHeight}; --heading-letter-spacing: ${ts.headings.letterSpacing}em;
  --body-weight: ${ts.body.weight}; --body-line-height: ${ts.body.lineHeight}; --body-letter-spacing: ${ts.body.letterSpacing}em;
  --label-size: ${ts.labels.fontSize}px; --label-weight: ${ts.labels.weight};`;
      })()
    : "";

  const underline = ds.linkUnderline ?? "none";
  const linkCss = `
.site-link { text-decoration: ${underline === "always" ? "underline" : "none"}; }
.site-link:hover { text-decoration: ${underline === "none" ? "none" : "underline"}; }`;

  const menu = ds.menuStyle;
  const tabBar = ds.tabBarStyle;
  const textArea = ds.textAreaStyle;
  const switchStyle = ds.switchStyle;
  const structuralCss = `
:root {
  --menu-corner: ${BUTTON_CORNER_RADIUS[menu.corner]}px;
  --tabbar-corner: ${BUTTON_CORNER_RADIUS[tabBar.corner]}px;
  --tabbar-font-size: ${tabBar.fontSize}px;
}`;

  return `:root {
  --c-teal: ${c.accentDark};
  --c-teal-rgb: ${hexToRgbChannels(c.accentDark)};
  --primary: ${c.accentDark};
  --sidebar-primary: ${c.accentDark};
  --c-heading: ${c.headingDark};
  --c-text: ${c.textDark};
  --c-text-dim: ${c.textDark};
  --foreground: ${c.textDark};
  --card-foreground: ${c.textDark};
  --c-text-muted: ${c.mutedDark};
  --muted-foreground: ${c.mutedDark};
  --c-text-body: ${c.bodyDark};
  --c-bg: ${c.bgDark};
  --background: ${c.bgDark};
  --c-bg-card: ${c.cardDark};
  --card: ${c.cardDark};
  --c-divider: ${c.dividerDark};
  --font-heading: ${fontHeading};
  --font-body: ${fontBody};
  --font-mono: ${fontMono};
  --font-secondary: ${fontSecondary};
  --menu-panel-bg: ${menu.panelBgDark}; --menu-panel-border: ${menu.panelBorderDark};
  --tabbar-bg: ${tabBar.bgDark}; --tabbar-border: ${tabBar.borderDark};
  --textarea-bg: ${textArea.bgDark}; --textarea-text: ${textArea.textDark};
  --switch-thumb: ${switchStyle.thumbDark};
  --switch-track-off: ${switchStyle.trackOffDark};
${darkComponentVars}${typeScaleVars}
}
:root[data-theme="light"] {
  --c-teal: ${c.accentLight};
  --c-teal-rgb: ${hexToRgbChannels(c.accentLight)};
  --primary: ${c.accentLight};
  --sidebar-primary: ${c.accentLight};
  --c-heading: ${c.headingLight};
  --c-text: ${c.textLight};
  --c-text-dim: ${c.textLight};
  --foreground: ${c.textLight};
  --card-foreground: ${c.textLight};
  --c-text-muted: ${c.mutedLight};
  --muted-foreground: ${c.mutedLight};
  --c-text-body: ${c.bodyLight};
  --c-bg: ${c.bgLight};
  --background: ${c.bgLight};
  --c-bg-card: ${c.cardLight};
  --card: ${c.cardLight};
  --c-divider: ${c.dividerLight};
  --menu-panel-bg: ${menu.panelBgLight}; --menu-panel-border: ${menu.panelBorderLight};
  --tabbar-bg: ${tabBar.bgLight}; --tabbar-border: ${tabBar.borderLight};
  --textarea-bg: ${textArea.bgLight}; --textarea-text: ${textArea.textLight};
  --switch-thumb: ${switchStyle.thumbLight};
  --switch-track-off: ${switchStyle.trackOffLight};
${lightComponentVars}
}
${structuralCss}
${linkCss}`;
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_CONTENT: CMSContent = {
  global: {
    email: "jai_boekhout@hotmail.nl",
    phone: "+61 0458 941 417",
    location: "Adelaide, Australia",
    tagline: "UX & Product Design",
  },
  homepage: {"headline":"<h2><span style=\"font-size: 96px;\">Hi, I'm Jai.</span></h2><p></p>","subheadline":"<h1><span style=\"font-size: 20px; font-weight: 300;\"><strong>I design digital experiences, websites and products that solve real problems.</strong></span></h1><p></p>","question":"<p><span style=\"color: rgb(20, 173, 181);\">What would you like to know?</span></p>","footerNote":"<p style=\"text-align: center;\">Open to discuss opportunities</p>","cards":{"work":{"question":"Can you solve our design problems?","description":"Explore projects, case studies and outcomes."},"recruit":{"question":"Are you the right person for this role?","description":"Skills, experience, qualifications and career history."},"process":{"question":"How do you approach UX and product design?","description":"Research, strategy, testing and design thinking."},"story":{"question":"What's your story?","description":"<p>The journey, interests and background behind the designer.</p>"}}},
  work: {
    heroStatement: "<h1><span style=\"font-size: 64px; line-height: 1;\">Understanding the problem always comes before the </span><span style=\"font-size: 64px; line-height: 1;\">design.</span><br>Here are the projects that demonstrate how that approach plays out across UX, brand, product, and build.</h1><h1></h1><p></p>",
    caseStudies: [
      {"id":1,"title":"Evolve Car Rental – UX/UI App Prototype","client":"UX Design Project · 2022","summary":"A UX/UI design project completed as part of a design course assessment.","outcomes":["End-to-end app prototype","User testing & research conducted","Improved user flow & transparency"],"tags":["UX Design","UI Design","Mobile App","Prototyping"],"coverImageUrl":"/imports/projects/evolve-car-rental/evolve-car-rental-app-cover-image-2.jpg","fullContent":"<h1>Evolve Car Rental app</h1><p>The Evolve Car Rental application is designed as part of a UX-design course project assessment.<br>During the project I have completed user testing and research to improve the user flow and transparency of rental apps.</p>","fullCaseStudy":true,"coverImagePosition":"54% 61%","fullCaseStudyLocked":false,"heroImageUrl":"/imports/projects/evolve-car-rental/evolve-car-rental-app-hero-image.jpg","updatedAt":"2026-08-26T10:22:09.533Z","img1Url":"/imports/projects/evolve-car-rental/evolve-car-rental-app-hightlight-image-1.jpg","status":"published","img2Url":"/imports/projects/evolve-car-rental/evolve-car-rental-app-highlight-image-2.jpg","img3Url":"/imports/projects/evolve-car-rental/evolve-car-rental-app-highlight-image-3.jpg","fullCaseStudyBannerUrl":"/imports/projects/evolve-car-rental/evolve-car-rental-app-top-banner-case-study.jpg","viewMorePinnedIds":["cs-2","cs-8","shadow-creek"],"heroImageScale":1,"hideScrollIndicator":false},
      {"id":2,"title":"Open Studios Australia – Multi-Role Platform Design","client":"Open Studios Australia","summary":"<p><span style=\"font-weight: 400; letter-spacing: 0em;\">Open Studios Australia is a nationwide digital platform designed to connect visitors with artists, studios, and creative events across the country. The project reimagines the traditional Open Studios experience by offering a centralised, mobile-first application where people can discover local creative communities, explore studios, attend activities, workshops, and browse curated catalogues. My role included concept development, user experience design, Object-Oriented UX (OOUX) structuring, and interface prototyping as well as developing the website and app together with JABA's dedicated tech team. The platform was developed with a strong focus on user experience and accessibility, ensuring that visitors, artists, studio owners, and licensees all have tailored tools to meet their unique needs.</span></p>","outcomes":["Delivered a multi-region platform supporting five distinct user roles with conditional, approval-gated workflows","Applied OOUX methodology to map the complete system before any screen design began","Designed three multi-status application workflows with host and guest dependency logic, auto-close rules, and cascading withdrawal handling","Built a catalogue generation tool producing both digital and print-ready PDF outputs directly from existing platform data","Delivered purpose-built dashboards for every user role, including a super admin system that scales across regions without duplicating infrastructure"],"tags":["UX Design","Product Design","OOUX","System Design","User Flow Mapping","Full-Stack Development","Multi-Tenant Architecture","Event Management","Dashboard Design","Cursor AI"],"liveUrl":"app.openstudios.com.au","fullContent":"<img src=\"/imports/projects/JABA/open-studio-australia/openstudios-logo-1000.png\" alt=\"\" width=\"397\" height=\"68\"><hr><h1>Open Studios Australia</h1><p><strong>Role:</strong> Product Designer &amp; Development (AI Coding)<br><strong>Stack:</strong> React, TypeScript, Vite, Tailwind, Express, PostgreSQL, Drizzle ORM, Google Cloud Storage, Firebase, Stripe, Google Maps</p><hr><h3>Overview</h3><p>Open Studios Australia is a nationwide platform connecting art lovers with artists, studios, and creative events across the country. The client needed to replace a process held together by spreadsheets and email threads with a single platform capable of serving multiple regions simultaneously.</p><p>The project was taken on end-to-end, covering user research, system design, UX flows, UI design, and full-stack development. The platform handles artist onboarding, multi-party event applications, regional administration, and professional event catalogue generation, all from one unified system.</p>","fullCaseStudy":true,"fullCaseStudyContent":"<details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">The Problem</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>Every regional open studios organisation is running events differently. Artists were manually sending bios and information for every event they joined. Organisers were chasing applications, cross-checking details, and building printed catalogues by hand. Art lovers had no reliable way to find events or follow artists they cared about. And because every region operated independently with no shared infrastructure, there was no realistic path to scale.</p><p>The challenge extended well beyond the interface. The project required designing a system capable of holding five distinct user types, complex multi-party workflows, and regional independence within a shared platform, while keeping the experience genuinely simple for every person using it.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">Understanding the Users</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>Before any screens were designed, five distinct user roles were mapped out along with what success looked like for each one.</p><table style=\"min-width: 50px;\"><colgroup><col style=\"min-width: 25px;\"><col style=\"min-width: 25px;\"></colgroup><tbody><tr><th colspan=\"1\" rowspan=\"1\"><p>Role</p></th><th colspan=\"1\" rowspan=\"1\"><p>Core Need</p></th></tr><tr><td colspan=\"1\" rowspan=\"1\"><p>Public visitor</p></td><td colspan=\"1\" rowspan=\"1\"><p>Discover artists, events, and studios</p></td></tr><tr><td colspan=\"1\" rowspan=\"1\"><p>Art lover (member)</p></td><td colspan=\"1\" rowspan=\"1\"><p>Save favourites, plan visits, follow artists</p></td></tr><tr><td colspan=\"1\" rowspan=\"1\"><p>Artist</p></td><td colspan=\"1\" rowspan=\"1\"><p>Showcase work, apply to events, add activities to events and&nbsp;collaborate with other artists</p></td></tr><tr><td colspan=\"1\" rowspan=\"1\"><p>Licensee (regional org)</p></td><td colspan=\"1\" rowspan=\"1\"><p>Manage events, review applications, create catalogues</p></td></tr><tr><td colspan=\"1\" rowspan=\"1\"><p>Super Admin</p></td><td colspan=\"1\" rowspan=\"1\"><p>Cross-region oversight and platform governance</p></td></tr></tbody></table><p>Treating each role as having genuinely different goals and mental models shaped every decision that followed, from navigation structure and permission logic through to database schema and dashboard design. A single generic admin experience was never an option.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">Structuring the System with OOUX</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>With five user types and deeply interconnected content, Object-Oriented UX methodology was used to define every core object in the platform before a single screen was designed. Artists, Artworks, Studios, Events, Activities, Workshops, Applications, Catalogues, Blogs, Regions, and Maps were each fully mapped with their attributes, relationships to other objects, and the actions each user role could perform on them.</p><p>This process delivered two critical outcomes. It gave the system a consistent internal logic where content entered once flows to every part of the platform that needs it, without duplication or manual re-entry. And it surfaced the most complex design problem early, before it had the chance to become a development problem.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">The Participation Problem</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>Artists can join an event three ways. Independently at their own studio, as a host who invites guest artists to share their space, or as a guest displaying at another artist's studio. Each path introduces dependencies that compound quickly.</p><p>A guest cannot apply until a host is confirmed. A host withdrawing affects every guest connected to them. Organisers need to review these relationships without getting buried in edge cases. And the system needs to handle scenarios like a guest applying to a host who has not yet joined the event, or a host withdrawing after their guests are already approved.</p><p>A conditional, approval-gated workflow was designed to cover all three participation paths. Every decision point, system prompt, approval state, and failure condition is accounted for, including auto-close rules for lapsed invitations, cascading withdrawal logic, and the ordering dependency between host and guest approvals.</p><p>A second workflow covers activity applications, for artists proposing workshops, demonstrations, or talks during an event. This handles collaborative activities with multiple co-hosts, invitation lapse rules, draft and live versioning for approved activities requiring updates, and withdrawal logic that cascades correctly when a host exits mid-event.</p><p>Both workflows feed into the same regional team review interface, giving licensees a single consolidated view of all pending decisions regardless of application type.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">Dashboards Built Around Real Workflows</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>Each user type received a purpose-built dashboard designed around their actual tasks and goals, not a generic admin panel with permissions added on top.</p><p><strong>Artist Dashboard</strong><br>Events are organised into four clear rows: attending, invited, suggested, and history. Artists have a complete picture of their current and upcoming participation at a glance. Collaboration is built into the activity submission flow, addressing the very real barrier that solo hosting creates for emerging artists.</p><p><strong>Licensee Dashboard</strong><br>Application management, artist search, event creation, catalogue generation, and content publishing are all consolidated in one place. The applications view opens filter-first so licensees land on a sorted, manageable list rather than an unstructured inbox. Artist search includes sorting by event participation count and follower count, supporting both new artist discovery and the management of existing relationships.</p><p><strong>Super Admin Dashboard</strong><br>All licensee capabilities are available, with the addition of a licensee selector dropdown. This single feature enables full platform management across every region from one interface, without requiring separate environments for each. The approach keeps the system lean and avoids duplicating infrastructure across regions.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">The Catalogue Tool</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>Licensees were producing event catalogues manually, with no consistent process and significant time investment. The catalogue tool generates directly from existing event data. A custom cover, advertisements, artist highlights, and a thank-you page can all be added within the tool. The output is both a digital catalogue with interactive maps and a print-ready PDF.</p><p>Because artist data flows from onboarding into every relevant part of the platform, there is nothing to re-enter and nothing to chase. What previously took hours now takes minutes.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">Iteration After Testing</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>Testing identified that licensees and super admins lacked a central location to manage platform content. The settings area was redesigned as a tabbed content management system, with each tab corresponding to a specific section of the site and surfacing only the controls relevant to that section.</p><p>Two further changes came directly from testing. A Highlighted Artists feature was introduced, allowing admins to manually pin and reorder up to four featured artists on the homepage, with remaining slots filled automatically by the platform. The Add Event workflow was also rebuilt with smart time defaults, flexible location options including the ability to pull studio locations directly from approved artist applications, and artist invitations integrated into the creation flow rather than managed as a separate step.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">Development</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>The application was developed using Cursor AI and Replit across a React and TypeScript frontend, an Express API, and a PostgreSQL database managed through Drizzle ORM. Integrations include Stripe for subscriptions, Google Maps for studio locations and geolocation, Firebase for push notifications, and Google Cloud Storage for all media assets.</p><p>The platform spans 35+ database tables, 100+ API endpoints, and 50+ frontend pages.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">Reflection</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>This project was not a UI refresh or a visual rebrand. It was a product designed from first principles, starting with a clear understanding of who the users are, mapping every object and relationship in the system before a screen was touched, and resolving the most complex workflow problems before visual design began.</p><p>The decisions that had the greatest impact were structural. How participation dependencies are validated. How content flows through the system without duplication. How five very different user types share one platform without any of them feeling like a secondary consideration.</p><p>That is the standard this project was held to throughout.</p></div></details><p></p><hr><p></p>","fullCaseStudyLocked":true,"status":"published","updatedAt":"2026-08-27T10:06:57.152Z","fullCaseStudyPassword":"qwertyu","coverImageUrl":"/imports/projects/JABA/open-studio-australia/open-studios-australia-cover-images.jpg","heroImageUrl":"/imports/projects/JABA/open-studio-australia/open-studios-australia-hero-images.jpg","img1Url":"/imports/projects/JABA/open-studio-australia/open-studios-australia-hightlight-image-1-.jpg","img2Url":"/imports/projects/JABA/open-studio-australia/open-studios-australia-hightlight-image-2-.jpg","img3Url":"/imports/projects/JABA/open-studio-australia/open-studios-australia-hightlight-image-3-.jpg","clientMode":"agency","companyId":"company-1785500629780","slug":"open-studios-australia"},
      {"id":3,"title":"Aquaponics System – Research & Exhibition Design","client":"AVANS University · Academic Project","summary":"A fully working exhibition aquaponics system with an 8-step explanation.","outcomes":["Fully working exhibition system built","8-step self-guided visitor tour","Arduino sensor programming & user testing"],"tags":["Exhibition Design","Prototyping","Arduino","Infographics"],"status":"published","updatedAt":"2026-08-20T11:48:46.429Z","coverImageUrl":"/imports/projects/aquaponics-system/img_3088.jpg"},
      {"id":4,"title":"Shadow Creek Winery – Website Design","client":"Shadow Creek","summary":"<p>Shadow Creek is a boutique vineyard and luxury accommodation nestled in McLaren Vale, South Australia. The project involved designing and building a Progressive Web App that brings their story to life, combining an integrated online wine shop, accommodation booking, and rich storytelling into a single, beautifully crafted digital experience built on the JABA CMS.</p>","outcomes":["#5 Google SERP – 'Luxury Accommodations McLaren Vale'","Designed and built a custom PWA on the JABA CMS for a boutique McLaren Vale vineyard and luxury accommodation","Integrated a fully functional online wine shop for direct-to-consumer sales of small-batch wines","Delivered a seamless accommodation booking experience within the PWA","Created a design direction that reflects the character and story of the property rather than a generic hospitality aesthetic","Published SEO-focused blog content post-launch to drive organic search visibility","Positioned Shadow Creek's digital presence to support the upcoming cellar door launch"],"tags":["Web Design","UX Design","SEO","JABA CMS V6","Wine Industry","Boutique Brand"],"liveUrl":"https://www.shadowcreek.com.au","coverImageUrl":"/imports/projects/JABA/shadow-creek-winery/shadow-creek-winery-cover-images.jpg","status":"unpublished","updatedAt":"2026-08-18T07:03:32.728Z","heroImageUrl":"/imports/projects/JABA/shadow-creek-winery/shadow-creek-winery-hero.jpg","img1Url":"/imports/projects/JABA/shadow-creek-winery/shadow-creek-winery-hightlight-image-1-.jpg","img2Url":"/imports/projects/JABA/shadow-creek-winery/shadow-creek-winery-hightlight-image-2-.jpg","img3Url":"/imports/projects/JABA/shadow-creek-winery/shadow-creek-winery-hightlight-image-3-.jpg","fullContent":"<p>Shadow Creek is not a typical hospitality client. Brad and Chelsea have spent years quietly building something special, improving the soil, achieving A-grade status for their shiraz, developing their own wine label, and transforming a hidden property into a luxury retreat. The website needed to carry that story with the same care and intention that went into building the place itself.</p><p>The design direction was built around the natural character of the property. Warm tones, considered typography, and a calm visual rhythm that guides visitors through the vineyard's story without rushing them toward a transaction. Every section was designed to feel like a natural extension of the Shadow Creek experience rather than a standard hospitality template.</p><p>The PWA was built on the JABA CMS with a fully integrated online shop, allowing visitors to browse and purchase Shadow Creek's small-batch wines directly. Each wine is presented with the same care as the labels themselves, which were designed to reflect the natural beauty of the property. The accommodation booking system gives guests a seamless path from discovering the property to securing their stay, with availability, pricing, and the booking flow all handled within the PWA.</p><p>A forward-looking section was also included covering the upcoming cellar door, set among stunning old gums on the property, giving visitors something to look forward to and a reason to return.</p><p>To support organic growth after launch, SEO-focused blog content was written and published through the CMS, building the site's visibility across McLaren Vale tourism, wine, and accommodation search terms over time.</p>","clientMode":"agency","companyId":"company-1785500629780"},
      {"id":5,"title":"Underground Installations — Website Rebuild","client":"Underground Installations","summary":"A full website rebuild for Underground Installations, a civil contracting business specialising in trenching and underground works. The project focused on modernising their online presence, improving service clarity, and introducing bold industrial design elements that visually reflect the precision and nature of their work.","outcomes":["#1 Google SERP – 'Underground Installation'","Delivered a full website rebuild with a modernised visual identity aligned to the civil contracting industry","Introduced trench and saw-inspired geometric design elements as a distinctive creative direction","Restructured service pages to improve capability communication and user navigation"],"tags":["Web Design","UX Design","SEO","JABA CMS V6","Website Rebuild","Construction Industry","Civil Contracting","SEO Structure"],"liveUrl":"https://www.undergroundinstallations.com.au","status":"unpublished","updatedAt":"2026-08-27T08:12:33.485Z","coverImageUrl":"/imports/projects/JABA/underground-installations/ugi-cover-images.jpg","heroImageUrl":"/imports/projects/JABA/underground-installations/ugi-hero-images.jpg","img1Url":"/imports/projects/JABA/underground-installations/ugi-hightlight-image-2-.jpg","img2Url":"/imports/projects/JABA/underground-installations/ugi-hightlight-image-1-.jpg","img3Url":"/imports/projects/JABA/underground-installations/ugi-hightlight-image-4-.jpg","fullContent":"<p>Underground Installations had the capability and experience to compete for serious contracts, but their website wasn't reflecting that. The previous site lacked visual impact and made it hard for potential clients to quickly understand the scope of services on offer.</p><p>The rebuild started with restructuring the content hierarchy. Service pages were reorganised to communicate capabilities and project experience clearly, reducing friction for visitors trying to understand what the business does and whether it fits their needs.</p><p>The creative direction was the most distinctive part of the project. Rather than defaulting to a generic construction site aesthetic, I introduced saw and trench-inspired design elements throughout. Angular shapes and strong geometric page cards were used to visually echo trench lines and cutting precision, reinforcing the brand's core services through intentional but subtle design cues. The result feels industrial without being heavy, and professional without being generic.</p><p>The site was built with mobile responsiveness and SEO-friendly page structure as baseline requirements, ensuring the new design performed as well technically as it looked visually. Strong calls-to-action were woven throughout to support enquiry flow and convert visitors into leads.</p>","clientMode":"agency","companyId":"company-1785500629780","coverImagePosition":"63% 58%","heroImagePosition":"77% 58%","img2Position":"50% 50%","img1Position":"50% 50%"},
      {"id":6,"title":"Avans Power Usage Installation","client":"University Assignment / Physical Installation & Data Visualisation","summary":"A physical, interactive installation designed to visualise the energy usage, building sizes, and user density across Avans University's 13 locations. Built from laser-cut wooden gears driven by stepper motors, the installation let visitors explore the relationship between how many people use a building, how large it is, and what it costs to run.","outcomes":["Designed and built a fully working physical installation exhibited at Avans University","Translated three data dimensions (building size, user count, occupancy density) into a single mechanical visual system","Engineered a custom planetary gear system with precise tooth calculations and a bespoke ring-gear stabilisation solution","Moved from breadboard prototype to a custom PCB design for a cleaner, more reliable build","Solved multi-motor stepper control, a known gap in available libraries at the time","Delivered a coin-free interactive input system that worked reliably in an exhibition environment"],"tags":["Physical Installation","Data Visualisation","Interaction Design","Laser Cutting","Electronics","Arduino","Prototyping"],"status":"published","updatedAt":"2026-08-26T11:12:53.994Z","fullContent":"<p>The brief was to analyse power usage data from Avans University and translate it into a physical installation. Rather than presenting the data as a chart or screen, we wanted something people could interact with and draw their own conclusions from.</p><p>The initial concept used lightbulbs that would illuminate once a building's running cost was reached through a money-based input. Through the design process this evolved significantly. We realised the gears themselves could carry the data, using size to represent building footprint, and small engraved figures around the edge to show the number of students and employees. The density of those figures communicated occupancy per square metre.</p><p>The input mechanism went through a similar evolution. We originally planned physical coins that users could insert, but this created practical problems around feedback, removal, and exhibition reliability. We replaced it with a physical slider that solved all three issues cleanly within the project timeframe.</p><p>The gears were designed using <a target=\"_blank\" rel=\"noopener noreferrer nofollow\" class=\"rte-link\" href=\"http://geargenerator.com\">geargenerator.com</a>, laser-cut from wood, and assembled into a planetary gear system. Getting the planetary gears right required precise calculation (Ring = 2 x Planet + Sun), manual tooth reshaping, and a custom solution to stop the ring gear from wobbling when the installation stood upright. The electronics were first prototyped on a breadboard, then moved to a custom PCB design to reduce size and improve reliability. Controlling multiple stepper motors simultaneously required finding the right library, as most available options did not support simultaneous multi-motor control with our motor shield.</p>","coverImageUrl":"/imports/projects/avans-energy-project/avans-energy-project-cover-images.jpg","heroImageUrl":"/imports/projects/avans-energy-project/avans-energy-project-hero-images.jpg","img1Url":"/imports/projects/avans-energy-project/avans-energy-project-hightlight-image-1-.jpg","img2Url":"/imports/projects/avans-energy-project/avans-energy-project-hightlight-image-2-.jpg","img3Url":"/imports/projects/avans-energy-project/avans-energy-project-hightlight-image-3-.jpg","slug":"avans-power-usage-installation"},
      {"id":7,"title":"Annosky — UX, Branding & Motion Design Internship","client":"Annosky / Internship","summary":"A multi-project internship at Annosky, a Dutch tech startup building a suite of apps including Annobase, Annotax, Yolabo, and Helios Mylos. My role covered UI/UX design, graphic design, motion design, usability testing, and representing the company at colleges across the Netherlands.","outcomes":["Contributed UI/UX design across four live products simultaneously","Designed and produced a full motion design explainer video for the Helios Mylos Kickstarter campaign","Created logo, branding, and visual identity for Helios Mylos","Designed print and event marketing materials across multiple brands (Annotax college tour, festival flyers)","Set up and facilitated usability testing sessions at colleges across the Netherlands","Represented the company by speaking at college events to present and promote the apps","Contributed to the crew poster and company brand materials as part of a small, fast-moving startup team"],"tags":["UI/UX Design","Motion Design","Graphic Design","Branding","Usability Testing","Mobile Apps","Print Design","Internship","Startup"],"status":"published","updatedAt":"2026-08-26T11:12:16.044Z","fullContent":"<p>Annosky was my first professional design environment, and it covered a lot of ground. The company was building several products simultaneously, which meant my work shifted between UI design, graphic production, testing, and outreach depending on what was needed.</p><p>For Annobase, a privacy-first social cloud platform, I contributed to the web UI design across multiple feature pages including Social, Cloud and Prints, and the privacy and no-ads value propositions. The visual identity leaned on a clean dark-blue aesthetic with a city bokeh backdrop, which I worked within to keep all screens consistent.</p><p>Annotax was a personal tax advisor app targeting students. I was involved in testing the prototype, identifying usability issues, and working on marketing materials including event flyers for the college tour, where we presented the app directly to students at venues like Scalda. I also created event presence materials such as the Weitjerock festival flyer, applying the Annotax brand to a festival sponsorship context.</p><p>Yolabo was a music collaboration app where I contributed to the UI design, working on the profile and project screens within the app's bold red visual identity.</p><p>For Helios Mylos, a solar energy Kickstarter project, I designed the logo, brand identity, and produced a motion design animation to support the campaign. This ranged from the wordmark and brand guidelines through to a full illustrated explainer video showing how the product worked and why it mattered.</p><p>A significant part of the internship also involved setting up and running usability testing sessions at colleges, speaking to students about the apps, and gathering real feedback that fed back into the design process.</p>","coverImageUrl":"/imports/projects/annosky/annosky-cover-images.jpg","heroImageUrl":"/imports/projects/annosky/annosky-hero-images.jpg","img1Url":"/imports/projects/annosky/annosky-hightlight-image-1-.jpg","img2Url":"/imports/projects/annosky/annosky-hightlight-image-3-.jpg","img3Url":"/imports/projects/annosky/annosky-hightlight-image-4-.jpg","clientMode":"agency","companyId":"company-1786775501702","slug":"annosky"},
      {"id":8,"title":"Pitchford Farms — Website Rebuild","client":"Pitchford Farms","summary":"A full website rebuild for Pitchford Farms, a South Australian family-owned cattle operation selling premium grass-fed beef direct to consumers. The project involved redesigning and rebuilding their site on a custom CMS, writing all website copy, and setting up PayPal e-commerce for quarter and half side beef pack orders.","outcomes":["Rebuilt and launched a full e-commerce website","Wrote and updated all website copy including product descriptions, FAQs, and terms and conditions","Structured product pages to clearly communicate the difference between beef packs","Integrated PayPal checkout for direct online ordering","Improved customer clarity around ordering, customisation, delivery, and food safety"],"tags":["Website Rebuild","E-Commerce","Copywriting","Agriculture","Food & Beverage","PayPal Integration"],"status":"published","updatedAt":"2026-08-27T08:17:35.862Z","coverImageUrl":"/imports/projects/JABA/Pitchford-Farms/pichford-farms-cover-image.jpg","heroImageUrl":"/imports/projects/JABA/Pitchford-Farms/pitchford-farms-homepage.jpg","img1Url":"/imports/projects/JABA/Pitchford-Farms/pichford-farms-hightlight-image-1-.jpg","img2Url":"/imports/projects/JABA/Pitchford-Farms/pichford-farms-hightlight-image-2-.jpg","img3Url":"/imports/projects/JABA/Pitchford-Farms/pichford-farms-hightlight-image-3-.jpg","liveUrl":"https://pitchfordfarms.com.au/","fullContent":"<p>Pitchford Farms needed a website that could do more than look good. They sell beef in bulk directly from the farm, which means their customers need clear information before they commit to a purchase. The old site wasn't communicating their offering well enough, and the ordering process wasn't working for them.</p><p>The rebuild started with understanding how their products actually work. Quarter and half side packs are quite different in terms of weight, price, and customisation options, and that distinction wasn't landing clearly with customers. I restructured the content and rewrote all copy to make the pack options easy to understand at a glance, including what customisation is available, how ordering and payment works, and what to expect around delivery and storage.</p><p>The site was built on our custom JABA CMS, with more complex development elements handed off to a developer. E-commerce was set up through PayPal, giving customers a straightforward way to pay for orders directly on the site.</p><p>Policy and FAQ content was also developed, covering areas like food safety, refunds, storage responsibilities, and delivery, written in plain language that reflects the farm's direct and honest approach.</p>","clientMode":"agency","companyId":"company-1785500629780","slug":"pitchford-farms","hideScrollIndicator":false},
      {"id":9,"title":"Goffee Coffee — Infographic & Poster Design","client":"Goffee Coffee, Mandalay, Myanmar / Freelance Project","summary":"<p>A coffee infographic and promotional poster designed for Goffee Coffee, a specialty coffee shop in Mandalay, Myanmar. What started as a visit to write a travel blog post turned into a design brief, with the owner's passion for coffee and its history providing the foundation for both pieces.</p><p></p>","outcomes":["Designed a coffee history infographic for in-café display at Goffee Coffee, Mandalay","Designed a complementary promotional poster aligned to the café's visual identity","Delivered both pieces end-to-end from brief to final artwork while travelling in Myanmar","Turned an unplanned conversation into a completed client project entirely on initiative"],"tags":["Graphic Design","Infographic Design","Poster Design","Print Design","Illustration","Food & Beverage","Freelance","Myanmar"],"status":"published","createdAt":"2026-07-25T23:06:43.352Z","updatedAt":"2026-08-26T11:00:50.067Z","fullContent":"<p>While travelling through Mandalay, a visit to Goffee Coffee to write a blog post quickly became something more. The owner shared the story behind his shop, his deep knowledge of coffee, its origins, and what drew him to the craft. The conversation was rich enough that by the end of the day, a design brief had taken shape organically.</p><p>The infographic was designed to communicate the journey of coffee in a way that was visually engaging and easy to follow for café visitors. Coffee has a layered history spanning continents and centuries, and the challenge was distilling that into something that felt informative without being overwhelming. The design needed to work in a café environment, where people are browsing rather than reading in depth, so hierarchy and visual flow were the priority.</p><p>The poster was designed to complement the infographic and sit within the café's visual identity, giving Goffee Coffee a piece of printed material that reflected the quality and character of the experience they were offering their customers.</p><p>Both pieces were created while still in Myanmar, working directly with the owner to get the details right.</p>","viewMoreCategory":"Graphic Design","coverImageUrl":"/imports/projects/Goffee-coffee-Mandalay/goffee-coffee-cover-images.jpg","heroImageUrl":"/imports/projects/Goffee-coffee-Mandalay/goffee-coffee-hero.jpg","img1Url":"/imports/projects/Goffee-coffee-Mandalay/goffee-coffee-hightlight-image-3-.jpg","img2Url":"/imports/projects/Goffee-coffee-Mandalay/goffee-coffee-hightlight-image-2-.jpg","img3Url":"/imports/projects/Goffee-coffee-Mandalay/goffee-coffee-hightlight-image-1-.jpg","viewMoreHeading":"View More Projects","viewMoreSort":"newest","slug":"goffee-coffee"},
      {"id":10,"title":"North Star Rewards — Membership Card & Brand Design","client":"North Adelaide Football Club","summary":"<p>North Adelaide Football Club approached JABA to create a rewards membership program that could be used across their three hospitality venues, Pavilion at Prospect, Grand North, and Northern Tavern. The brief started as a simple membership card and evolved into a full brand identity, with the North Star name and visual concept developed entirely from scratch.</p>","outcomes":["Concepted and named the North Star rewards program from scratch","Designed front and back of the membership card for use across three hospitality venues","Created a bold visual identity that connects to the club's brand without being football-specific","Delivered a design foundation ready to extend across flyers, web pages, and all four club and venue sites","Received direct client praise for the creative direction and execution"],"tags":["Brand Identity","Graphic Design","Print Design","Card Design","Membership Program","Hospitality","Sports Club"],"status":"unpublished","createdAt":"2026-07-28T08:05:44.459Z","updatedAt":"2026-08-27T07:25:25.816Z","viewMoreHeading":"","fullContent":"<p>The client came to us with a clear goal but an open brief. They wanted a venue membership that offered genuine value to locals who loved the venues but had no interest in a football club membership. Something simple enough for an older demographic to pick up at a bar, fill in, and keep in their wallet.</p><p>The first task was naming it. The client had floated \"Roosters Venue Member\" but was open to something better. North Star felt right immediately, it connected to the club's identity without leaning on football, worked across all three venues, and had the kind of name that could carry a brand long term.</p><p>The visual design followed the name. A bold star mark in the club's red, set against a dark background with a subtle grey star pattern that gives depth without competing with the logo. The result is a card that feels premium and intentional, something worth keeping rather than discarding. The back of the card lays out the full membership benefits clearly alongside all three venue logos, reinforcing that this card works everywhere.</p><p>The brief also outlined a path beyond the card itself, including a DL flyer for counter display and landing pages across all four club and venue websites to promote the membership. The card design established the visual foundation for all of that.</p><p>The client's response said it best, the design embraced the red of the Roosters and stood out brilliantly, which was exactly the intention.</p>","coverImageUrl":"/imports/projects/JABA/North-Star/north-star-cover-images-1-.jpg","coverImageHoverUrl":"/imports/projects/JABA/North-Star/north-star-cover-images.jpg","img1Url":"/imports/projects/JABA/North-Star/north-star-hightlight-image-1-.jpg","img2Url":"/imports/projects/JABA/North-Star/north-star-hightlight-image-2-.jpg","img3Url":"/imports/projects/JABA/North-Star/north-star-hightlight-image-3-.jpg","heroImageUrl":"/imports/projects/JABA/North-Star/north-star-hero-images.png","clientMode":"agency","companyId":"company-1785500629780","hideScrollIndicator":false,"slug":"north-star-rewards"},
      {"id":11,"title":"Alfa Vital — Brand Identity, Product Design & Industrial Installation","client":"Alfa Vital / Freelance Contract","summary":"<p>A wide-ranging freelance contract for Alfa Vital, a premium lucerne producer based in Biloela, Queensland. The project covered everything from brand identity and product packaging through to the hands-on design and physical construction of a full agricultural processing installation, three custom conveyor belts, a hydraulic press system, a full-scale dryer, and a converted bulk bin truck.</p>","outcomes":["Designed a full brand identity including logo variations for multiple applications","Designed a retail product label for the 15kg Premium Lucerne Chaff bag","Created Facebook profile picture, page header, and launch promotional posts","Designed and physically built three custom conveyor belts for the lucerne processing line","Designed and built a hydraulic press system and full-scale dryer in a shipping container","Converted a horse truck into a high-capacity bulk bin with walking floor and self-levelling system","Delivered the complete installation from concept through to working production-ready equipment"],"tags":["Brand Identity","Logo Design","Packaging Design","Print Design","Facebook Marketing","Social Media Assets","Industrial Design","Agricultural Design","Fabrication"],"status":"published","createdAt":"2026-07-28T08:32:13.807Z","updatedAt":"2026-08-26T12:32:22.142Z","fullCaseStudy":true,"fullContent":"<p>This was not a typical design brief. Alfa Vital needed to launch a new premium lucerne product from the ground up, which meant building the brand and building the machinery at the same time.</p><p>The Alfa Vital identity needed to communicate quality, agriculture, and premium product positioning without feeling generic. The AV monogram with leaf detail was developed across multiple variations to give the client flexibility across different applications. The product label for the 15kg Premium Lucerne Chaff bag was designed to carry the nutritional analysis clearly, communicate key selling points, and still feel like a brand worth trusting. Facebook assets were created to support the launch, including a profile picture, page header, and promotional posts.</p><p>The physical side of the project required designing and building three custom conveyor belts, a hydraulic press system, and a full-scale dryer housed in a shipping container. An old horse truck was converted into a high-capacity bulk bin complete with a walking floor and self-levelling system. Every component was designed from concept and built hands-on, including fabrication and welding on site in Biloela.</p>","fullCaseStudyContent":"<details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">Overview</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>Alfa Vital came to me with an ambitious goal and a tight timeline. They were launching a premium lucerne product into a competitive agricultural market and needed everything built at once, the brand, the packaging, the social presence, and the physical machinery to actually produce the product. It was one of the more unusual briefs I have taken on, and one of the most rewarding.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">The Brand</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>The starting point was the logo. Alfa Vital needed an identity that felt premium and agricultural without defaulting to the clichés of the category. The AV monogram became the foundation, with a leaf detail growing from the letterforms to connect the mark directly to the product. Multiple variations were developed to give the client genuine flexibility: a circular badge version for the product label, a standalone wordmark for signage, and a simplified mark for social media profile use. The green palette was rooted in the product rather than picked from a generic agricultural colour library.</p><p>Getting the variations right early meant every subsequent application had a solid foundation to work from. There was no retrofitting the logo to fit the label or the Facebook header, it was built to flex from the start.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">Product Label</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>The 15kg Premium Lucerne Chaff label needed to do a lot of work in a small space. Feed store customers make quick decisions, so the label had to communicate the product's key advantages fast, dust reduced, higher in protein, consistent quality, while also carrying the full nutritional analysis required for a product of this type.</p><p>The landscape photography of the Queensland irrigation fields running across the label grounds the product in where it comes from. Combined with the Alfa Vital brand mark and the Queensland Product badge, the label communicates provenance and quality at a glance. The layout was designed to be readable quickly in a busy retail or agricultural environment, not just attractive on a screen.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">Facebook Launch Assets</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>To build awareness ahead of the product hitting shelves, a set of Facebook assets was created to establish the brand's presence online. This included a profile picture using the standalone AV mark, a page header carrying the full brand, and a coming soon promotional post to generate early interest. The assets were designed to be consistent with the product label, so anyone who encountered the brand online before seeing it in store would immediately recognise it.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">The Installation</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>The design work ran in parallel with something considerably more hands-on. Alfa Vital needed a full lucerne processing line built from scratch on their property in Biloela, and that meant designing and physically constructing every component of it.</p><p>Three custom conveyor belts were designed and built to move product through the processing stages. The sizing, drive systems, and chain configurations were all worked out from scratch based on the production requirements. Getting the throughput right meant understanding the whole process flow, not just the individual components.</p><p>A hydraulic press system was designed and built to compress the lucerne into the final product form. Alongside that, a full-scale dryer was built inside a shipping container, converting the container into a functional processing unit within the installation.</p><p>The most involved single conversion was the horse truck. An old truck was stripped back and rebuilt as a high-capacity bulk bin, fitted with a walking floor system to move product toward the outlet and a self-levelling mechanism to ensure consistent flow during processing. Getting the walking floor geometry right required working through the problem on site, adapting the design as the build progressed.</p><p>Every component was fabricated and welded on site. The problems that came up were practical and often unique, and each one required finding a solution with what was available rather than waiting for ideal conditions.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">Outcome</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>The installation went into production and the brand launched alongside it. Seeing the machinery running, the product coming off the line, and the Alfa Vital label on a finished bag of chaff at the end of it was a genuinely satisfying result. This project sits outside the usual boundaries of design work, but the thinking behind it, understanding the problem, designing a solution, and making it work in the real world, is the same process regardless of whether the output is a logo or a conveyor belt.</p></div></details><p></p>","coverImageUrl":"/imports/projects/alpha-vital/screenshot-2021-06-22-at-16.01.34.png","img1Url":"/imports/projects/alpha-vital/143888822_253272232829085_7948177119267517642_n-1.jpeg","img1Position":"47% 36%","img2Url":"/imports/projects/alpha-vital/20200715_071214.jpeg","img3Url":"/imports/projects/alpha-vital/20201102_113900.jpeg","coverImagePosition":"61% 0%","slug":"alfa-vital"},
    ],
    homeStats: {"enabled":true,"count":3,"slotIds":["years-industry","countries","qualifications",null,null,null]},
    projects: [
      {"id":"evolve","num":"01","name":"Evolve Car Rental","client":"UX Design Project · 2022","tags":["UX Design","UI Design","Mobile App","Prototyping"],"desc":"A UX/UI design project improving user flow and transparency in the car rental experience through user testing and research.","outcomes":["End-to-end app prototype","User testing & research conducted","Improved user flow & transparency"],"imgs":["/imports/projects/evolve-car-rental/screenshot-2025-06-29-at-09.32.33.png","","",""],"live":null,"caseStudy":null,"linkedCaseStudyId":1},
      {"id":"aquaponics","num":"03","name":"Aquaponics System","client":"AVANS University · Academic Project","tags":["Research","Exhibition Design","Prototyping","Arduino","Infographics"],"desc":"A fully working exhibition aquaponics system with an 8-step self-guided visitor explanation, built from scratch.","outcomes":["Fully working exhibition system built","8-step self-guided visitor tour","Arduino sensor programming & user testing"],"imgs":["/imports/projects/aquaponics-system/img_3091-1.jpg","/imports/projects/aquaponics-system/aquaponics-systeem1.png","/imports/projects/aquaponics-system/design1.png","/imports/projects/aquaponics-system/design1-copy.png"],"live":null,"caseStudy":null,"linkedCaseStudyId":3},
      {"id":"shadow-creek","num":"04","name":"Shadow Creek Winery","client":"Shadow Creek · McLaren Vale","tags":["Web Design","UX Design","SEO","JABA CMS V6"],"desc":"High-end retreat website capturing the tranquillity of McLaren Vale, ranking #5 for luxury accommodations in the region.","outcomes":["#5 Google SERP – 'Luxury Accommodations McLaren Vale'","Mobile-first responsive design shipped","SEO blog content + social feed integration"],"imgs":["/imports/projects/JABA/shadow-creek-winery/shadow-creek-homepage.jpg","/imports/projects/JABA/shadow-creek-winery/screenshot-2025-06-28-at-15.47.31.png","/imports/projects/JABA/shadow-creek-winery/screenshot-2025-06-28-at-15.54.44.png","/imports/projects/JABA/shadow-creek-winery/shadow-creek-blogs.jpg"],"live":"https://www.shadowcreek.com.au","caseStudy":null,"linkedCaseStudyId":4},
      {"id":"ugi","num":"05","name":"Underground Installations","client":"UGI · South Australia","tags":["Web Design","UX Design","SEO","JABA CMS V6"],"desc":"Modernised digital presence for a civil/mining underground utility company, reaching #1 Google SERP.","outcomes":["#1 Google SERP – 'Underground Installation'","Trench-inspired navigation tile design","Image-enhanced top navigation system"],"imgs":["","","",""],"live":"https://www.undergroundinstallations.com.au","caseStudy":null,"linkedCaseStudyId":5},
      {"id":"ct-filtration","num":"06","name":"CT Filtration","client":"CT Filtration · Adelaide","tags":["Web Design","UX Design","JABA CMS V6","Photoshop"],"desc":"<p>Website design for Adelaide's whole-house water filtration specialist, image-enhanced navigation, a dedicated Benefits page as a top-level marketing tool, 3D product walkthrough video, and Google Reviews integration.</p>","outcomes":["Image-enhanced navigation for faster product recognition","Benefits page given top-level placement as a key conversion tool","3D product walkthrough video to support informed buying decisions","Google Reviews integration for social proof and credibility"],"imgs":["/imports/projects/JABA/ct-filtration/ct-filtration-hightlight-image.jpg","/imports/projects/JABA/ct-filtration/ct-filtration-hightlight-image-3-.jpg","/imports/projects/JABA/ct-filtration/ct-filtration-hightlight-image-2-.jpg","/imports/projects/JABA/ct-filtration/ct-filtration-hero-image.jpg","",""],"live":"https://ctfiltration.com.au/","caseStudy":null,"coverImageUrl":"/imports/projects/JABA/ct-filtration/ct-filtration-cover-images.jpg","heroImageUrl":"/imports/projects/JABA/ct-filtration/ct-filtration-hero-image.jpg","img1Position":"48% 56%","img2Position":"46% 44%","status":"published","updatedAt":"2026-08-27T09:14:04.944Z","clientMode":"agency","companyId":"company-1785500629780"},
      {"id":"windmills","num":"06","name":"West-Zeeuws Vlaanderen Windmills","client":"Personal Project · The Netherlands","tags":["Illustration","Vector Design","Merchandise"],"desc":"Vector illustrations of two historic windmills from West-Zeeuws Vlaanderen — De Witte Juffer from IJzendijke and the wooden mill from Retranchement — turned into hand-printed T-shirts by a traditional craftsman.","outcomes":["Vector drawings of two regional windmills created from photo reference","T-shirt mockups designed from original artwork","Hand-printed T-shirt series produced for sale"],"imgs":["/imports/projects/windmills/received_10212229511706591.png","/imports/projects/windmills/received_10212229511706591.png","/imports/projects/windmills/received_166536747282909.jpeg","/imports/projects/windmills/received_167160450553872.jpeg","/imports/projects/windmills/received_10212217181758350.png","/imports/projects/windmills/received_166536747282909.jpeg","/imports/projects/windmills/received_167160450553872.jpeg","/imports/projects/windmills/received_10212229511706591.png"],"live":null,"caseStudy":null,"status":"published","updatedAt":"2026-08-26T08:00:17.248Z","coverImageUrl":"/imports/projects/windmills/received_10212217181758350.png","heroImageUrl":"/imports/projects/windmills/wittejuffer.jpg","heroImageScale":1},
      {"id":"zythologist","num":"08","name":"The Zythologist","client":"The Zythologist · Melbourne","tags":["Graphic Design","Infographic","Merchandise","Social Media"],"desc":"<p>Infographic poster and merchandise design for a <span style=\"font-size: 14px;\">Melbourne</span> craft beer brewery — explaining their brewing process through print, a 9-panel Instagram grid, and branded event merchandise.</p><p></p>","outcomes":["Brewing process infographic designed for print (A4) and digital","9-panel Instagram carousel reformatted from the infographic","Promotional products and event merchandise designed","Team T-shirt designed from original brand artwork"],"imgs":["/imports/projects/zythologist/zythologist-hightlight-image-1-.jpg","/imports/projects/zythologist/zythologist-hightlight-image-2-.jpg","/imports/projects/zythologist/zythologist-hightlight-image-3-.jpg","/imports/projects/zythologist/zythologist-hightlight-image-1-.jpg","/imports/projects/zythologist/instagram-grid-9-images-02.png","/imports/projects/zythologist/instagram-grid-9-images-03.png","/imports/projects/zythologist/instagram-grid-9-images-04.png","/imports/projects/zythologist/instagram-grid-9-images-05.png","/imports/projects/zythologist/instagram-grid-9-images-06.png","/imports/projects/zythologist/instagram-grid-9-images-07.png","/imports/projects/zythologist/instagram-grid-9-images-08.png","/imports/projects/zythologist/instagram-grid-9-images-09.png","/imports/projects/zythologist/screenshot-2023-03-01-at-17.22.43.png","","/imports/projects/zythologist/whatsapp-image-2022-04-12-at-4.19.53-pm.jpeg"],"live":null,"caseStudy":null,"coverImageUrl":"/imports/projects/zythologist/zythologist-cover-images.jpg","status":"published","heroImageUrl":"/imports/projects/zythologist/zythologist-hero.jpg","img1Position":"48% 50%","updatedAt":"2026-08-26T11:10:13.712Z","coverImageHoverUrl":"/imports/projects/zythologist/hanging_t-shirt_mens2.png","img3Scale":1},
      {"id":"alliance-metal","num":"09","name":"Alliance Metal","client":"Alliance Metal","tags":["Web Design","UX Design","SEO","JABA CMS V6"],"desc":"Website revamp for an Australian industrial fabrication company, region-specific SEO landing pages, Industries Served navigation, project case study blogs, and individual service pages.","outcomes":["Industries Served section showcasing cross-sector expertise","Project blogs for driving SEO through in-depth case studies","Individual service pages for clear, organised information","4 region-specific landing pages targeting local search queries"],"imgs":["/imports/projects/JABA/alliance-metal/Alliance-Metal-Hightlight-2.jpg","/imports/projects/JABA/alliance-metal/Alliance-Metal-Hightlight-2.jpg","/imports/projects/JABA/alliance-metal/Alliance-Metal-Hightlight-1.jpg","/imports/projects/JABA/alliance-metal/Alliance-Metal-Hightlight-3.jpg","",""],"live":"https://www.alliancemetal.com.au","caseStudy":null,"heroImageUrl":"/imports/projects/JABA/alliance-metal/Alliance-Metal-Hero-Image.jpg","status":"published","updatedAt":"2026-08-27T09:27:38.171Z","coverImageUrl":"/imports/projects/JABA/alliance-metal/Alliance-Metal-Cover-Image4.jpg","clientMode":"agency","companyId":"company-1785500629780","img3Position":"50% 52%","img1Position":"49% 54%"},
    ],
    featuredProjectOrder: ["cs-2","evolve","shadow-creek","cs-8","ct-filtration","ugi","zythologist","alliance-metal","cs-6"],
    projectListLayout: "card",
    projectListColumns: 5,
    projectListRows: 3,
    deletedProjectIds: ["open-studio"],
  },
  evaluate: {
    heroStatement: "<h1><span style=\"font-size: 14px;\">Everything you need to evaluate me as a candidate, from experience and qualifications to the projects, processes and multidisciplinary skills I bring to a team.</span></h1><p></p>",
    bio: "<p>Dutch-born UX/UI Designer, Web Designer and Creative Technologist based in Australia.</p><p>I combine design thinking, digital strategy, project management and technical implementation to create user-centred digital experiences that solve real business and customer problems.</p><p>With experience spanning UX design, web design, digital marketing, project management and creative technology, I bring a multidisciplinary perspective that helps bridge the gap between user needs, business goals and technical execution.</p>",
    industries: ["Education","Wellness","Agriculture","Tourism","E-commerce","Small Business"],
    stats: [
      {"id":"years-industry","value":"10+","label":"Years Industry Experience","icon":"Briefcase"},
      {"id":"years-design","value":"8+","label":"Years Professional Design Experience","icon":"Palette"},
      {"id":"countries","value":"2","label":"Countries Worked In","icon":"Globe"},
      {"id":"industries","value":"6+","label":"Industries","icon":"Layers"},
      {"id":"qualifications","value":"5","label":"Qualifications","icon":"GraduationCap"},
      {"id":"location","value":"Adelaide","label":"Current Location","sub":"Australia","icon":"MapPin"},
    ],
    skills: [
      {"title":"UX Design","skills":["User Research","User Testing","Wireframing","Information Architecture","Prototyping"]},
      {"title":"UI Design","skills":["Visual Design","Design Systems","Responsive Design","Accessibility"]},
      {"title":"Web Design & Development","skills":["WordPress","CMS Platforms","Progressive Web Apps","App Development","JABA CMS V6","Conversion Optimisation"]},
      {"title":"Project Leadership","skills":["Stakeholder Management","Project Delivery","Team Collaboration","Business Communication"]},
      {"title":"Digital Marketing","skills":["SEO","Analytics","Content Strategy","Social Media"]},
      {"title":"Creative Technology","skills":["Rapid Prototyping","Interactive Installations","Physical-Digital Experiences"]},
    ],
    clients: [],
    clientSliderSpeed: 60,
    experience: [
      {"org":"JABA Web Design","period":"2023 – Present","role":"Web Designer & Project Manager","highlights":["Managed fortnightly review meetings with major international clients including VS Sassoon and Cuisinart, ensuring design solutions aligned with brand standards and target audiences.","Designed low and high fidelity prototypes, user flows, onboarding flows, and responsive interface elements in Figma across a portfolio of over 160 live websites and apps.","Built and delivered complete websites and apps using the JABA bespoke CMS and ECM platform, including designing new widgets, menu styles, and shipping method integrations.","Managed 50+ monthly tasks across active client projects using Asana, coordinating between design, technical development, and client stakeholders from brief through to launch.","Led UX design and delivery of a multi-region platform managing complex multi-party workflows across five distinct user roles, from research through to live deployment."],"tags":["UX Design","Web Design","App Design","AI Development","Project Management","Stakeholder Management","Cursor AI","Replit AI"],"companyId":"company-1785500629780","projectOrder":[{"id":"cs-2"},{"id":"ct-filtration"},{"id":"cs-8"},{"id":"alliance-metal"},{"id":"ugi"},{"id":"cs-10"},{"id":"shadow-creek"}],"description":"<p>Working as a UX/UI Designer and Project Manager at JABA Web Design, I am responsible for designing and delivering client websites and apps from brief through to launch using a bespoke CMS. The role spanned client communication, UX design, web and app design, designing new functionalities, multimedia content production, and SEO, covering the full scope of a project rather than a single discipline. Clients at JABA ranged from national brands like Conair, VS sassoon and Cuisinart through to local South Australian businesses and sporting organisations like Adelaide Footy League, Vili's Family Bakery, SA Parks, CT Filtration and Calypso Star Charters.</p>","projectsDisplayMode":"list"},
      {"org":"Us 2 Travel Moments","period":"2017 – 2022","role":"Digital Designer & Content Creator","highlights":["Designed and developed WordPress websites.","Managed multiple Shopify stores.","Produced photography and video content.","Grew digital audiences through content strategy.","Implemented SEO and analytics tracking.","Managed customer-facing online experiences."],"tags":["Web Design","Digital Marketing","Content Strategy","E-Commerce"],"projectOrder":[{"id":"zythologist"},{"id":"cs-9"}]},
      {"org":"Alfa Vital","period":"2020 – 2021","role":"Design Lead","highlights":["Led design and development of innovative agricultural processing systems.","Achieved 400% efficiency improvements and 40% increased yield.","Designed the complete processing plant workflow.","Managed branding, product packaging and construction coordination.","Delivered large-scale multidisciplinary projects."],"tags":["Industrial Design","Project Management","Leadership","Systems Thinking"],"projectOrder":[{"id":"cs-11"}],"description":"<p>In 2020 I took on a freelance contract with Alfa Vital, a premium lucerne producer in Biloela, Queensland, covering everything from brand identity and product packaging through to the hands-on design and construction of a full agricultural processing installation. Working on site, I built three custom conveyor belts, a hydraulic press system, a full-scale dryer in a shipping container, and converted a horse truck into a high-capacity bulk bin, all fabricated and welded on site. The result was a processing line that ran 400% more efficiently than conventional farming with 40% more yield overall. One of the most unconventional projects in this portfolio and one of the most satisfying.</p>","projectsDisplayMode":"card","projectsFeaturedId":"cs-11"},
      {"org":"Annosky","period":"2015 – 2017","role":"UX/UI Designer","highlights":["Designed interfaces for internal software products.","Conducted usability testing with more than 500 students.","Developed user personas and testing frameworks.","Produced prototypes, graphics, video and motion design.","Collaborated closely with developers and product teams."],"tags":["UX Research","UI Design","User Testing","Prototyping"],"companyId":"company-1786775501702","projectsDisplayMode":"card","projectsFeaturedId":"cs-7"},
    ],
    qualifications: [
      {"title":"Bachelor of Communication & Multimedia Design ( UX/UI )","org":"Avans Hogeschool - Breda","major":"Creative Technology","minor":"Meaningful Data Design","year":"2011 - 2016"},
      {"title":"Professional Diploma in UX Design","org":"UX Design Institute – Credit-Rated by Glasgow Caledonian University","year":"2022 - 2023"},
      {"title":"Advanced Diploma of Digital Marketing","org":"International House Business College Adelaide","year":"2023 - 2024"},
      {"title":"Diploma of Project Management","org":"Southern Cross Education Institute Adelaide","year":"2022 - 2023"},
    ],
    additional: ["Sport & Exercise Coordination","Outdoor Sports","PADI Rescue Diver","PADI Freediver","Kitesurfing"],
    testimonials: [
      {"name":"Benjamin Simmer","quote":"<p><span style=\"color: rgb(255, 255, 255);\">Jai's core strength is being able to focus on the smallest of details while still maintaining a clear overview of any design-related challenge.</span></p>","highlights":["Detail-oriented","Strategic thinker","Problem solver"]},
      {"name":"Donny Verduijn","quote":"<p><span style=\"color: rgb(237, 232, 223);\">I know Jai as a hard-working person, a reliable team player and an important pivot within multidisciplinary teams.</span></p>","highlights":["Reliable","Collaborative","Hands-on"]},
    ],
    beyondDesign: "<p></p>",
    ctaHeading: "Interested in working together?",
    ctaBody: "<p>Whether you're hiring for a UX/UI Designer, Product Designer, Web Designer or multidisciplinary digital role, I'd love to hear about the opportunity.</p><p></p><p></p>",
    clientsHidden: true,
    resumeUrl: "/resume/resume.pdf?v=1785930579765",
    beyondDesignHeading: "",
    beyondDesignHidden: true,
  },
  process: {
    heroStatement: "Design is more than creating screens.",
    steps: [
      {"id":"problem","title":"Problem","tagline":"Understand before you act","description":"<p>A good design solution starts with asking the right questions. Before touching Figma or writing a brief, I invest time in understanding what is actually broken and why. That means talking to the people involved, looking at what exists, and getting clear on what success looks like. Skipping this step is the fastest way to design the wrong thing really well.</p>","activities":["Client and stakeholder interviews","Identifying the core problem vs the presenting symptom","Reviewing existing user data, analytics, or feedback where available","Mapping constraints, budget, timeline, technical limitations, business goals","Defining what success looks like before any design begins"],"example":"<p>At Annosky, four apps were being built simultaneously with significant design work already underway before any real users had been involved. The actual problem was not a UI problem, it was a research gap. Advocating for usability testing at colleges across the Netherlands before finalising the apps meant real behaviour could inform the design rather than internal assumptions. Over 500 students later, several core design decisions changed as a direct result.</p>"},
      {"id":"research","title":"Research","tagline":"Evidence, not assumptions","description":"<p>Research is where good design decisions get made. Before any concepts or wireframes, I need to understand the users, the market, and the context. This means going beyond what clients think their users want and finding out what they actually do, need, and struggle with. </p>","activities":["User interviews and surveys","Competitor and market benchmarking","Reviewing existing analytics and user feedback","User role mapping and persona development","OOUX - mapping objects, attributes, and relationships before designing screens"],"example":"<p>On Open Studios Australia, research revealed five distinct user types each with completely different goals and mental models. Rather than designing one interface and adding permissions on top, mapping each role separately before touching a screen meant every design decision had a clear user need behind it.</p>"},
      {"id":"insights","title":"Insights","tagline":"Pattern from noise","description":"<p>Raw research on its own does not tell you what to design. This step is about stepping back from the data, finding the patterns that matter, and turning them into clear design directions. The goal is to identify what is really driving user behaviour, not just what is visible on the surface.</p>","activities":["Affinity mapping and theme clustering","Identifying core user needs vs surface requests","Prioritising insights by impact and frequency","Translating findings into clear design principles","Sharing insights with clients and stakeholders to align on direction"],"example":"<p>During the CT Filtration project, research showed that visitors were not converting because they did not understand what a whole house filtration system looked like once installed. The insight was not about pricing or navigation, it was about confidence. That single finding drove the decision to prioritise installation photography and video content above everything else on the page.</p>"},
      {"id":"strategy","title":"Strategy","tagline":"Set direction before you diverge","description":"<p>Strategy is the bridge between insight and design. Before opening Figma, I define the approach, what the product needs to do, how it should feel, what the information hierarchy is, and which problems to solve first. Getting this right means the design phase moves faster and with more confidence.</p>","activities":["Defining user flows and task hierarchies","Information architecture and content structure","Prioritising features and scope against business goals (MoSCoW-Method)","Establishing visual direction and design principles","Aligning with clients and stakeholders before design begins"],"example":"<p>At Annosky, four apps being built at once meant design decisions could easily become inconsistent across products. The strategy session established that each app needed its own visual identity while still feeling part of the same family. Defining the design principles and visual direction for each product before any screens were designed meant the team had a shared reference point throughout, and the apps felt intentional rather than assembled in pieces.</p>"},
      {"id":"design","title":"Design","tagline":"Iterate, don't polish on the first pass","description":"I work in low-fidelity first – rapid sketches, lo-fi wireframes, quick concepts. Once a direction is validated, I move to detailed interaction design, edge case coverage, and high-fidelity prototypes. I design in Figma with a component-first mindset.","activities":["Sketching","Wireframing","Interaction design","Prototyping","Component design","Edge cases"],"example":"The banking app onboarding took 6 lo-fi iterations in 2 weeks before moving to hi-fi. Each iteration was tested with 3–5 participants. We shipped the concept we'd have thrown away on round 1."},
      {"id":"testing","title":"Testing","tagline":"Validate early, validate often","description":"I run usability testing throughout the process, not just at the end. Unmoderated sessions for quick feedback, moderated sessions for deep exploration. I document findings into actionable design decisions and share results openly with the team.","activities":["Moderated usability testing","Unmoderated testing (Maze)","A/B testing","First-click analysis","Think-aloud protocols"],"example":"A two-week unmoderated test on the revised sign-up flow (n=48) surfaced 3 wording issues and 1 interaction pattern that confused 60% of participants. Fixed before any engineering time was spent."},
      {"id":"impact","title":"Impact","tagline":"Design without outcomes is decoration","description":"Shipping isn't the end. I define metrics before design starts and track them post-launch. I advocate for design reviews 4–8 weeks post-release to close the feedback loop and inform the next cycle.","activities":["Success metric definition","Post-launch review","Analytics monitoring","Retrospectives","Design debt tracking"],"example":"Following the patient portal launch, a 6-week review confirmed task completion improved from 61% to 89%. These results were fed back into the roadmap as evidence for continued UX investment."},
    ],
  },
  story: {
    heroStatement: "My journey through design, technology and problem solving.",
    subheadline: "I didn't start as a designer. That might be why I'm a good one.",
    timeline: [
      {"year":"2011","title":"Bachelor in Communication & Multimedia Design","body":"<p>Studied Communication and Multimedia Design at Avans Hogeschool Breda with a major in Creative Technology and a minor in Meaningful Data Design. This is where the interest in UX, interaction design, and building things that actually work for people started taking shape.</p>","tag":"Origin"},
      {"year":"2015","title":"UX/UI Designer at Annosky","body":"<p>Joined the UX/UI team at Annosky in the Netherlands, working across multiple in-house applications. Conducted user research and usability testing with over 500 students, produced storyboards, user flows, and wireframes, and created animations and motion graphics. First real exposure to the full design process at pace.</p>","tag":"FIRST DESIGN ROLE"},
      {"year":"2015","title":"Aquaponics Research & Development","body":"<p>Designed and built an interactive self-guided exhibition system focused on making complex aquaponics information accessible. The concept was driven by user research and sold to Stichting Duurzame Kost and City Farming in Eindhoven.</p>","tag":"RESEARCH PROJECT / BACHELOR THESIS"},
      {"year":"2016","title":"Rapid Prototyping Lecturer at Avans University","body":"<p>Delivered instructional content for a laser cutting course for first-year students at Avans University in Den Bosch. Mentored students in prototyping techniques and helped them iterate and test design concepts.</p>","tag":"TEACHING"},
      {"year":"2017","title":"Digital Content Creator & Freelancer","body":"<p>Five years working independently across web design, branding, content creation, and e-commerce. Designed and developed WordPress websites, created infographics and product mockups, managed Shopify stores, produced social media campaigns, and created video content for travel blogs. Clients included a yoga centre in the Netherlands and The Zythologist Brewing Company in Melbourne.</p>","tag":"GOING FREELANCE"},
      {"year":"2020","title":"Alfa Vital – Premium Lucerne Chaff","body":"<p>Led the design and development of a full agricultural processing installation in Biloela, Queensland. Handled corporate branding, product labels, industrial design of the processing plant, and hands-on construction including MIG welding. The installation processed lucerne 400% more efficiently than conventional barn flow with 40% more yield overall.</p>","tag":"HANDS ON"},
      {"year":"2023","title":"JABA Web Design Adelaide","body":"<p>Joined JABA Web Design as part of the design team, designing and delivering custom build websites on JABA's CMS platform. Managed projects from concept through delivery, coordinating closely with stakeholders, developers, and clients throughout. Also supported broader office operations and team culture, and began exploring AI-assisted development tools like Cursor and Replit alongside traditional design workflows.</p>","tag":"UX/UI Designer / Project Manager "},
    ],
    interests: [
      {"label":"","detail":"<p></p><p></p><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">Kitesurfing</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>There is nothing quite like suiting up when everyone else is heading indoors. Kitesurfing in a storm quiets the mind completely, just wind, water, and reading what comes next. It's physically demanding, technically challenging, and one of the most effective ways to reset.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">Freediving/ Spearfishing</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>Dropping below the surface, slowing the breath, watching the heart rate settle, and holding that calm while everything in you wants to surface. It is a practice in self-regulation and focus that is genuinely hard to replicate anywhere else. Pushing your limits underwater is as much a mental discipline as a physical one, and that challenge never gets old.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">Travelling</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>Having travelled across Europe, Asia, and beyond, the thing that never changes is the urge to get off the main road. The best experiences always come from a bike ride down an unmarked path or a hike that was not in any guidebook. Exploring a new place slowly, at ground level, is the only way to actually understand it.</p></div></details><details data-icon=\"chevron\" class=\"rte-collapsible\"><summary class=\"rte-collapsible-summary\"><span class=\"rte-collapsible-title\">Food &amp; Cooking</span><span class=\"rte-collapsible-icon\"></span></summary><div class=\"rte-collapsible-body\"><p>Good food is one of my favourite things. Days off mean cooking something proper from scratch, chasing down a new restaurant, or hosting a dinner party with good wine and good company.</p></div></details><p></p>"},
    ],
    closingQuote: "<p style=\"text-align: center;\"><span style=\"font-size: 14px; color: rgb(237, 232, 223);\"><strong><em>\"We cannot solve our problems with the same thinking we used </em><br><em>when we created them.\" </em><br><br><em>- Albert Einstein -</em></strong></span></p>",
    portraitImageUrl: "/imports/branding/jai.png",
  },
  enquiries: [],
  mediaMeta: {
  "/imports/projects/JABA/open-studio-australia/open-studios-australia-cover-images.jpg": {
    "alt": "Open Studios Australia dashboard on laptop and phone showing upcoming open studio events",
    "description": "Open Studios Australia's events dashboard, shown across desktop and mobile."
  },
  "/imports/projects/JABA/open-studio-australia/open-studios-australia-hero-images.jpg": {
    "alt": "Open Studios Australia platform interface displaying upcoming artist and studio events",
    "description": "The Open Studios Australia platform, designed to connect visitors with artists and studios nationwide."
  },
  "/imports/projects/JABA/open-studio-australia/open-studios-australia-hightlight-image-1-.jpg": {
    "alt": "Open Studios Australia \"All Artists\" directory page listing participating artists",
    "description": "Browsing the full artist directory on Open Studios Australia."
  },
  "/imports/projects/JABA/open-studio-australia/open-studios-australia-hightlight-image-2-.jpg": {
    "alt": "Open Studios Australia artist dashboard for uploading and managing artwork listings",
    "description": "Artists can upload and manage their artwork collections directly from the dashboard."
  },
  "/imports/projects/JABA/open-studio-australia/open-studios-australia-hightlight-image-3-.jpg": {
    "alt": "Geraldton Open Studios 2026 event promotional tile within the Open Studios Australia platform",
    "description": "Event promotion for GOSS Open Studios 2026, generated through the platform."
  },
  "/imports/projects/evolve-car-rental/evolve-car-rental-app-cover-image-2.jpg": {
    "alt": "Evolve Car Rental app prototype shown on smartphone with cascading UI screens",
    "description": "UI screens from the Evolve Car Rental app concept, designed as a UX course project."
  },
  "/imports/projects/evolve-car-rental/evolve-car-rental-app-hero-image.jpg": {
    "alt": "Evolve Car Rental welcome screen prototype with registration and guest login options",
    "description": "The Evolve Car Rental app's welcome screen, offering quick registration or guest access."
  },
  "/imports/projects/evolve-car-rental/evolve-car-rental-app-hightlight-image-1.jpg": {
    "alt": "Evolve Car Rental UI style guide showing colour palette and typography choices",
    "description": "The colour and typography system defined for the Evolve Car Rental brand."
  },
  "/imports/projects/evolve-car-rental/evolve-car-rental-app-highlight-image-2.jpg": {
    "alt": "Annotated UX walkthrough of the Evolve Car Rental pick-up location selection screen",
    "description": "Step-by-step UX annotations explaining the pick-up location flow."
  },
  "/imports/projects/evolve-car-rental/evolve-car-rental-app-highlight-image-3.jpg": {
    "alt": "Evolve Car Rental app screen flow showing vehicle selection and booking steps",
    "description": "The full booking flow, from vehicle selection through to payment confirmation."
  },
  "/imports/projects/JABA/shadow-creek-winery/shadow-creek-winery-cover-images.jpg": {
    "alt": "Shadow Creek Winery website homepage with vineyard sunset and wine glasses",
    "description": "Shadow Creek Winery's homepage, capturing the vineyard's golden-hour atmosphere."
  },
  "/imports/projects/JABA/shadow-creek-winery/shadow-creek-winery-hero.jpg": {
    "alt": "Shadow Creek Winery site hero banner featuring McLaren Vale vineyard at sunset",
    "description": "The immersive hero video banner welcoming visitors to Shadow Creek Winery."
  },
  "/imports/projects/JABA/shadow-creek-winery/shadow-creek-winery-hightlight-image-1-.jpg": {
    "alt": "Shadow Creek Winery cellar door page with close-up vineyard grapevine imagery",
    "description": "Introducing the new cellar door, opening among the property's old gums and vineyards."
  },
  "/imports/projects/JABA/shadow-creek-winery/shadow-creek-winery-hightlight-image-2-.jpg": {
    "alt": "Shadow Creek vineyard page showing sheep grazing among grenache and shiraz vines",
    "description": "Sustainable grazing practices across Shadow Creek's two vineyards."
  },
  "/imports/projects/JABA/shadow-creek-winery/shadow-creek-winery-hightlight-image-3-.jpg": {
    "alt": "Shadow Creek Winery blog page featuring a McLaren Vale coastline sunset photo",
    "description": "The winery's blog, sharing stories from the McLaren Vale region."
  },
  "/imports/projects/JABA/Pitchford-Farms/pichford-farms-cover-image.jpg": {
    "alt": "Pitchford Farms website homepage banner showing premium grass-fed beef cuts",
    "description": "Pitchford Farms' homepage, promoting 100% grass-fed South Australian beef."
  },
  "/imports/projects/JABA/Pitchford-Farms/pitchford-farms-homepage.jpg": {
    "alt": "Pitchford Farms homepage with raw beef cuts and \"buy direct from the farmer\" messaging",
    "description": "The rebuilt Pitchford Farms homepage inviting customers to buy beef direct from the farm."
  },
  "/imports/projects/JABA/Pitchford-Farms/pichford-farms-hightlight-image-1-.jpg": {
    "alt": "Pitchford Farms beef pack pricing page showing value, quarter and half pack options",
    "description": "Customers can choose from value, quarter, or half beef packs on the shop page."
  },
  "/imports/projects/JABA/Pitchford-Farms/pichford-farms-hightlight-image-2-.jpg": {
    "alt": "Pitchford Farms beef cuts guide page with a butcher's diagram of the animal",
    "description": "An educational beef cuts guide helping customers choose the right order."
  },
  "/imports/projects/JABA/Pitchford-Farms/pichford-farms-hightlight-image-3-.jpg": {
    "alt": "Pitchford Farms recipes page with beef recipe cards for customers",
    "description": "A recipes hub encouraging customers to cook with confidence."
  },
  "/imports/projects/JABA/ct-filtration/ct-filtration-cover-images.jpg": {
    "alt": "CT Filtration website homepage banner with a glass of filtered water",
    "description": "CT Filtration's homepage promoting whole-house water filtration for Adelaide homes."
  },
  "/imports/projects/JABA/ct-filtration/ct-filtration-hero-image.jpg": {
    "alt": "CT Filtration homepage hero image advertising undersink reverse osmosis systems",
    "description": "The redesigned CT Filtration homepage, built around clear product benefits."
  },
  "/imports/projects/JABA/ct-filtration/ct-filtration-hightlight-image-2-.jpg": {
    "alt": "CT Filtration reviews page displaying five-star Google customer ratings",
    "description": "Google Reviews integrated directly onto the site for social proof."
  },
  "/imports/projects/JABA/ct-filtration/ct-filtration-hightlight-image-3-.jpg": {
    "alt": "CT Filtration product page showcasing whole-house filtration and reverse osmosis bundle",
    "description": "A bundled whole-house filtration and reverse osmosis offer, styled for conversions."
  },
  "/imports/projects/JABA/ct-filtration/ct-filtration-hightlight-image.jpg": {
    "alt": "CT Filtration \"Meet Our Team\" page introducing Adelaide's water filtration specialists",
    "description": "A team page introducing the people behind CT Filtration's installations."
  },
  "/imports/projects/JABA/underground-installations/ugi-cover-images.jpg": {
    "alt": "Underground Installations website homepage banner showing an excavation site",
    "description": "Underground Installations' homepage, rebuilt with a bold industrial design direction."
  },
  "/imports/projects/JABA/underground-installations/ugi-hero-images.jpg": {
    "alt": "Underground Installations hero banner featuring heavy machinery at a trenching site",
    "description": "The rebuilt UGI website hero, reflecting the company's civil contracting work."
  },
  "/imports/projects/JABA/underground-installations/ugi-hightlight-image-1-.jpg": {
    "alt": "Underground Installations plant hire page listing rock saws and trenching equipment",
    "description": "A dedicated plant hire page listing UGI's fleet of trenching and boring equipment."
  },
  "/imports/projects/JABA/underground-installations/ugi-hightlight-image-2-.jpg": {
    "alt": "Underground Installations recent projects page listing completed trenching jobs",
    "description": "Recent project case studies, including the Woomera 45km fibre installation."
  },
  "/imports/projects/JABA/underground-installations/ugi-hightlight-image-4-.jpg": {
    "alt": "Underground Installations services page listing directional drilling and trenching contractors",
    "description": "An overview of UGI's core services, from directional drilling to vacuum excavation."
  },
  "/imports/projects/zythologist/zythologist-cover-images.jpg": {
    "alt": "The Zythologist branded t-shirt worn, showing back print of brewing process icons",
    "description": "Event merchandise designed for The Zythologist, a Melbourne craft brewery."
  },
  "/imports/projects/zythologist/hanging_t-shirt_mens2.png": {
    "alt": "The Zythologist t-shirt on a hanger showing the front logo design",
    "description": "The Zythologist t-shirt, flat-laid to show the front logo."
  },
  "/imports/projects/zythologist/zythologist-hero.jpg": {
    "alt": "The Zythologist brewing process t-shirt design worn from behind",
    "description": "The finished t-shirt design, printed with a step-by-step brewing icon column."
  },
  "/imports/projects/zythologist/zythologist-hightlight-image-1-.jpg": {
    "alt": "The Zythologist team at a craft beer event booth serving customers",
    "description": "The Zythologist team at a brewery event, wearing the branded merchandise."
  },
  "/imports/projects/zythologist/zythologist-hightlight-image-2-.jpg": {
    "alt": "The Zythologist brewing process infographic poster showing milling to bottling steps",
    "description": "The full brewing process infographic, designed for print and digital use."
  },
  "/imports/projects/zythologist/zythologist-hightlight-image-3-.jpg": {
    "alt": "The Zythologist Instagram carousel graphic reformatted from the brewing infographic",
    "description": "The brewing infographic reformatted into a 9-panel Instagram carousel."
  },
  "/imports/projects/JABA/alliance-metal/Alliance-Metal-Cover-Image4.jpg": {
    "alt": "Alliance Metal Solutions homepage banner showing a technical fabrication drawing",
    "description": "Alliance Metal's homepage, built around end-to-end sheet metal fabrication services."
  },
  "/imports/projects/JABA/alliance-metal/Alliance-Metal-Hero-Image.jpg": {
    "alt": "Alliance Metal Solutions website hero banner reading \"Metal Manufacturing Specialists\"",
    "description": "The revamped Alliance Metal Solutions homepage hero section."
  },
  "/imports/projects/JABA/alliance-metal/Alliance-Metal-Hightlight-1.jpg": {
    "alt": "Alliance Metal Solutions services page detailing sheet metal engineering capabilities",
    "description": "A full breakdown of Alliance Metal's fabrication and engineering services."
  },
  "/imports/projects/JABA/alliance-metal/Alliance-Metal-Hightlight-2.jpg": {
    "alt": "Alliance Metal Solutions industries served page listing construction, mining and energy sectors",
    "description": "Industries served by Alliance Metal, from construction to telecommunications."
  },
  "/imports/projects/JABA/alliance-metal/Alliance-Metal-Hightlight-3.jpg": {
    "alt": "Alliance Metal Solutions photo grid showing laser cutting and metal bending in progress",
    "description": "Behind-the-scenes photos of Alliance Metal's design, cutting, and fabrication process."
  },
  "/imports/projects/avans-energy-project/avans-energy-project-cover-images.jpg": {
    "alt": "Laser-cut wooden gear installation visualising AVANS University's energy usage data",
    "description": "The finished gear installation, mapping AVANS University's 13 campus locations."
  },
  "/imports/projects/avans-energy-project/avans-energy-project-hero-images.jpg": {
    "alt": "Laser-cut wooden gear installation visualising AVANS University's energy usage data",
    "description": "The finished gear installation, mapping AVANS University's 13 campus locations."
  },
  "/imports/projects/avans-energy-project/avans-energy-project-hightlight-image-1-.jpg": {
    "alt": "Close-up of a laser-cut gear labelled with an AVANS University campus address",
    "description": "Each gear is labelled with its corresponding AVANS University building."
  },
  "/imports/projects/avans-energy-project/avans-energy-project-hightlight-image-2-.jpg": {
    "alt": "Arduino breadboard wiring powering the stepper motors in the gear installation",
    "description": "The Arduino-driven electronics behind the interactive gear installation."
  },
  "/imports/projects/avans-energy-project/avans-energy-project-hightlight-image-3-.jpg": {
    "alt": "\"Gear Generator\" software interface used to design the laser-cut gear layout",
    "description": "Custom software built to generate and size each gear from real energy data."
  },
  "/imports/projects/aquaponics-system/img_3088.jpg": {
    "alt": "Aquaponics system exhibition display with wooden booth and instructional signage",
    "description": "The finished aquaponics exhibition, ready for visitor walkthroughs."
  },
  "/imports/projects/aquaponics-system/img_3091-1.jpg": {
    "alt": "Aquaponics exhibition booth interior showing the 8-step visitor walkthrough",
    "description": "An 8-step self-guided tour explaining how the aquaponics system works."
  },
  "/imports/projects/aquaponics-system/aquaponics-systeem1.png": {
    "alt": "Diagram of the working aquaponics system showing the fish tank and grow bed cycle",
    "description": "How the aquaponics system's fish and plant cycle works."
  },
  "/imports/projects/aquaponics-system/design1.png": {
    "alt": "Design concept sketch for the aquaponics exhibition booth layout",
    "description": "Early design concept for the exhibition booth structure."
  },
  "/imports/projects/aquaponics-system/design1-copy.png": {
    "alt": "Alternative design concept sketch for the aquaponics exhibition layout",
    "description": "A refined version of the booth design concept."
  },
  "/imports/projects/windmills/received_10212229511706591.png": {
    "alt": "Vector illustration of historic Dutch windmills and lighthouses from West-Zeeuws Vlaanderen",
    "description": "Hand-drawn vector illustrations of two historic windmills, later printed as t-shirts."
  },
  "/imports/projects/annosky/annosky-cover-images.jpg": {
    "alt": "Annosky internship cover image showing Annobase, Annotax and Yolabo app icons",
    "description": "An overview of the apps built during the Annosky internship."
  },
  "/imports/projects/annosky/annosky-hero-images.jpg": {
    "alt": "Annosky \"We Are Free\" branding banner with Annobase, Annotax and At app icons",
    "description": "The Annosky brand banner introducing its suite of apps."
  },
  "/imports/projects/annosky/annosky-hightlight-image-1-.jpg": {
    "alt": "Annosky team crew photo grid featuring staff portraits with labelled roles",
    "description": "The Annosky crew, photographed for the Annobase \"Crew\" page."
  },
  "/imports/projects/annosky/annosky-hightlight-image-3-.jpg": {
    "alt": "Annobase social cloud app screens shown on smartphone mockups",
    "description": "UI screens from Annobase, Annosky's privacy-first social cloud platform."
  },
  "/imports/projects/annosky/annosky-hightlight-image-4-.jpg": {
    "alt": "Helios Mylos children's education app illustrated screen tiles",
    "description": "Illustrated screens from Helios Mylos, an education app for children."
  },
  "/imports/projects/Goffee-coffee-Mandalay/goffee-coffee-cover-images.jpg": {
    "alt": "Goffee Coffee Mandalay infographic poster explaining ice drip brewing and coffee roasts",
    "description": "A coffee infographic designed for Goffee Coffee, Mandalay's specialty coffee shop."
  },
  "/imports/projects/Goffee-coffee-Mandalay/goffee-coffee-hero.jpg": {
    "alt": "Goffee Coffee Mandalay infographic poster explaining ice drip brewing and coffee roasts",
    "description": "A coffee infographic designed for Goffee Coffee, Mandalay's specialty coffee shop."
  },
  "/imports/projects/Goffee-coffee-Mandalay/goffee-coffee-hightlight-image-1-.jpg": {
    "alt": "Goffee Coffee shop owner serving a customer inside the Mandalay café",
    "description": "The Goffee Coffee owner, whose passion for coffee inspired the design brief."
  },
  "/imports/projects/Goffee-coffee-Mandalay/goffee-coffee-hightlight-image-2-.jpg": {
    "alt": "Framed Goffee Coffee infographic poster displayed inside the café",
    "description": "The finished poster, framed and displayed in the Goffee Coffee shop."
  },
  "/imports/projects/Goffee-coffee-Mandalay/goffee-coffee-hightlight-image-3-.jpg": {
    "alt": "Reviewing the Goffee Coffee poster design on a laptop with the shop owner",
    "description": "Collaborating with the shop owner during the design review process."
  },
  "/imports/projects/JABA/North-Star/north-star-cover-images-1-.jpg": {
    "alt": "North Star Rewards membership card held in a blue work shirt pocket",
    "description": "The North Star Rewards card, designed to fit naturally into a wallet or pocket."
  },
  "/imports/projects/JABA/North-Star/north-star-cover-images.jpg": {
    "alt": "North Star Rewards logo displayed on a black membership card mockup",
    "description": "The North Star Rewards logo and card design, shown on hover."
  },
  "/imports/projects/JABA/North-Star/north-star-hero-images.png": {
    "alt": "Hand pulling the North Star Rewards membership card from a work shirt pocket",
    "description": "The North Star Rewards card, designed to feel premium and worth keeping."
  },
  "/imports/projects/JABA/North-Star/north-star-hightlight-image-1-.jpg": {
    "alt": "Front and back mockup of the North Star Rewards membership card design",
    "description": "The finished North Star Rewards card, front and back."
  },
  "/imports/projects/JABA/North-Star/north-star-hightlight-image-2-.jpg": {
    "alt": "Close-up photo of the North Star Rewards card being pulled from a pocket",
    "description": "The card's premium finish, designed to feel worth keeping."
  },
  "/imports/projects/JABA/North-Star/north-star-hightlight-image-3-.jpg": {
    "alt": "Multiple North Star Rewards membership cards fanned out on a white background",
    "description": "The full run of North Star Rewards cards, ready for distribution across venues."
  },
  "/imports/projects/alpha-vital/screenshot-2021-06-22-at-16.01.34.png": {
    "alt": "Alfa Vital premium lucerne chaff packaging design with product analysis and storage details",
    "description": "The Alfa Vital product bag design, covering brand identity through to packaging copy."
  },
  "/imports/projects/alpha-vital/143888822_253272232829085_7948177119267517642_n-1.jpeg": {
    "alt": "Alfa Vital worker holding a compressed lucerne chaff bale on the farm",
    "description": "A finished lucerne chaff bale, produced on the Alfa Vital processing line."
  },
  "/imports/projects/alpha-vital/20200715_071214.jpeg": {
    "alt": "Conveyor belt machinery installed under a shed roof at the Alfa Vital processing site",
    "description": "One of three custom conveyor belts built for the Alfa Vital installation."
  },
  "/imports/projects/alpha-vital/20201102_113900.jpeg": {
    "alt": "Hydraulic press equipment installed inside a converted bulk bin truck for Alfa Vital",
    "description": "The hydraulic press system, built into a converted bulk bin truck."
  }
},
  designSystem: DEFAULT_DESIGN_SYSTEM,
  branding: {"faviconUrl":"/imports/branding/favicon.ico","logoUrl":"/imports/branding/favicon-96x96.png"},
  socials: {"linkedin":"https://www.linkedin.com/in/jai-boekhout-31a9b3a5/","instagram":"https://www.instagram.com/jai_boekhout_design/"},
  notFound: {"heading":"Oops, Wrong Page","body":"<p>Looks like you landed off track!<br>The page you're looking for doesn't exist or may have moved.</p>","buttonLabel":"Keep exploring, Back to home"},
  companies: [
    { id: "company-1785500629780", name: "JABA Web Design", logoUrl: "/imports/client-logos/jaba-logo-new.png" },
    { id: "company-1786775501702", name: "Annosky", logoUrl: "/imports/projects/annosky/whatsapp-image-2021-06-15-at-5.50.19-pm.jpeg" },
  ],
};

// ─── Selectors ────────────────────────────────────────────────────────────────

function caseStudyToProject(cs: CMSCaseStudy): CMSProject {
  return {
    id: `cs-${cs.id}`,
    // The synthetic `cs-<id>` id above stays as the stable internal identifier (featured-order
    // persistence parses that exact prefix) — the custom slug rides along separately and is
    // what projectUrlSlug() actually uses for this entry's /work/<slug> URL.
    slug: cs.slug,
    num: String(cs.id).padStart(2, "0"),
    name: cs.title,
    client: cs.client,
    clientMode: cs.clientMode,
    companyId: cs.companyId,
    tags: cs.tags || [],
    desc: cs.summary || "",
    outcomes: cs.outcomes || [],
    imgs: ["", cs.img1Url || "", cs.img2Url || "", cs.img3Url || ""],
    coverImageUrl: cs.coverImageUrl,
    coverImagePosition: cs.coverImagePosition,
    coverImageScale: cs.coverImageScale,
    coverImageHoverUrl: cs.coverImageHoverUrl,
    coverImageHoverPosition: cs.coverImageHoverPosition,
    coverImageHoverScale: cs.coverImageHoverScale,
    heroImageUrl: cs.heroImageUrl,
    heroImagePosition: cs.heroImagePosition,
    heroImageScale: cs.heroImageScale,
    hideScrollIndicator: cs.hideScrollIndicator,
    img1Position: cs.img1Position,
    img1Scale: cs.img1Scale,
    img2Position: cs.img2Position,
    img2Scale: cs.img2Scale,
    img3Position: cs.img3Position,
    img3Scale: cs.img3Scale,
    fullContent: cs.fullContent,
    fullCaseStudy: cs.fullCaseStudy,
    fullCaseStudyBannerUrl: cs.fullCaseStudyBannerUrl,
    fullCaseStudyContent: cs.fullCaseStudyContent,
    status: cs.status,
    createdAt: cs.createdAt,
    updatedAt: cs.updatedAt,
    viewMoreHeading: cs.viewMoreHeading,
    viewMorePinnedIds: cs.viewMorePinnedIds,
    viewMoreCategory: cs.viewMoreCategory,
    viewMoreSort: cs.viewMoreSort,
    live: cs.liveUrl || null,
    caseStudy: null,
  };
}

// ─── View More Projects resolution ────────────────────────────────────────────
// Shared by the admin CMS preview (WorkSection.tsx) and the public popup
// (FeaturedProjects.tsx), so the preview can never drift from what actually renders.

export interface ViewMoreCandidate {
  id: string;
  name: string;
  client: string;
  tags: string[];
  createdAt?: string;
  updatedAt?: string;
}

export type ViewMoreResult<T extends ViewMoreCandidate = ViewMoreCandidate> = T & {
  source: "pinned" | "auto";
};

function viewMoreTime(item: { createdAt?: string; updatedAt?: string }): number {
  // Deliberately different from the admin list sort (createdAt only, to avoid jitter while
  // typing) — here an intentional re-edit should be able to push a project forward, so
  // whichever of createdAt/updatedAt is more recent wins.
  const created = item.createdAt ? new Date(item.createdAt).getTime() : 0;
  const updated = item.updatedAt ? new Date(item.updatedAt).getTime() : 0;
  return Math.max(created, updated);
}

function sortByDirection<T extends ViewMoreCandidate>(items: T[], dir: ViewMoreSort | undefined): T[] {
  return [...items].sort((a, b) =>
    dir === "oldest" ? viewMoreTime(a) - viewMoreTime(b) : viewMoreTime(b) - viewMoreTime(a)
  );
}

/**
 * Resolves the 3 "View More Projects" cards for one project/case study.
 * - Up to 3 ids in `config.pinnedIds` are used first, in order.
 * - Remaining slots auto-fill from `pool`, optionally scoped to `config.category`
 *   (a tag), sorted by `config.sort` (default "newest").
 * - If the category filter can't fill every remaining slot, the leftover slot(s)
 *   fall back to the most recent eligible project regardless of category, so the
 *   section still shows 3 cards whenever 3 are available site-wide.
 */
export function resolveViewMore<T extends ViewMoreCandidate>(
  pool: T[],
  config: { pinnedIds?: string[]; category?: string; sort?: ViewMoreSort },
  excludeId?: string
): ViewMoreResult<T>[] {
  const available = pool.filter((p) => p.id !== excludeId);

  const pinned: ViewMoreResult<T>[] = (config.pinnedIds || [])
    .map((id) => available.find((p) => p.id === id))
    .filter((p): p is T => !!p)
    .slice(0, 3)
    .map((p) => ({ ...p, source: "pinned" as const }));

  const usedIds = new Set(pinned.map((p) => p.id));
  const remaining = 3 - pinned.length;
  if (remaining <= 0) return pinned;

  let rest = available.filter((p) => !usedIds.has(p.id));
  const result: ViewMoreResult<T>[] = [...pinned];

  if (config.category) {
    const matches = sortByDirection(rest.filter((p) => p.tags.includes(config.category!)), config.sort);
    const picked = matches.slice(0, remaining);
    picked.forEach((p) => usedIds.add(p.id));
    result.push(...picked.map((p) => ({ ...p, source: "auto" as const })));
  } else {
    const sorted = sortByDirection(rest, config.sort);
    const picked = sorted.slice(0, remaining);
    return [...pinned, ...picked.map((p) => ({ ...p, source: "auto" as const }))];
  }

  const stillNeeded = 3 - result.length;
  if (stillNeeded > 0) {
    rest = rest.filter((p) => !usedIds.has(p.id));
    const newest = sortByDirection(rest, "newest").slice(0, stillNeeded);
    result.push(...newest.map((p) => ({ ...p, source: "auto" as const })));
  }

  return result;
}

// Resolves the Work-page stats bar's configured slots into real CMSStat objects from
// evaluate.stats (the "At a Glance" list) — slots referencing a deleted/missing stat id are
// dropped rather than erroring or showing stale text, per the selector-not-content design.
export function resolveWorkStats(content: CMSContent): CMSStat[] {
  const cfg = content.work.homeStats;
  if (!cfg?.enabled) return [];
  const byId = new Map(content.evaluate.stats.map((s) => [s.id, s]));
  return cfg.slotIds
    .slice(0, cfg.count)
    .map((id) => (id ? byId.get(id) : undefined))
    .filter((s): s is CMSStat => !!s);
}

// The single, canonical way to find a project's matching case study (or vice versa) — every
// other place in the codebase that used to have its own copy of this heuristic (contentStore's
// getMoreProjects, WorkSection's isDualRepresentation, ExperienceWork's
// enrichWithCaseStudyContent, FeaturedProjects' findLinkedCaseStudy) now calls this instead.
// Those five copies had quietly drifted apart — one had an extra client-name fallback, another
// only split on en-dash instead of en-dash-or-hyphen — so the same rename could break the
// pairing in some parts of the site while it kept working in others.
//
// Prefers project.linkedCaseStudyId (a stable, rename-proof id set explicitly by the admin, or
// once matched here) over the fuzzy title heuristic, which remains only as a fallback for
// content saved before that field existed. It does NOT write the id back — selectors here stay
// pure/side-effect-free; the admin's "Linked Case Study" picker (WorkSection.tsx) is what
// actually persists it, pre-filled with whatever this function would have matched.
export function resolveLinkedCaseStudy(project: CMSProject, caseStudies: CMSCaseStudy[]): CMSCaseStudy | undefined {
  if (project.linkedCaseStudyId !== undefined) {
    return caseStudies.find((cs) => cs.id === project.linkedCaseStudyId);
  }
  const pName = project.name.toLowerCase();
  return caseStudies.find((cs) => {
    const csTitle = cs.title.toLowerCase();
    return csTitle.includes(pName) || pName.includes(csTitle.split(/\s*[–\-]\s*/)[0].trim());
  });
}

// A linked case study left in "Updated"/draft status should behave as if the project has no
// case study at all on the public site — gates whether "View Full Case Study" shows at all
// (FeaturedProjects.tsx) and, once case studies get their own /work/[slug]/case-study route,
// whether that route resolves or 404s.
export function isCaseStudyLive(cs: CMSCaseStudy | undefined): boolean {
  return !cs || cs.status === "published" || !cs.status;
}

// Promoted verbatim from ExperienceWork.tsx's local enrichWithCaseStudyContent — the one
// field-by-field merge every project detail view needs (popup, full case-study page, and now
// the server-rendered /work/[slug] route), so a project's linked case study is resolved
// identically everywhere rather than three slightly-different copies of this merge drifting
// apart. Matching goes through resolveLinkedCaseStudy, same as getAllLinkableProjects.
export function enrichProjectWithCaseStudy(project: CMSProject, caseStudies: CMSCaseStudy[]): CMSProject {
  const cs = resolveLinkedCaseStudy(project, caseStudies);
  if (!cs) return project;
  // Merge case study highlight images into the project imgs array slots [1],[2],[3]
  const imgs = [...project.imgs];
  if (cs.img1Url) imgs[1] = cs.img1Url;
  if (cs.img2Url) imgs[2] = cs.img2Url;
  if (cs.img3Url) imgs[3] = cs.img3Url;
  return {
    ...project,
    name: cs.title || project.name,
    client: cs.client || project.client,
    companyId: project.companyId || cs.companyId,
    clientMode: project.clientMode || cs.clientMode,
    desc: cs.summary || project.desc,
    tags: cs.tags?.length ? cs.tags : project.tags,
    outcomes: cs.outcomes?.length ? cs.outcomes : project.outcomes,
    // Case study wins over the project's own value everywhere here, matching name/client/desc
    // above — once a project is linked, WorkSection's admin "Projects" list only exposes the
    // case study's card for editing (see getAllLinkableProjects above), so the project's own
    // image fields are stale leftovers, not an intentional override.
    coverImageUrl: cs.coverImageUrl || project.coverImageUrl || undefined,
    coverImagePosition: cs.coverImagePosition || project.coverImagePosition || undefined,
    coverImageScale: cs.coverImageScale ?? project.coverImageScale,
    coverImageHoverUrl: cs.coverImageHoverUrl || project.coverImageHoverUrl || undefined,
    coverImageHoverPosition: cs.coverImageHoverPosition || project.coverImageHoverPosition || undefined,
    coverImageHoverScale: cs.coverImageHoverScale ?? project.coverImageHoverScale,
    heroImageUrl: cs.heroImageUrl || project.heroImageUrl || undefined,
    heroImagePosition: cs.heroImagePosition || project.heroImagePosition || undefined,
    heroImageScale: cs.heroImageScale ?? project.heroImageScale,
    hideScrollIndicator: cs.hideScrollIndicator ?? project.hideScrollIndicator,
    img1Position: cs.img1Position || project.img1Position || undefined,
    img1Scale: cs.img1Scale ?? project.img1Scale,
    img2Position: cs.img2Position || project.img2Position || undefined,
    img2Scale: cs.img2Scale ?? project.img2Scale,
    img3Position: cs.img3Position || project.img3Position || undefined,
    img3Scale: cs.img3Scale ?? project.img3Scale,
    imgs,
    fullContent: project.fullContent || cs.fullContent || undefined,
    fullCaseStudy: project.fullCaseStudy || cs.fullCaseStudy || undefined,
    fullCaseStudyLocked: project.fullCaseStudyLocked ?? cs.fullCaseStudyLocked ?? undefined,
    fullCaseStudyPassword: project.fullCaseStudyPassword || cs.fullCaseStudyPassword || undefined,
    fullCaseStudyBannerUrl: project.fullCaseStudyBannerUrl || cs.fullCaseStudyBannerUrl || undefined,
    fullCaseStudyContent: project.fullCaseStudyContent || cs.fullCaseStudyContent || undefined,
    live: project.live || cs.liveUrl || null,
    createdAt: project.createdAt || cs.createdAt || undefined,
    updatedAt: project.updatedAt || cs.updatedAt || undefined,
    viewMoreHeading: project.viewMoreHeading || cs.viewMoreHeading || undefined,
    viewMorePinnedIds: (project.viewMorePinnedIds?.length ? project.viewMorePinnedIds : cs.viewMorePinnedIds) || undefined,
    viewMoreCategory: project.viewMoreCategory || cs.viewMoreCategory || undefined,
    viewMoreSort: project.viewMoreSort || cs.viewMoreSort || undefined,
    // Case study wins here too — the admin's "Publish"/"Unpublish"/"Save" controls for a dual
    // entry act on the case study record (see the comment above), so without this the project's
    // own status (almost always left at its implicit "published" default, since it was never
    // exposed for editing once linked) kept winning via the `...project` spread regardless of
    // what the case study's status actually said. That's exactly what let an "Unpublished"
    // case study still show up live: getMoreProjects/getFeaturedProjects check this merged
    // status, but the merge was silently dropping it.
    status: cs.status ?? project.status,
  };
}

// The one "does this project actually have a live case study to show" gate — used by the
// project popup/page's "View Full Case Study" button, the /work/[slug]/case-study route's own
// notFound() check, and sitemap.ts (so a case study that isn't live never gets listed there
// either). `project` should already be enriched (its own fullCaseStudy/fullCaseStudyContent
// already carry the linked case study's values via enrichProjectWithCaseStudy).
export function projectHasLiveCaseStudy(project: CMSProject, caseStudies: CMSCaseStudy[]): boolean {
  const linkedCS = resolveLinkedCaseStudy(project, caseStudies);
  return isCaseStudyLive(linkedCS) && !!(project.fullCaseStudy || project.fullCaseStudyContent);
}

// Every project/case study a company can be linked to — real CMSProject entries plus case
// studies with no matching project of their own (converted the same way getMoreProjects()
// does), deduped. A company/agency tag can live on either content type, so anything that only
// checked content.work.projects would silently miss every case-study-only credit.
export function getAllLinkableProjects(content: CMSContent): CMSProject[] {
  const { projects, caseStudies } = content.work;
  const result: CMSProject[] = [];
  const usedCaseStudyIds = new Set<number>();

  for (const p of projects) {
    const cs = resolveLinkedCaseStudy(p, caseStudies);
    if (cs) {
      usedCaseStudyIds.add(cs.id);
      // A company tag set on either side counts — getFeaturedProjects/getMoreProjects each
      // return only ONE of the pair (whichever featuredProjectOrder references) without this
      // merge, so a project tagged only via its case study (or vice versa) would silently
      // vanish from any companyId-filtered list.
      //
      // Images get the same treatment, for a more subtle reason: once a CMSProject is linked to
      // a case study, WorkSection's admin "Projects" list stops rendering that project's own
      // card at all — it shows the case study's card in its place (see standaloneProjects /
      // projectsListEntries in WorkSection.tsx), which edits the case study's own image fields.
      // The project's own coverImageUrl etc. become permanently inaccessible from the normal
      // admin UI, so falling back to them here would silently ignore whatever the admin actually
      // set. Preferring the case study's images (falling back to the project's only if the case
      // study itself never set one) keeps this in sync with what's actually editable.
      const imgs = p.imgs?.length ? p.imgs : [cs.img1Url, cs.img2Url, cs.img3Url].filter((u): u is string => !!u);
      result.push({
        ...p,
        companyId: p.companyId ?? cs.companyId,
        clientMode: p.clientMode ?? cs.clientMode,
        // Same fix as enrichProjectWithCaseStudy: the project itself usually has no status of its
        // own (only its linked case study does), so without this every consumer of this pool
        // (e.g. resolveExperienceProjects' status filter) sees `undefined` and treats an
        // unpublished case study's project as published.
        status: cs.status ?? p.status,
        coverImageUrl: cs.coverImageUrl ?? p.coverImageUrl,
        coverImagePosition: cs.coverImagePosition ?? p.coverImagePosition,
        coverImageScale: cs.coverImageScale ?? p.coverImageScale,
        coverImageHoverUrl: cs.coverImageHoverUrl ?? p.coverImageHoverUrl,
        coverImageHoverPosition: cs.coverImageHoverPosition ?? p.coverImageHoverPosition,
        coverImageHoverScale: cs.coverImageHoverScale ?? p.coverImageHoverScale,
        heroImageUrl: cs.heroImageUrl ?? p.heroImageUrl,
        heroImagePosition: cs.heroImagePosition ?? p.heroImagePosition,
        heroImageScale: cs.heroImageScale ?? p.heroImageScale,
        hideScrollIndicator: cs.hideScrollIndicator ?? p.hideScrollIndicator,
        imgs,
        img1Position: cs.img1Position ?? p.img1Position,
        img1Scale: cs.img1Scale ?? p.img1Scale,
        img2Position: cs.img2Position ?? p.img2Position,
        img2Scale: cs.img2Scale ?? p.img2Scale,
        img3Position: cs.img3Position ?? p.img3Position,
        img3Scale: cs.img3Scale ?? p.img3Scale,
      });
    } else {
      result.push(p);
    }
  }
  for (const cs of caseStudies) {
    if (!usedCaseStudyIds.has(cs.id)) result.push(caseStudyToProject(cs));
  }

  return result;
}

// Resolves an experience entry's "Projects" list.
//
// With a company linked: every project/case study whose own companyId matches, ordered/hidden
// per projectOrder, with any match not yet in projectOrder appended at the end (visible by
// default) — the "explicit order layered on an auto-matched set" pattern also used by
// featuredProjectOrder.
//
// With no company linked (a direct job, not client work through an employer): there's no pool
// to auto-match against, so projectOrder itself is the manually curated list — every entry
// must be explicit, and hidden ones are skipped rather than defaulted to visible.
export function resolveExperienceProjects(content: CMSContent, experience: CMSExperience): CMSProject[] {
  const pool = getAllLinkableProjects(content);
  const order = experience.projectOrder ?? [];

  if (!experience.companyId) {
    const byId = new Map(pool.map((p) => [p.id, p]));
    return order
      .filter((ref) => !ref.hidden)
      .map((ref) => byId.get(ref.id))
      .filter((p): p is CMSProject => !!p);
  }

  const matches = pool.filter((p) => p.companyId === experience.companyId);
  const byId = new Map(matches.map((p) => [p.id, p]));

  const ordered: CMSProject[] = [];
  const seen = new Set<string>();
  for (const ref of order) {
    const p = byId.get(ref.id);
    if (p && !ref.hidden) {
      ordered.push(p);
      seen.add(ref.id);
    } else if (p) {
      seen.add(ref.id);
    }
  }
  for (const p of matches) {
    if (!seen.has(p.id)) ordered.push(p);
  }
  return ordered;
}

export function getFeaturedProjects(content: CMSContent): CMSProject[] {
  const { projects, caseStudies, featuredProjectOrder } = content.work;
  if (featuredProjectOrder.length > 0) {
    return featuredProjectOrder
      .map((id) => {
        if (id.startsWith("cs-")) {
          const csId = parseInt(id.slice(3), 10);
          const cs = caseStudies.find((c) => c.id === csId);
          return cs ? caseStudyToProject(cs) : null;
        }
        return projects.find((p) => p.id === id) || null;
      })
      .filter(Boolean) as CMSProject[];
  }
  return projects.slice(0, 9);
}

export function getMoreProjects(content: CMSContent): CMSProject[] {
  const { projects, caseStudies } = content.work;
  const featuredIds = new Set(getFeaturedProjects(content).map((p) => p.id));

  // Case studies that don't already have a corresponding CMSProject entry —
  // otherwise they'd show up twice (once as the project, once as the case study).
  const csOnly = caseStudies.filter(
    (cs) => !projects.some((p) => resolveLinkedCaseStudy(p, caseStudies)?.id === cs.id)
  );

  return [
    ...projects.filter((p) => !featuredIds.has(p.id)),
    ...csOnly.map(caseStudyToProject).filter((p) => !featuredIds.has(p.id)),
  ];
}

// The URL path a project actually resolves at — an admin-set custom slug (Work tab → project's
// "URL Path" field) if there is one, otherwise the project's own internal id (which is already
// a readable slug for hand-authored projects, e.g. "evolve"). Every /work/<...> href in the app
// goes through this rather than reading .id directly, so a custom slug takes effect everywhere
// at once.
export function projectUrlSlug(p: CMSProject): string {
  return (p.slug && p.slug.trim()) || p.id;
}

// The one list of "projects a real visitor can see" — every featured/more project, fully
// enriched with its linked case study (if any) before status is checked. Enriching first
// matters: a dual project/case-study's status lives on whichever record
// enrichProjectWithCaseStudy actually resolves it from (the case study, when linked), so
// filtering the raw, un-enriched pool here let an "Unpublished" case study's project keep
// appearing in generateStaticParams/the sitemap/getPublishedProjectBySlug even though the admin
// had unpublished it. Used by every route needing "all live projects", so this can't drift
// out of sync the way 4 separate copies of "filter by .status" already had.
export function getPublishedProjects(content: CMSContent): CMSProject[] {
  const pool = [...getFeaturedProjects(content), ...getMoreProjects(content)];
  return pool
    .map((p) => enrichProjectWithCaseStudy(p, content.work.caseStudies))
    .filter((p) => !p.status || p.status === "published");
}

// The one lookup every /work/[slug] route (page, intercepted modal, generateStaticParams,
// generateMetadata) uses to go from a URL slug to a render-ready project — combines the
// featured + more pools (so a slug matches regardless of which section a project lives in,
// including case-study-only entries under their synthetic "cs-<id>" id), applies the same
// case-study enrichment the popup already uses, and refuses to resolve anything not published
// so a draft never gets its own indexable/crawlable URL.
export function getPublishedProjectBySlug(content: CMSContent, slug: string): CMSProject | undefined {
  return getPublishedProjects(content).find((p) => projectUrlSlug(p) === slug);
}

// ─── Store ────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "portfolio_cms_content";

// Exported for testing (see store/contentStore.test.ts) — not meant to be used outside this
// module otherwise, it exists specifically to back getContent()/updateContent()/persistContent().
export function deepMerge<T extends object>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key in source) {
    const src = source[key];
    const tgt = target[key];
    if (src && typeof src === "object" && !Array.isArray(src) && tgt && typeof tgt === "object") {
      (result as Record<string, unknown>)[key] = deepMerge(tgt as object, src as object);
    } else {
      // Assign even when src is undefined — an explicit `{ field: undefined }` in a patch
      // (e.g. a CMS "Reset"/"Remove" action) means "clear this field," and must win over the
      // existing value. This never fires for getContent()'s DEFAULT_CONTENT/parsed-JSON merge,
      // since JSON.stringify already drops undefined-valued keys before they'd reach here.
      (result as Record<string, unknown>)[key] = src;
    }
  }
  return result;
}

export function getContent(): CMSContent {
  if (typeof window === "undefined") return DEFAULT_CONTENT;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_CONTENT;
    const parsed = JSON.parse(stored) as Partial<CMSContent>;
    const merged = deepMerge(DEFAULT_CONTENT, parsed);

    // Append any default projects not yet in the stored list (new projects added to code),
    // but skip any that the user has explicitly deleted.
    const storedIds = new Set(merged.work.projects.map((p) => p.id));
    const deletedIds = new Set(merged.work.deletedProjectIds ?? []);
    const newDefaults = DEFAULT_CONTENT.work.projects.filter(
      (p) => !storedIds.has(p.id) && !deletedIds.has(p.id)
    );
    if (newDefaults.length > 0) {
      merged.work.projects = [...merged.work.projects, ...newDefaults];
    }

    // evaluate.stats gained an `id` field for the Work-page stats-bar selector feature —
    // assign a stable, index-based fallback id to any pre-existing entries that don't have
    // one yet (deterministic across reloads as long as the entry stays at that index, so a
    // homeStats slot referencing it doesn't silently break before the admin re-saves it).
    if (Array.isArray(merged.evaluate?.stats)) {
      merged.evaluate.stats = merged.evaluate.stats.map((s, i) => (s.id ? s : { ...s, id: `stat-legacy-${i}` }));
    }
    if (!merged.work.homeStats || typeof merged.work.homeStats !== "object") {
      merged.work.homeStats = DEFAULT_CONTENT.work.homeStats;
    } else if (!Array.isArray(merged.work.homeStats.slotIds)) {
      merged.work.homeStats.slotIds = DEFAULT_CONTENT.work.homeStats.slotIds;
    }

    // Ensure fields added after initial localStorage saves exist
    if (!Array.isArray(merged.enquiries)) merged.enquiries = [];
    if (!merged.mediaMeta || typeof merged.mediaMeta !== "object") merged.mediaMeta = {};
    if (!merged.branding || typeof merged.branding !== "object") merged.branding = {};
    if (!merged.designSystem || typeof merged.designSystem !== "object") merged.designSystem = DEFAULT_DESIGN_SYSTEM;
    if (!merged.designSystem.componentColors || typeof merged.designSystem.componentColors !== "object") {
      merged.designSystem.componentColors = {};
    }
    if (!merged.designSystem.buttonStyles) {
      merged.designSystem.buttonStyles = DEFAULT_DESIGN_SYSTEM.buttonStyles;
    } else {
      merged.designSystem.buttonStyles = {
        primary: { ...DEFAULT_DESIGN_SYSTEM.buttonStyles.primary, ...merged.designSystem.buttonStyles.primary },
        secondary: { ...DEFAULT_DESIGN_SYSTEM.buttonStyles.secondary, ...merged.designSystem.buttonStyles.secondary },
        tertiary: { ...DEFAULT_DESIGN_SYSTEM.buttonStyles.tertiary, ...merged.designSystem.buttonStyles.tertiary },
      };
    }
    if (!merged.designSystem.linkUnderline) merged.designSystem.linkUnderline = "none";
    merged.designSystem.typeScale = {
      ...DEFAULT_DESIGN_SYSTEM.typeScale,
      ...merged.designSystem.typeScale,
      body: { ...DEFAULT_DESIGN_SYSTEM.typeScale.body, ...merged.designSystem.typeScale?.body },
      headings: { ...DEFAULT_DESIGN_SYSTEM.typeScale.headings, ...merged.designSystem.typeScale?.headings },
      labels: { ...DEFAULT_DESIGN_SYSTEM.typeScale.labels, ...merged.designSystem.typeScale?.labels },
    };
    merged.designSystem.menuStyle = { ...DEFAULT_DESIGN_SYSTEM.menuStyle, ...merged.designSystem.menuStyle };
    merged.designSystem.tabBarStyle = { ...DEFAULT_DESIGN_SYSTEM.tabBarStyle, ...merged.designSystem.tabBarStyle };
    merged.designSystem.textAreaStyle = { ...DEFAULT_DESIGN_SYSTEM.textAreaStyle, ...merged.designSystem.textAreaStyle };
    merged.designSystem.switchStyle = { ...DEFAULT_DESIGN_SYSTEM.switchStyle, ...merged.designSystem.switchStyle };
    if (!Array.isArray(merged.designSystem.savedThemes)) merged.designSystem.savedThemes = [];

    return merged;
  } catch {
    return DEFAULT_CONTENT;
  }
}

export function saveContent(content: CMSContent): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
    return true;
  } catch (e) {
    console.error("Failed to save CMS content:", e);
    return false;
  }
}

// ─── Version history ────────────────────────────────────────────────────────────
// A local preview of what version history will look like once content lives in Postgres —
// same interaction model (a list of past states, restore any of them), just backed by
// localStorage instead of a database table. persistContent() archives whatever was live
// immediately before each save, so this fills in from normal use with no separate "start
// tracking" step. Swapping the backend later means changing what's inside these functions
// (a fetch instead of a localStorage read/write), not the admin UI that calls them.
const HISTORY_KEY = "portfolio_cms_history";
const MAX_HISTORY_ENTRIES = 20;

export interface CMSHistoryEntry {
  id: string;
  timestamp: string;
  content: CMSContent;
}

export function getHistory(): CMSHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function archiveHistoryEntry(content: CMSContent) {
  try {
    const entry: CMSHistoryEntry = {
      id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
      content,
    };
    const next = [entry, ...getHistory()].slice(0, MAX_HISTORY_ENTRIES);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    // Best-effort, same quota constraint saveContent already hits — a save that can't be
    // archived should still succeed, so this never throws back up to persistContent().
  }
}

// Human-readable labels for CMSContent's top-level sections, used to summarize which parts of
// the site changed between two history entries without a full field-level diff.
export const HISTORY_SECTION_LABELS: Partial<Record<keyof CMSContent, string>> = {
  global: "Global",
  homepage: "Home",
  work: "Work",
  evaluate: "Evaluate",
  process: "Process",
  story: "Story",
  enquiries: "Enquiries",
  mediaMeta: "Media Library",
  designSystem: "Design System",
  branding: "Branding",
  socials: "Socials",
  notFound: "404 Page",
  companies: "Companies",
  companyCreditCopy: "Company Credit Copy",
};

// Coarse "what changed" summary — the top-level sections that differ between two content
// states, in HISTORY_SECTION_LABELS order. Not a field-level diff, but enough to tell "Work"
// from "Design System" at a glance for content this size.
export function diffSections(a: CMSContent, b: CMSContent): string[] {
  const keys = Object.keys(HISTORY_SECTION_LABELS) as (keyof CMSContent)[];
  return keys
    .filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]))
    .map((key) => HISTORY_SECTION_LABELS[key]!);
}

// ─── Media usage lookup ────────────────────────────────────────────────────────

// Finds every place a media file is referenced — direct image fields (cover/hero/gallery/
// logo) plus any rich text field that can embed an <img> (RichTextEditor supports inline
// images). Used to warn before deleting a file that's still in use somewhere.
export function findMediaUsage(content: CMSContent, src: string): string[] {
  const hits: string[] = [];

  for (const p of content.work.projects) {
    if (p.coverImageUrl === src) hits.push(`Project "${p.name}" — Cover Image`);
    if (p.coverImageHoverUrl === src) hits.push(`Project "${p.name}" — Cover Image (Hover)`);
    if (p.heroImageUrl === src) hits.push(`Project "${p.name}" — Hero Image`);
    if (p.fullCaseStudyBannerUrl === src) hits.push(`Project "${p.name}" — Case Study Banner`);
    if (p.imgs?.includes(src)) hits.push(`Project "${p.name}" — Gallery Image`);
  }
  for (const cs of content.work.caseStudies) {
    if (cs.coverImageUrl === src) hits.push(`Case Study "${cs.title}" — Cover Image`);
    if (cs.coverImageHoverUrl === src) hits.push(`Case Study "${cs.title}" — Cover Image (Hover)`);
    if (cs.heroImageUrl === src) hits.push(`Case Study "${cs.title}" — Hero Image`);
    if (cs.fullCaseStudyBannerUrl === src) hits.push(`Case Study "${cs.title}" — Case Study Banner`);
    if (cs.img1Url === src) hits.push(`Case Study "${cs.title}" — Image 1`);
    if (cs.img2Url === src) hits.push(`Case Study "${cs.title}" — Image 2`);
    if (cs.img3Url === src) hits.push(`Case Study "${cs.title}" — Image 3`);
  }
  for (const client of content.evaluate.clients ?? []) {
    if (client.logoUrl === src) hits.push(`Client Logo — "${client.name}"`);
  }
  for (const company of content.companies ?? []) {
    if (company.logoUrl === src) hits.push(`Company Logo — "${company.name}"`);
  }
  if (content.story.portraitImageUrl === src) hits.push("Story — Portrait Photo");
  const branding = content.branding ?? {};
  if (branding.logoUrl === src) hits.push("Branding — Logo");
  if (branding.faviconUrl === src) hits.push("Branding — Favicon (.ico)");
  if (branding.faviconPngUrl === src) hits.push("Branding — Favicon (PNG)");
  if (branding.faviconSvgUrl === src) hits.push("Branding — Favicon (SVG)");
  if (branding.appleTouchIconUrl === src) hits.push("Branding — Apple Touch Icon");

  const richTextFields: { label: string; value: string | undefined }[] = [
    { label: "Work — Hero Statement", value: content.work.heroStatement },
    { label: "Evaluate — Hero Statement", value: content.evaluate.heroStatement },
    { label: "Evaluate — Bio", value: content.evaluate.bio },
    { label: "Evaluate — Personal Note (Beyond Design)", value: content.evaluate.beyondDesign },
    { label: "Evaluate — CTA Body", value: content.evaluate.ctaBody },
    ...content.evaluate.testimonials.map((t, i) => ({ label: `Evaluate — Testimonial ${i + 1} Quote ("${t.name}")`, value: t.quote })),
    ...content.evaluate.experience.map((e) => ({ label: `Evaluate — "${e.org}" Description`, value: e.description })),
    { label: "Process — Hero Statement", value: content.process.heroStatement },
    ...content.process.steps.map((s) => ({ label: `Process — "${s.title}" Description`, value: s.description })),
    ...content.process.steps.map((s) => ({ label: `Process — "${s.title}" Example`, value: s.example })),
    { label: "Story — Hero Statement", value: content.story.heroStatement },
    ...content.story.timeline.map((t, i) => ({ label: `Story — Timeline "${t.title || `Entry ${i + 1}`}" Body`, value: t.body })),
    { label: "Story — Closing Quote", value: content.story.closingQuote },
    ...content.work.projects.map((p) => ({ label: `Project "${p.name}" — Description`, value: p.fullContent })),
    ...content.work.caseStudies.map((cs) => ({ label: `Case Study "${cs.title}" — Summary`, value: cs.summary })),
    ...content.work.caseStudies.map((cs) => ({ label: `Case Study "${cs.title}" — Project Detail`, value: cs.fullContent })),
    ...content.work.caseStudies.map((cs) => ({ label: `Case Study "${cs.title}" — Full Case Study`, value: cs.fullCaseStudyContent })),
  ];
  for (const f of richTextFields) {
    if (f.value && f.value.includes(src)) hits.push(f.label);
  }

  return hits;
}

// Repoints every place findMediaUsage() above would report from oldSrc to newSrc — dedicated
// image fields get a straight swap; rich text fields get a string replace so any inline <img
// src="oldSrc"> embedded in the HTML is rewritten too. Mirrors findMediaUsage()'s field list
// exactly on purpose — if a field is added to one, add it to the other.
export function replaceMediaUsage(content: CMSContent, oldSrc: string, newSrc: string): CMSContent {
  const swap = (v: string | undefined) => (v === oldSrc ? newSrc : v);
  const swapArr = (arr: string[] | undefined) => (arr ? arr.map((v) => (v === oldSrc ? newSrc : v)) : arr);
  const swapRich = (v: string | undefined) => (v && v.includes(oldSrc) ? v.split(oldSrc).join(newSrc) : v);

  return {
    ...content,
    companies: (content.companies ?? []).map((c) => ({ ...c, logoUrl: swap(c.logoUrl) })),
    branding: {
      ...content.branding,
      logoUrl: swap(content.branding?.logoUrl),
      faviconUrl: swap(content.branding?.faviconUrl),
      faviconPngUrl: swap(content.branding?.faviconPngUrl),
      faviconSvgUrl: swap(content.branding?.faviconSvgUrl),
      appleTouchIconUrl: swap(content.branding?.appleTouchIconUrl),
    },
    evaluate: {
      ...content.evaluate,
      heroStatement: swapRich(content.evaluate.heroStatement) ?? content.evaluate.heroStatement,
      bio: swapRich(content.evaluate.bio) ?? content.evaluate.bio,
      beyondDesign: swapRich(content.evaluate.beyondDesign) ?? content.evaluate.beyondDesign,
      ctaBody: swapRich(content.evaluate.ctaBody) ?? content.evaluate.ctaBody,
      clients: (content.evaluate.clients ?? []).map((c) => ({ ...c, logoUrl: swap(c.logoUrl) })),
      testimonials: content.evaluate.testimonials.map((t) => ({ ...t, quote: swapRich(t.quote) ?? t.quote })),
      experience: content.evaluate.experience.map((e) => ({ ...e, description: swapRich(e.description) ?? e.description })),
    },
    process: {
      ...content.process,
      heroStatement: swapRich(content.process.heroStatement) ?? content.process.heroStatement,
      steps: content.process.steps.map((s) => ({
        ...s,
        description: swapRich(s.description) ?? s.description,
        example: swapRich(s.example) ?? s.example,
      })),
    },
    story: {
      ...content.story,
      heroStatement: swapRich(content.story.heroStatement) ?? content.story.heroStatement,
      portraitImageUrl: swap(content.story.portraitImageUrl),
      timeline: content.story.timeline.map((t) => ({ ...t, body: swapRich(t.body) ?? t.body })),
      closingQuote: swapRich(content.story.closingQuote) ?? content.story.closingQuote,
    },
    work: {
      ...content.work,
      heroStatement: swapRich(content.work.heroStatement) ?? content.work.heroStatement,
      projects: content.work.projects.map((p) => ({
        ...p,
        coverImageUrl: swap(p.coverImageUrl),
        coverImageHoverUrl: swap(p.coverImageHoverUrl),
        heroImageUrl: swap(p.heroImageUrl),
        fullCaseStudyBannerUrl: swap(p.fullCaseStudyBannerUrl),
        imgs: swapArr(p.imgs) ?? p.imgs,
        fullContent: swapRich(p.fullContent) ?? p.fullContent,
      })),
      caseStudies: content.work.caseStudies.map((cs) => ({
        ...cs,
        coverImageUrl: swap(cs.coverImageUrl),
        coverImageHoverUrl: swap(cs.coverImageHoverUrl),
        heroImageUrl: swap(cs.heroImageUrl),
        fullCaseStudyBannerUrl: swap(cs.fullCaseStudyBannerUrl),
        img1Url: swap(cs.img1Url),
        img2Url: swap(cs.img2Url),
        img3Url: swap(cs.img3Url),
        summary: swapRich(cs.summary) ?? cs.summary,
        fullContent: swapRich(cs.fullContent) ?? cs.fullContent,
        fullCaseStudyContent: swapRich(cs.fullCaseStudyContent) ?? cs.fullCaseStudyContent,
      })),
    },
  };
}

// Inverse of findMediaUsage — runs the same check across a whole file list and returns the
// ones nothing references. Takes a plain { src }[] rather than the media API's own MediaFile
// type so this module doesn't need to import from an API route.
export function findOrphanedMedia<T extends { src: string }>(content: CMSContent, files: T[]): T[] {
  return files.filter((f) => findMediaUsage(content, f.src).length === 0);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
// useContentStore() itself lives in ./useContentStoreHook (a "use client" file — it uses
// useState/useEffect, which Next's compiler forbids importing into any module reachable from a
// Server Component). Re-exported here so every existing `import { useContentStore } from
// "@/store/contentStore"` keeps working unchanged — this file itself stays server-safe since it
// only re-exports the binding, it doesn't import React's hooks directly.
export { useContentStore } from "@/store/useContentStoreHook";
