"use client";

import { useRouter } from "next/navigation";
import { AuthShell } from "@/components/site/AuthShell";
import { createClient } from "@/lib/supabase/client";

// Reached by a signed-in account that is not linked to any company. Sign-up is invite-only,
// so there is nothing to set up here: they need an invite from a company owner.
export default function OnboardingPage() {
  const router = useRouter();
  return (
    <AuthShell tag="Invitation needed" title="No company yet." lede="This account is not linked to a company. Ask your company owner to invite you using this exact email, then sign in again.">
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
