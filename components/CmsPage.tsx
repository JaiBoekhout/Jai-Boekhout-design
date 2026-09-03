"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminLogin } from "@/components/AdminLogin";
import { AdminCMS } from "@/components/AdminCMS";

interface Props {
  // Seeded server-side from getSession() (app/cms/page.tsx) so a signed-in visit to /cms renders
  // straight into the CMS on first paint instead of flashing the login screen first.
  initiallyLoggedIn: boolean;
}

// The whole login → CMS flow for the dedicated /cms route — replaces components/AdminShell.tsx,
// which existed only to share this same flow across multiple modal-trigger mount points. With one
// dedicated page there's nothing left to share it with.
export function CmsPage({ initiallyLoggedIn }: Props) {
  const [loggedIn, setLoggedIn] = useState(initiallyLoggedIn);
  const router = useRouter();

  return (
    <>
      <AdminLogin
        isOpen={!loggedIn}
        onClose={() => router.push("/")}
        onSuccess={() => setLoggedIn(true)}
      />
      {loggedIn && (
        <AdminCMS
          isOpen
          onClose={() => router.push("/")}
          onLoggedOut={() => setLoggedIn(false)}
        />
      )}
    </>
  );
}
