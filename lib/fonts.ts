import {
  Poppins,
  DM_Sans,
  DM_Mono,
  Fraunces,
  Space_Grotesk,
  Space_Mono,
  Playfair_Display,
  Work_Sans,
  Manrope,
  Inter,
  JetBrains_Mono,
  IBM_Plex_Mono,
  Instrument_Serif,
} from "next/font/google";

// Every font selectable anywhere in the Design System (the 3 preset FONT_PAIRINGS plus
// CUSTOM_HEADING_FONTS/CUSTOM_BODY_FONTS/CUSTOM_MONO_FONTS in store/contentStore.ts) gets loaded
// here, once, self-hosted via next/font/google. This replaces the old single Google Fonts CSS2
// `@import url(...)` at the top of app/globals.css — Turbopack (the default bundler as of this
// Next.js version, per node_modules/next/dist/docs) doesn't support remote/URL CSS imports, so
// that @import was silently dropped: zero font-related network requests, zero @font-face rules
// in the served CSS, for every font on the site, not just newly-added ones.
//
// next/font emits each family's @font-face under its real name (e.g. 'Poppins'), so the existing
// --font-heading/--font-body/--font-mono/--font-secondary values in buildDesignSystemCss() —
// still just literal quoted family-name strings like "'Poppins', sans-serif" — resolve correctly
// once each font's generated stylesheet is part of the page at all. That only requires each
// font's returned `.variable` to be applied somewhere in the tree once; combined into
// `fontVariables` below and applied to <html> in app/layout.tsx.
//
// Weight/style lists are the broadest each family actually publishes within FONT_WEIGHTS
// (store/contentStore.ts's [300,400,500,600,700] — the only weights selectable via the Custom
// pairing's weight dropdowns), confirmed against next/font's own google-fonts-metadata rather
// than guessed — a combo that doesn't exist throws at build time. Where a family doesn't publish
// every one of those weights (e.g. DM Mono tops out at 500) or doesn't publish italic at all
// (Space Grotesk, Manrope), it's simply omitted — the browser synthesizes the nearest weight/
// style rather than failing, exactly as it already does for the weights this app applies via
// separate CSS custom properties (--heading-weight etc.) independent of which static cuts of a
// family were actually downloaded.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-poppins",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-dm-sans",
});
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-dm-mono",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-space-grotesk",
});
const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-space-mono",
});
const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair-display",
});
const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-work-sans",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-manrope",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-inter",
});
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-jetbrains-mono",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-ibm-plex-mono",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
});

export const fontVariables = [
  poppins.variable,
  dmSans.variable,
  dmMono.variable,
  fraunces.variable,
  spaceGrotesk.variable,
  spaceMono.variable,
  playfairDisplay.variable,
  workSans.variable,
  manrope.variable,
  inter.variable,
  jetBrainsMono.variable,
  ibmPlexMono.variable,
  instrumentSerif.variable,
].join(" ");
