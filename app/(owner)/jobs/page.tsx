import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { Tag } from "@/components/ui/Tag";
import { fmt } from "@/lib/format";
import type { Job } from "@/lib/types/database";

export default async function JobsPage() {
  if (!isSupabaseConfigured) {
    return <SetupBanner />;
  }

  const supabase = await createClient();
  const { data: jobs } = await supabase.from("jobs").select("*").order("created_at", { ascending: false });
  const jobList = (jobs ?? []) as Job[];

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 16 }}>
        Jobs
      </h1>
      <div style={{ display: "grid", gap: 12 }}>
        {jobList.map((j) => (
          <Link key={j.id} href={`/jobs/${j.id}`} className="cc-card" style={{ display: "block", textDecoration: "none", color: "var(--text)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <b>{j.job_number}</b> · {j.name}
                <div style={{ color: "var(--mute)", fontSize: 12, marginTop: 2 }}>{j.address}</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Tag color={j.status === "active" ? "lime" : j.status === "holdback" ? "amber" : "mute"}>{j.status}</Tag>
                <span className="mono">{fmt(j.contract_value)}</span>
              </div>
            </div>
          </Link>
        ))}
        {jobList.length === 0 && <div className="cc-card" style={{ color: "var(--mute)" }}>No jobs yet.</div>}
      </div>
    </div>
  );
}
