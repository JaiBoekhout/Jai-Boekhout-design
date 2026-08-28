import type { ReactNode } from "react";

// Declares the @modal parallel route slot: `children` is whatever matched under work/ (the
// grid at work/page.tsx, or a real work/[slug] page on a hard navigation/crawler visit);
// `modal` is populated only when a link *within* the app was intercepted (work/@modal/(.)[slug])
// — see node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/parallel-routes.md.
export default function WorkLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
