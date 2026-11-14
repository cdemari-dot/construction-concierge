import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { QrLink } from "@/components/dashboard/QrLink";
import type { Job } from "@/lib/types/database";

export default async function FieldPage() {
  if (!isSupabaseConfigured) return <SetupBanner />;

  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*").eq("status", "active").order("job_number");
  const jobs = (data ?? []) as Job[];

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>
        Field app
      </h1>
      <p style={{ color: "var(--mute)", fontSize: 13, marginBottom: 16, maxWidth: 720, lineHeight: 1.6 }}>
        <b style={{ color: "var(--text)" }}>Kiosk</b> — leave one signed-in tablet at each jobsite; crew clock in and out with their PIN.
        Sign the tablet in once with a Foreman, PM or Owner login, open its job&apos;s link, and lock it there (iPad: Guided Access).{" "}
        <b style={{ color: "var(--text)" }}>Foreman phone app</b> — a Foreman signs in on their own phone for the punch clock, daily log, extras, T&amp;M tickets and incident reports.
      </p>

      <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 10 }}>Foreman phone app</h3>
      <div style={{ marginBottom: 24, maxWidth: 520 }}>
        <QrLink path="/m" label="Foreman app" hint="Foreman signs in with their own login, then picks a job." />
      </div>

      <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 10 }}>Jobsite kiosks</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12 }}>
        {jobs.map((j) => (
          <QrLink key={j.id} path={`/kiosk/${j.id}`} label={`${j.job_number} · ${j.name}`} hint="Shared punch-clock tablet for this job." />
        ))}
        {jobs.length === 0 && <div className="cc-card" style={{ color: "var(--mute)" }}>No active jobs yet. Create one under Jobs.</div>}
      </div>
    </div>
  );
}
