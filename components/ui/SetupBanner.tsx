export function SetupBanner() {
  return (
    <div
      className="cc-card"
      style={{ borderColor: "rgba(245,165,36,.5)", background: "rgba(245,165,36,.08)", margin: 20 }}
    >
      <h3 style={{ fontSize: 13, letterSpacing: 1, color: "var(--amber)", marginBottom: 8 }}>
        SUPABASE NOT CONFIGURED
      </h3>
      <p style={{ color: "var(--text2)", fontSize: 13.5, lineHeight: 1.6 }}>
        Create a Supabase project (region <code>ca-central-1</code>), run the migrations in{" "}
        <code>supabase/migrations</code>, then copy <code>.env.local.example</code> to{" "}
        <code>.env.local</code> and fill in the project URL and keys. See <code>README.md</code>{" "}
        for the full setup steps.
      </p>
    </div>
  );
}
