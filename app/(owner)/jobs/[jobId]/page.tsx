import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/StatCard";
import { Tag } from "@/components/ui/Tag";
import { fmt } from "@/lib/format";
import type { ChangeOrder, Job, JobFinancialSummary } from "@/lib/types/database";

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  const supabase = await createClient();

  const [{ data: job }, { data: summary }, { data: changeOrders }] = await Promise.all([
    supabase.from("jobs").select("*").eq("id", jobId).maybeSingle(),
    supabase.from("job_financial_summary").select("*").eq("job_id", jobId).maybeSingle(),
    supabase.from("change_orders").select("*").eq("job_id", jobId).order("created_at", { ascending: false }),
  ]);

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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard label="Contract value" value={fmt(j.contract_value)} />
        <StatCard label="Billed to date" value={fmt(fin?.total_invoiced ?? 0)} />
        <StatCard label="Outstanding AR" value={fmt(fin?.total_outstanding ?? 0)} color="amber" />
        <StatCard label="Earned value" value={fmt(earnedValue)} hint={`${j.percent_complete}% complete`} />
      </div>

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
                  {c.status.replace("_", " ")}
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
