"use client";

import { useState } from "react";
import { AuthShell, AuthField } from "@/components/site/AuthShell";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Reached by an authenticated user who has no `profiles` row yet. This
// happens for every brand-new signup, because the company/profile can only
// be created once a session exists — and if the project requires email
// confirmation (Supabase's default), that's only true on the *next*
// sign-in, after the user confirms, not right after signUp(). See proxy.ts.
export default function OnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("create_company_and_owner", {
      company_name: companyName,
      owner_full_name: fullName,
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell tag="One last step" title="Finish setting up." lede="Your email is confirmed. Name your company to finish creating your Owner account.">
      {error && <div className="auth-err">{error}</div>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthField label="Your name" value={fullName} onChange={setFullName} required autoComplete="name" />
        <AuthField label="Company name" value={companyName} onChange={setCompanyName} required autoComplete="organization" />
        <button className="site-btn primary lg" type="submit" disabled={busy}>
          {busy ? "Creating…" : "Create my company"}
        </button>
      </form>
    </AuthShell>
  );
}
