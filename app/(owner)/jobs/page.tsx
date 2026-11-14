import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { JobsGlobe, type JobCard } from "@/components/jobs/JobsGlobe";
import type { Job, JobFinancialSummary, JobLabourCost, WhoIsClockedIn } from "@/lib/types/database";

export default async function JobsPage() {
  if (!isSupabaseConfigured) {
    return <SetupBanner />;
  }

  const supabase = await createClient();
  const [{ data: jobs }, { data: summaries }, { data: clocked }, { data: labour }] = await Promise.all([
    supabase.from("jobs").select("*").order("created_at", { ascending: false }),
    supabase.from("job_financial_summary").select("*"),
    supabase.from("who_is_clocked_in").select("job_id"),
    supabase.from("job_labour_cost").select("*"),
  ]);
  const labourByJob = new Map(((labour ?? []) as JobLabourCost[]).map((l) => [l.job_id, l]));

  const summaryByJob = new Map(((summaries ?? []) as JobFinancialSummary[]).map((s) => [s.job_id, s]));
  const onSite = new Map<string, number>();
  for (const c of (clocked ?? []) as Pick<WhoIsClockedIn, "job_id">[]) onSite.set(c.job_id, (onSite.get(c.job_id) ?? 0) + 1);

  const cards: JobCard[] = ((jobs ?? []) as Job[]).map((j) => {
    const s = summaryByJob.get(j.id);
    const billed = s?.total_invoiced ?? 0;
    const bills = s?.total_bills ?? 0;
    const l = labourByJob.get(j.id);
    const labourCost = Number(l?.labour_cost ?? 0);
    return {
      id: j.id,
      jobNumber: j.job_number,
      name: j.name,
      address: j.address,
      lat: j.geofence_lat,
      lon: j.geofence_lon,
      status: j.status,
      contract: j.contract_value,
      pct: j.percent_complete,
      billed,
      outstanding: s?.total_outstanding ?? 0,
      labourCost,
      labourHours: Number(l?.hours ?? 0),
      unratedShifts: Number(l?.unrated_shifts ?? 0),
      margin: billed > 0 ? (billed - bills - labourCost) / billed : null,
      onSite: onSite.get(j.id) ?? 0,
    };
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <h1 className="display" style={{ fontSize: 22 }}>
          Jobs
        </h1>
        <Link href="/jobs/new" className="cc-btn lime">
          + New job
        </Link>
      </div>
      <p style={{ color: "var(--mute)", fontSize: 12.5, marginBottom: 16 }}>
        Margin = (billed − bills coded to the job − labour cost) ÷ billed. Labour = completed shift hours × each person&apos;s hourly cost (set on the Team page).
      </p>
      <JobsGlobe jobs={cards} />
    </div>
  );
}
