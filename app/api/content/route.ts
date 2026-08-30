import { NextResponse } from "next/server";
import { getContent } from "@/store/serverContent";

// Public — every visitor's page render needs this same content, same as getContent() itself.
// This is the fetch target store/useContentStoreHook.ts uses, since a Client Component can't
// call getContent()/Postgres directly.
export async function GET() {
  const content = await getContent();
  return NextResponse.json(content);
}
