import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { KioskApp } from "@/components/kiosk/KioskApp";
import type { Job } from "@/lib/types/database";
import { ensureTodayTalks } from "@/lib/toolbox";
import { getCurrentUser } from "@/lib/auth/session";

export default async function KioskPage({ params }: { params: Promise<{ jobId: string }> }) {
  if (!isSupabaseConfigured) return <SetupBanner />;

  const { jobId } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
  if (!job) notFound();

  const user = await getCurrentUser();
  const talks = await ensureTodayTalks(supabase, [{ id: jobId, company_id: (job as Job).company_id }], user?.profile.id ?? "");

  const j = job as Job;
  const toolboxTalk = talks[jobId];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "center", marginBottom: 8 }}>
        <span className="cc-chip">
          <span className="cc-dot" /> {j.job_number} · {j.name}
        </span>
      </div>
      <KioskApp
        job={{
          id: j.id,
          company_id: j.company_id,
          job_number: j.job_number,
          name: j.name,
          geofence_lat: j.geofence_lat,
          geofence_lon: j.geofence_lon,
          geofence_radius_m: j.geofence_radius_m,
        }}
        toolboxTalk={toolboxTalk}
      />
      <p style={{ textAlign: "center", color: "var(--mute)", fontSize: 11, marginTop: 10 }}>
        🔒 No names on screen beyond a first name after PIN entry. Each punch is tied to a PIN, a photo, GPS and time.
      </p>
    </div>
  );
}
