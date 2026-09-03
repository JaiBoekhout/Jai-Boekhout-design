import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { CmsPage } from "@/components/CmsPage";

// Never indexed — this is the login screen for a private admin panel, not public content.
export const metadata: Metadata = {
  title: "CMS Login",
  robots: { index: false, follow: false },
};

// Cookie-dependent (getSession() reads next/headers' cookies()), so this route is always
// dynamically rendered — expected, this app has no static export target to conflict with.
export default async function CmsRoutePage() {
  const loggedIn = await getSession();
  return <CmsPage initiallyLoggedIn={loggedIn} />;
}
