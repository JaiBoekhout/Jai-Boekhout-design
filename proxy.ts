import { NextRequest, NextResponse } from "next/server";

// No-op for now — there are currently no pages under /admin/* to protect. The real CMS lives
// entirely behind the in-page login modal (components/AdminLogin.tsx → loginForCms() in
// app/actions/auth.ts), which checks the session itself and doesn't need route-level guarding.
// If a server-rendered /admin/* area comes back once there's a real database behind this
// project, reintroduce a cookie-presence check here (see git history for the previous version)
// pointed at whatever the new login route ends up being.
export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
