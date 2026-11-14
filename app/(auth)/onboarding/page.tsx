"use client";

import { useState } from "react";
import Image from "next/image";
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
    <main style={{ flex: 1, display: "grid", placeItems: "center", minHeight: "100vh", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
          <Image src="/brand/logo-mark.png" alt="" width={34} height={34} />
          <div>
            <b className="display" style={{ fontSize: 17, letterSpacing: ".08em" }}>
              Finish setting up
            </b>
            <div style={{ fontSize: 11, color: "var(--mute)", letterSpacing: 1 }}>ONE LAST STEP</div>
          </div>
        </div>

        <div className="cc-card">
          <p style={{ color: "var(--text2)", fontSize: 13.5, marginBottom: 16, lineHeight: 1.6 }}>
            Your email is confirmed. Name your company to finish creating your Owner account.
          </p>
          {error && <div style={{ fontSize: 12.5, color: "var(--red)", marginBottom: 12 }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
              Your name
              <input
                value={fullName}
                required
                onChange={(e) => setFullName(e.target.value)}
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
            <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
              Company name
              <input
                value={companyName}
                required
                onChange={(e) => setCompanyName(e.target.value)}
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
            <button className="cc-btn lime" type="submit" disabled={busy} style={{ marginTop: 4 }}>
              {busy ? "Creating…" : "Create my company"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
