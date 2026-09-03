"use server";

import { cookies, headers } from "next/headers";
import { createSessionToken } from "@/lib/auth";
import { isLockedOut, recordFailedAttempt, clearAttempts, minutesUntilUnlocked } from "@/lib/rateLimit";

async function setSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set("admin_session", createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

// Vercel (and most proxies) set x-forwarded-for to the real client IP; falling back to a
// single shared key when it's absent still rate-limits *something* rather than nothing, at
// the cost of one client's failed attempts being able to lock out another's on that path.
async function clientKey(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
}

// Used by the CMS login screen (components/AdminLogin.tsx, rendered at /cms — see
// app/cms/page.tsx / components/CmsPage.tsx).
export async function loginForCms(password: string): Promise<{ ok: boolean; error?: string }> {
  const key = await clientKey();
  if (isLockedOut(key)) {
    return { ok: false, error: `Too many attempts. Try again in ${minutesUntilUnlocked(key)} minute(s).` };
  }

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    recordFailedAttempt(key);
    return { ok: false };
  }
  clearAttempts(key);
  await setSessionCookie();
  return { ok: true };
}

// Actually invalidates the session (unlike just closing the CMS panel) — the cookie's signature
// still verifies fine after this, but the browser no longer sends it once cleared, so the next
// visit to /cms falls through to getSession() returning false and shows the login screen again.
export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("admin_session");
}
