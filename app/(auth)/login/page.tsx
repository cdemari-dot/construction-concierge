"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { AuthShell, AuthField } from "@/components/site/AuthShell";
import { SetupBanner } from "@/components/ui/SetupBanner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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

  return (
    <AuthShell
      tag="Welcome back"
      title="Log in."
      lede="Your jobs, crew and cash, live. Access is by invitation only."
      foot={
        <>
          Jobsite iPad? <a href="/accept-invite?kiosk=1" style={{ fontWeight: 700, textDecoration: "underline" }}>Set up its 6-digit login code</a>, then sign in here with the iPad&apos;s email and that code. Worker PINs (4 digits) are only for the punch pad.
        </>
      }
    >
      {!isSupabaseConfigured && <SetupBanner />}

      {error && <div className="auth-err">{error}</div>}

      <form className="auth-form" onSubmit={handleSignIn}>
        <AuthField label="Email" type="email" value={email} onChange={setEmail} required autoComplete="email" />
        <AuthField label="Password" type="password" value={password} onChange={setPassword} required minLength={6} autoComplete="current-password" />
        <button className="site-btn primary lg" type="submit" disabled={busy || !isSupabaseConfigured}>
          {busy ? "Working…" : "Sign in"}
        </button>
      </form>
    </AuthShell>
  );
}
