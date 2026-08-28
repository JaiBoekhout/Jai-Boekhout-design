// In-memory login attempt limiter. This is intentionally the cheap version: it lives in the
// Node process's memory, so it works correctly for local dev and a single long-running server,
// and still meaningfully slows down a rapid brute-force burst against a warm serverless
// instance on Vercel — but it resets on cold start and doesn't share state across instances, so
// it isn't a durable guarantee there. Once there's a real database behind this project, swap
// the Map below for a table/row keyed the same way (by IP) and the rest of this file is
// unchanged.

const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

interface Bucket {
  count: number;
  windowStart: number;
}

const attempts = new Map<string, Bucket>();

// Attempts are only ever added on failure and cleared on success, so the map can't grow
// unbounded from normal use — this just catches abandoned buckets from IPs that gave up.
function sweepExpired(now: number) {
  for (const [key, bucket] of attempts) {
    if (now - bucket.windowStart > WINDOW_MS) attempts.delete(key);
  }
}

export function isLockedOut(key: string): boolean {
  const bucket = attempts.get(key);
  if (!bucket) return false;
  if (Date.now() - bucket.windowStart > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return bucket.count >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string): void {
  const now = Date.now();
  sweepExpired(now);
  const bucket = attempts.get(key);
  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    attempts.set(key, { count: 1, windowStart: now });
  } else {
    bucket.count += 1;
  }
}

export function clearAttempts(key: string): void {
  attempts.delete(key);
}

export function minutesUntilUnlocked(key: string): number {
  const bucket = attempts.get(key);
  if (!bucket) return 0;
  const remainingMs = WINDOW_MS - (Date.now() - bucket.windowStart);
  return Math.max(1, Math.ceil(remainingMs / 60000));
}
