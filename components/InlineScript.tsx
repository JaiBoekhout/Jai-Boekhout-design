// Renders a synchronous <script> that runs during HTML parsing, before hydration — used for
// the pre-paint theme/design-system DOM updates in app/layout.tsx. type toggles between
// "text/javascript" (server) and "text/plain" (client) so React doesn't warn about rendering
// a <script> tag on a client-side re-render (e.g. Fast Refresh), where it can't be executed
// anyway. suppressHydrationWarning covers the resulting type mismatch.
// See node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
