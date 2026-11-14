import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { getCurrentUser } from "@/lib/auth/session";
import { FieldApp } from "@/components/field/FieldApp";
import type { Job, ToolboxTalk } from "@/lib/types/database";
import { todayToronto } from "@/lib/today";

// Some profiles store an email as the name; show "Chris", not "chris@demstos.com".
function friendlyFirstName(fullName: string): string {
  const first = fullName.split("@")[0].split(/[\s._-]+/)[0] || "there";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export default async function FieldMobilePage() {
  if (!isSupabaseConfigured) return <SetupBanner />;

  const user = await getCurrentUser();
  if (!user) return <SetupBanner />;

  const supabase = await createClient();
  const { data: jobs } = await supabase.from("jobs").select("*").eq("status", "active").order("job_number");
  const jobList = (jobs ?? []) as Job[];

  const today = todayToronto();
  const { data: talks } = await supabase
    .from("toolbox_talks")
    .select("*")
    .in("job_id", jobList.map((j) => j.id))
    .eq("talk_date", today);

  const toolboxTalksByJob: Record<string, { id: string; title: string; body: string } | null> = {};
  for (const j of jobList) toolboxTalksByJob[j.id] = null;
  for (const t of (talks ?? []) as ToolboxTalk[]) {
    toolboxTalksByJob[t.job_id] = { id: t.id, title: t.title, body: t.body };
  }

  return (
    <div>
      <FieldApp
        jobs={jobList.map((j) => ({
          id: j.id,
          company_id: j.company_id,
          job_number: j.job_number,
          name: j.name,
          geofence_lat: j.geofence_lat,
          geofence_lon: j.geofence_lon,
          geofence_radius_m: j.geofence_radius_m,
        }))}
        currentProfileId={user.profile.id}
        firstName={friendlyFirstName(user.profile.full_name)}
        toolboxTalksByJob={toolboxTalksByJob}
      />
    </div>
  );
}
