import { createHmac } from "crypto";
import { cookies } from "next/headers";

// A missing SESSION_SECRET in production would silently fall back to this literal string —
// which is sitting right here in source control, so anyone who's read this file could forge a
// valid session cookie. Fail loudly at startup instead of shipping that quietly. Dev/test still
// gets the fallback so local work doesn't require an env var to be set.
function resolveSecret(): string {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is not set. Refusing to start in production with a public, guessable session signing key — set SESSION_SECRET in the environment before deploying."
    );
  }
  return "change-this-in-production";
}

const SECRET = resolveSecret();
const TOKEN_VALUE = "admin:authenticated";

export function signToken(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("hex");
}

export function createSessionToken(): string {
  return `${TOKEN_VALUE}.${signToken(TOKEN_VALUE)}`;
}

export function verifySessionToken(token: string): boolean {
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const value = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  return value === TOKEN_VALUE && signature === signToken(value);
}

export async function getSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_session")?.value;
  if (!token) return false;
  return verifySessionToken(token);
}
