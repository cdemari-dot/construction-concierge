import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { KioskAutoOpen } from "@/components/kiosk/KioskSiteMemory";
import type { Job } from "@/lib/types/database";

// Crew Punch start screen: pick this iPad's site once; it opens straight to the PIN pad after that.
export default async function KioskHome() {
  if (!isSupabaseConfigured) return <SetupBanner />;
  const supabase = await createClient();
  const { data } = await supabase.from("jobs").select("*").eq("status", "active").order("job_number");
  const jobs = (data ?? []) as Job[];

  return (
    <div style={{ maxWidth: 480, margin: "40px auto" }}>
      <KioskAutoOpen validJobIds={jobs.map((j) => j.id)} />
      <div className="display" style={{ fontSize: 26, marginBottom: 4 }}>
        Crew Punch
      </div>
      <p style={{ color: "var(--mute)", fontSize: 14, marginBottom: 18 }}>Which site is this iPad at? You only set this once.</p>
      {jobs.map((j, i) => (
        <Link key={j.id} href={`/kiosk/${j.id}`} className="cc-card cc-in" style={{ display: "block", marginBottom: 10, "--i": i } as React.CSSProperties}>
          <b>{j.name}</b>
          <div style={{ color: "var(--mute)", fontSize: 12.5 }}>
            {j.job_number}
            {j.address ? ` · ${j.address}` : ""}
          </div>
        </Link>
      ))}
      {jobs.length === 0 && <div className="cc-card" style={{ color: "var(--mute)" }}>No active sites yet. Ask the office.</div>}
    </div>
  );
}
