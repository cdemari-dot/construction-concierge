"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AuthShell, AuthField } from "@/components/site/AuthShell";
import { SetupBanner } from "@/components/ui/SetupBanner";

type Mode = "sign-in" | "new-company";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  async function handleNewCompany(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setBusy(false);
      setError(signUpError.message);
      return;
    }

    if (!signUpData.session) {
      // Email confirmation is required before create_company_and_owner can
      // run (it needs an authenticated session).
      setBusy(false);
      setNotice("Check your email to confirm your account, then sign in to finish setting up your company.");
      setMode("sign-in");
      return;
    }

    const { error: rpcError } = await supabase.rpc("create_company_and_owner", {
      company_name: companyName,
      owner_full_name: fullName,
    });
    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell
      tag={mode === "sign-in" ? "Welcome back" : "Get started"}
      title={mode === "sign-in" ? "Log in." : "Start your company."}
      lede={mode === "sign-in" ? "Your jobs, crew and cash, live." : "Create your owner account and set up your company in minutes."}
      foot="Jobsite iPad: sign in with its email and 6-digit login code (set up at /accept-invite?kiosk=1). Worker PINs (4 digits) are only for the punch pad after that."
    >
      {!isSupabaseConfigured && <SetupBanner />}

      <div className="auth-seg" role="tablist" aria-label="Sign in or create a company">
        <button className={mode === "sign-in" ? "on" : ""} onClick={() => setMode("sign-in")} type="button" role="tab" aria-selected={mode === "sign-in"}>
          Sign in
        </button>
        <button className={mode === "new-company" ? "on" : ""} onClick={() => setMode("new-company")} type="button" role="tab" aria-selected={mode === "new-company"}>
          Start a new company
        </button>
      </div>

      {notice && <div className="auth-ok">{notice}</div>}
      {error && <div className="auth-err">{error}</div>}

      <form className="auth-form" onSubmit={mode === "sign-in" ? handleSignIn : handleNewCompany}>
        {mode === "new-company" && (
          <>
            <AuthField label="Your name" value={fullName} onChange={setFullName} required autoComplete="name" />
            <AuthField label="Company name" value={companyName} onChange={setCompanyName} required autoComplete="organization" />
          </>
        )}
        <AuthField label="Email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
        <AuthField label="Password" type="password" value={password} onChange={setPassword} required minLength={6} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} />
        <button className="site-btn primary lg" type="submit" disabled={busy || !isSupabaseConfigured}>
          {busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create company"}
        </button>
      </form>
    </AuthShell>
  );
}
