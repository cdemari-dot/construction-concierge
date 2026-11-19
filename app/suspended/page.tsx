"use client";

import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/site/AuthShell";
import { createClient } from "@/lib/supabase/client";

// Shown to people whose company is paused or cancelled.
export default function SuspendedPage() {
  const router = useRouter();
  return (
    <AuthShell tag="Account paused" title="Access is paused." lede="Your company's access to Construction Concierge is paused or has ended. Your data is safe. Contact hello@constructionconcierge.ai to get back in.">
      <button
        className="site-btn primary lg"
        type="button"
        onClick={async () => {
          await createClient().auth.signOut();
          router.push("/login");
          router.refresh();
        }}
      >
        Sign out
      </button>
    </AuthShell>
  );
}
