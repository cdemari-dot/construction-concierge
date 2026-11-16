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
        Two separate apps, both talking straight to Concierge. <b style={{ color: "var(--text)" }}>Crew Punch</b> is the jobsite iPad: crew clock in and out with their PIN, photo, PPE check and safety talk.
        Give each iPad its own login (add a team member with role Worker and an email on Team, e.g. &ldquo;Eglinton kiosk&rdquo;), sign in once, pick the site, then Share &rarr; Add to Home Screen.{" "}
        <b style={{ color: "var(--text)" }}>Field</b> is the foreman&apos;s own phone app: today&apos;s scheduled sites, crew status, daily log, extras, T&amp;M tickets (with photos) and incidents. Foreman signs in with their own login, then Add to Home Screen.
      </p>

      <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 10 }}>Foreman phone app</h3>
      <div style={{ marginBottom: 24, maxWidth: 520 }}>
        <QrLink path="/m" label="Field app (foreman)" hint="Foreman signs in with their own login. Shows only the sites they are scheduled on." />
      </div>

      <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 10 }}>Crew Punch (jobsite iPad)</h3>
      <div style={{ marginBottom: 24, maxWidth: 520 }}>
        <QrLink path="/kiosk" label="Crew Punch" hint="Sign the iPad in with its kiosk login, pick the site once. Opens straight to the PIN pad after that." />
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
