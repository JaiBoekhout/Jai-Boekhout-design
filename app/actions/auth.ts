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

// Used by the in-page CMS login modal (the site's only admin entry point — see
// components/AdminLogin.tsx, triggered from the hidden "Admin" button on the homepage).
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
