import { redirect } from "next/navigation";

// Leftover create-next-app scaffolding used to live at this route with fabricated, wrong bio
// content (a different name/discipline/location than the real site) that was still being
// indexed by the sitemap. The real bio lives in the CMS-driven Evaluate path — redirect here
// rather than duplicating it in a second, easily-drifting copy.
export default function AboutPage() {
  redirect("/evaluate");
}
