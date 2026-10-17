import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEnquiries } from "@/lib/enquiries";

// This returns enquirers' names, email addresses and message bodies to one authenticated admin.
// Next's default response header for a dynamic route is "public, max-age=0, must-revalidate";
// `public` lets shared caches hold a copy, and a revalidation that comes back 304 lets a stored
// body be reused — which is how a deleted enquiry reappeared after a refresh. Both a correctness
// and a privacy problem, so it is pinned uncacheable at every layer: force-dynamic here, no-store
// on the response, and no-store on the client fetch.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store, max-age=0, must-revalidate" } as const;

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE });
  }
  try {
    const data = await getEnquiries();
    return NextResponse.json({ enquiries: data }, { headers: NO_STORE });
  } catch (err) {
    console.error("Failed to fetch enquiries:", err);
    return NextResponse.json({ enquiries: [] }, { headers: NO_STORE });
  }
}
