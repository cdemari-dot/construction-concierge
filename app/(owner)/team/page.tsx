import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { AddCrewForm, CrewRow, InviteTeamForm } from "@/components/dashboard/TeamForms";
import type { Profile } from "@/lib/types/database";

export default async function TeamPage() {
  if (!isSupabaseConfigured) return <SetupBanner />;

  const supabase = await createClient();
  const { data: profiles } = await supabase.from("profiles").select("*").order("created_at", { ascending: true });
  const list = (profiles ?? []) as Profile[];

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>
        Team
      </h1>
      <p style={{ color: "var(--mute)", fontSize: 13, marginBottom: 16 }}>
        Foreman and Worker get a PIN for the kiosk, not a login. Owner and PM get a real login by invite.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <AddCrewForm />
        <InviteTeamForm />
      </div>

      <section className="cc-card">
        <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 4 }}>
          Everyone
        </h3>
        <div>
          {list.map((p) => (
            <CrewRow key={p.id} profile={p} />
          ))}
          {list.length === 0 && <div style={{ color: "var(--mute)", fontSize: 13, paddingTop: 10 }}>No one yet.</div>}
        </div>
      </section>
    </div>
  );
}
