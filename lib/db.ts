import "server-only";
import { neon } from "@neondatabase/serverless";

// Lazy — reading process.env.DATABASE_URL at module load time would crash any route that
// imports this file before the env var exists (e.g. during a build step without it configured),
// instead of only the request that actually needs the database.
let client: ReturnType<typeof neon> | null = null;

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  if (!client) {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not set — connect the Postgres integration in Vercel (or add it to .env.local for local dev).");
    }
    client = neon(process.env.DATABASE_URL);
  }
  return client(strings, ...values);
}
