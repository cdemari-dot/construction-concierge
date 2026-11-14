import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { getCurrentUser } from "@/lib/auth/session";
import { FieldApp } from "@/components/field/FieldApp";
import type { Job } from "@/lib/types/database";
import { ensureTodayTalks } from "@/lib/toolbox";

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

  const toolboxTalksByJob = await ensureTodayTalks(supabase, jobList, user.profile.id);

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
