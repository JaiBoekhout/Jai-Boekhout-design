import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getEnquiries } from "@/lib/enquiries";

export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = await getEnquiries();
    return NextResponse.json({ enquiries: data });
  } catch (err) {
    console.error("Failed to fetch enquiries:", err);
    return NextResponse.json({ enquiries: [] });
  }
}
