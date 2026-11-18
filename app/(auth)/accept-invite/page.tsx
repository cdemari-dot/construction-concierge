"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthShell, AuthField } from "@/components/site/AuthShell";
import { createClient } from "@/lib/supabase/client";

// For an Owner/PM who was invited (a placeholder `profiles` row already
// exists for their email). Signing up here just creates their Supabase Auth
// account; handle_new_auth_user claims the existing profile by email the
// moment the auth.users row is created — no company name needed here.
function sixDigitCode() {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return String(100000 + (a[0] % 900000));
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInvite />
    </Suspense>
  );
}

function AcceptInvite() {
  const router = useRouter();
  const kiosk = useSearchParams().get("kiosk") === "1";
  const [code, setCode] = useState<string | null>(null);
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
    const pw = kiosk ? sixDigitCode() : password;
    const { data, error } = await supabase.auth.signUp({ email, password: pw });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (kiosk) {
      setCode(pw);
      if (!data.session) setNotice("Check the email to confirm, then sign in at /login with this code.");
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
    <AuthShell tag={kiosk ? "Jobsite iPad" : "Join your company"} title={kiosk ? "Set up this iPad." : "Set your password."} lede={kiosk ? "Use the exact email your Owner invited for this iPad. A 6-digit login code is made for you." : "Use the exact email your Owner or PM invited. It links your new account to the company automatically."}>
      {error && <div className="auth-err">{error}</div>}
      {notice && <div className="auth-ok">{notice}</div>}
      {code && (
        <div className="auth-ok" style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4 }}>
          Login code: {code}
          <div style={{ fontSize: 13, letterSpacing: 0, fontWeight: 500 }}>Write it down. It is the password for this iPad and is not shown again.</div>
        </div>
      )}
      {code ? (
        <button className="site-btn primary lg" type="button" onClick={() => { router.push("/"); router.refresh(); }}>
          I wrote it down, continue
        </button>
      ) : (
      <form className="auth-form" onSubmit={handleSubmit}>
        <AuthField label="Email (must match your invite)" type="email" value={email} onChange={setEmail} required autoComplete="email" />
        {!kiosk && <AuthField label="Choose a password" type="password" value={password} onChange={setPassword} required minLength={6} autoComplete="new-password" />}
        <button className="site-btn primary lg" type="submit" disabled={busy}>
          {busy ? "Working…" : kiosk ? "Create this iPad's login" : "Create my login"}
        </button>
      </form>
      )}
    </AuthShell>
  );
}
