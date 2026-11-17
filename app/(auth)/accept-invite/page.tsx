"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthShell, AuthField } from "@/components/site/AuthShell";
import { createClient } from "@/lib/supabase/client";

// For an Owner/PM who was invited (a placeholder `profiles` row already
// exists for their email). Signing up here just creates their Supabase Auth
// account; handle_new_auth_user claims the existing profile by email the
// moment the auth.users row is created — no company name needed here.
export default function AcceptInvitePage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (!data.session) {
      setNotice("Check your email to confirm your account, then sign in at /login.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell tag="Join your company" title="Set your password." lede="Use the exact email your Owner or PM invited. It links your new account to the company automatically.">
      {error && <div className="auth-err">{error}</div>}
      {notice && <div className="auth-ok">{notice}</div>}
      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthField label="Email (must match your invite)" type="email" value={email} onChange={setEmail} required autoComplete="email" />
        <AuthField label="Choose a password" type="password" value={password} onChange={setPassword} required minLength={6} autoComplete="new-password" />
        <button className="site-btn primary lg" type="submit" disabled={busy}>
          {busy ? "Working…" : "Create my login"}
        </button>
      </form>
    </AuthShell>
  );
}
