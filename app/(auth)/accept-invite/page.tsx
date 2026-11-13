"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main style={{ flex: 1, display: "grid", placeItems: "center", minHeight: "100vh", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <Image src="/brand/logo-mark.png" alt="" width={34} height={34} />
          <div>
            <b className="display" style={{ fontSize: 17, letterSpacing: ".08em" }}>
              Accept your invite
            </b>
            <div style={{ fontSize: 11, color: "var(--mute)", letterSpacing: 1 }}>JOIN YOUR COMPANY</div>
          </div>
        </div>

        <div className="cc-card">
          <p style={{ color: "var(--text2)", fontSize: 13.5, marginBottom: 16, lineHeight: 1.6 }}>
            Use the exact email your Owner or PM invited — it links your new account to the company automatically.
          </p>
          {error && <div style={{ fontSize: 12.5, color: "var(--red)", marginBottom: 12 }}>{error}</div>}
          {notice && <div style={{ fontSize: 12.5, color: "var(--lime)", marginBottom: 12 }}>{notice}</div>}
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
              Email (must match your invite)
              <input
                type="email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                style={{ background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 10, color: "var(--text)", padding: "9px 10px", fontSize: 14 }}
              />
            </label>
            <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
              Choose a password
              <input
                type="password"
                value={password}
                required
                minLength={6}
                onChange={(e) => setPassword(e.target.value)}
                style={{ background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 10, color: "var(--text)", padding: "9px 10px", fontSize: 14 }}
              />
            </label>
            <button className="cc-btn lime" type="submit" disabled={busy}>
              {busy ? "Working…" : "Create my login"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
