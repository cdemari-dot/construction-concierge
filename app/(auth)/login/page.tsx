"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
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
    <main
      style={{
        flex: 1,
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        padding: 20,
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <Image src="/brand/logo-mark.png" alt="" width={34} height={34} />
          <div>
            <b className="display" style={{ fontSize: 17, letterSpacing: ".08em" }}>
              Construction Concierge
            </b>
            <div style={{ fontSize: 11, color: "var(--mute)", letterSpacing: 1 }}>OWNER&apos;S CFO</div>
          </div>
        </div>

        {!isSupabaseConfigured && <SetupBanner />}

        <div className="cc-card">
          <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
            <button
              className={`cc-btn ${mode === "sign-in" ? "" : "ghost"}`}
              onClick={() => setMode("sign-in")}
              type="button"
            >
              Sign in
            </button>
            <button
              className={`cc-btn ${mode === "new-company" ? "" : "ghost"}`}
              onClick={() => setMode("new-company")}
              type="button"
            >
              Start a new company
            </button>
          </div>

          {notice && (
            <div style={{ fontSize: 12.5, color: "var(--lime)", marginBottom: 12 }}>{notice}</div>
          )}
          {error && <div style={{ fontSize: 12.5, color: "var(--red)", marginBottom: 12 }}>{error}</div>}

          <form onSubmit={mode === "sign-in" ? handleSignIn : handleNewCompany} style={{ display: "grid", gap: 12 }}>
            {mode === "new-company" && (
              <>
                <Field label="Your name" value={fullName} onChange={setFullName} required />
                <Field label="Company name" value={companyName} onChange={setCompanyName} required />
              </>
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail} required />
            <Field label="Password" type="password" value={password} onChange={setPassword} required minLength={6} />
            <button className="cc-btn lime" type="submit" disabled={busy || !isSupabaseConfigured} style={{ marginTop: 4 }}>
              {busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create company"}
            </button>
          </form>
        </div>

        <div style={{ marginTop: 14 }}>
          <ThemeToggle />
        </div>

        <p style={{ fontSize: 11.5, color: "var(--mute)", marginTop: 16, lineHeight: 1.6 }}>
          Foreman and Worker: use the punch clock on the jobsite iPad, not this page.
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  minLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
      {label}
      <input
        type={type}
        value={value}
        required={required}
        minLength={minLength}
        onChange={(e) => onChange(e.target.value)}
        style={{
          background: "var(--panel)",
          border: "1px solid var(--line2)",
          borderRadius: 10,
          color: "var(--text)",
          padding: "9px 10px",
          fontSize: 14,
        }}
      />
    </label>
  );
}
