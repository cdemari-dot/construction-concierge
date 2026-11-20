import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/StatCard";
import { Tag } from "@/components/ui/Tag";
import { fmt } from "@/lib/format";
import { JobBudgetForm } from "@/components/jobs/JobBudgetForm";
import { JobPmSelect } from "@/components/jobs/JobPmSelect";
import type { ChangeOrder, Job, JobFinancialSummary, Profile } from "@/lib/types/database";

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();

  const [{ data: job }, { data: summary }, { data: changeOrders }, { data: pms }, { data: budget }, { data: alloc }] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", jobId).maybeSingle(),
    supabase.from("job_financial_summary").select("*").eq("job_id", jobId).maybeSingle(),
    supabase.from("change_orders").select("*").eq("job_id", jobId).order("created_at", { ascending: false }),
    supabase.from("profiles").select("*").in("role", ["pm", "owner"]).eq("status", "active"),
    supabase.from("job_budgets").select("*").eq("job_id", jobId).maybeSingle(),
    supabase.rpc("job_allocation", { p_job: jobId }),
  ]);
  const pmOptions = ((pms ?? []) as Profile[]).filter((p) => p.email).map((p) => ({ id: p.id, label: `${p.full_name} (${p.email})` }));

  if (!job) notFound();

  const j = job as Job;
  const fin = summary as JobFinancialSummary | null;
  const cos = (changeOrders ?? []) as ChangeOrder[];
  const earnedValue = j.contract_value * (j.percent_complete / 100) + (fin?.approved_change_orders ?? 0);

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22 }}>
        {j.job_number} · {j.name}
      </h1>
      <div style={{ color: "var(--mute)", fontSize: 13, marginBottom: 18 }}>{j.address}</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard label="Contract value" value={fmt(j.contract_value)} />
        <StatCard label="Billed to date" value={fmt(fin?.total_invoiced ?? 0)} />
        <StatCard label="Outstanding AR" value={fmt(fin?.total_outstanding ?? 0)} color="amber" />
        <StatCard label="Earned value" value={fmt(earnedValue)} hint={`${j.percent_complete}% complete`} />
      </div>

      <JobPmSelect jobId={j.id} current={j.pm_id} options={pmOptions} />

      <JobBudgetForm
        jobId={j.id}
        initial={{ budget_hours: budget?.budget_hours ?? null, hours_pct: budget?.hours_pct ?? 100, budget_bins: budget?.budget_bins ?? null, bins_pct: budget?.bins_pct ?? 100 }}
        hoursUsed={(alloc as { hours_used?: number } | null)?.hours_used ?? 0}
        binsUsed={(alloc as { bins_used?: number } | null)?.bins_used ?? 0}
      />

      <section className="cc-card">
        <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>
          Change orders
        </h3>
        {cos.length === 0 && <div style={{ color: "var(--mute)", fontSize: 13 }}>None yet.</div>}
        <div style={{ display: "grid", gap: 8 }}>
          {cos.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 8, fontSize: 13 }}>
              <div>{c.description}</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Tag
                  color={
                    c.status === "approved" ? "lime" : c.status === "disputed" || c.status === "rejected" ? "red" : "amber"
                  }
                >
                  {c.status.replaceAll("_", " ")}
                </Tag>
                <span className="mono">{fmt(c.amount)}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
