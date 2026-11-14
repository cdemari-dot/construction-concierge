import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { AddCrewForm, CrewRow, InviteTeamForm } from "@/components/dashboard/TeamForms";
import type { PayRate, Profile } from "@/lib/types/database";

export default async function TeamPage() {
  if (!isSupabaseConfigured) return <SetupBanner />;

  const supabase = await createClient();
  const [{ data: profiles }, { data: rates }, me] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: true }),
    supabase.from("pay_rates").select("*"),
    getCurrentUser(),
  ]);
  const list = (profiles ?? []) as Profile[];
  const rateBy = new Map(((rates ?? []) as PayRate[]).map((r) => [r.profile_id, Number(r.hourly_rate)]));

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>
        Team
      </h1>
      <p style={{ color: "var(--mute)", fontSize: 13, marginBottom: 16 }}>
        Workers (and Foremen) get a PIN for the kiosk. A Foreman can also be invited with a login so they can use the field app on their own phone. Set each person&apos;s loaded hourly cost (wage plus burden) so jobs show real labour margin — only Owner/PM can see rates.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16, marginBottom: 16 }}>
        <AddCrewForm />
        <InviteTeamForm />
      </div>

      <section className="cc-card">
        <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 4 }}>
          Everyone
        </h3>
        <div>
          {list.map((p) => (
            <CrewRow key={p.id} profile={p} isSelf={p.id === me?.profile.id} rate={rateBy.get(p.id) ?? null} />
          ))}
          {list.length === 0 && <div style={{ color: "var(--mute)", fontSize: 13, paddingTop: 10 }}>No one yet.</div>}
        </div>
      </section>
    </div>
  );
}
