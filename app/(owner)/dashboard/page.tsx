import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { StatCard } from "@/components/ui/StatCard";
import { Tag } from "@/components/ui/Tag";
import { Dial } from "@/components/charts/Dial";
import { buildForecast, firstNegativeWeek } from "@/lib/cashflow/forecast";
import { fmt, fmtTime } from "@/lib/format";
import type { Bill, CashFlowAssumptions, CompanyCashPosition, Invoice, Job, Profile, WhoIsClockedIn } from "@/lib/types/database";

export default async function DashboardPage() {
  if (!isSupabaseConfigured) {
    return (
      <div>
        <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>
          Command
        </h1>
        <SetupBanner />
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: clockedIn }, { data: cashRows }, { data: jobs }, { data: invoiceRows }, { data: billRows }, { data: assumptionRow }, { data: crewRows }] = await Promise.all([
    supabase.from("who_is_clocked_in").select("*").order("clock_in_at", { ascending: false }),
    supabase.from("company_cash_position").select("*").maybeSingle(),
    supabase.from("jobs").select("*").order("created_at", { ascending: false }),
    supabase.from("invoices").select("*"),
    supabase.from("bills").select("*").eq("status", "unpaid"),
    supabase.from("cash_flow_assumptions").select("*").maybeSingle(),
    supabase.from("profiles").select("id").in("role", ["foreman", "worker"]).eq("status", "active"),
  ]);

  const cash = cashRows as CompanyCashPosition | null;
  const crew = (clockedIn ?? []) as WhoIsClockedIn[];
  const jobList = (jobs ?? []) as Job[];

  const invoices = (invoiceRows ?? []) as Invoice[];
  const invoiced = invoices.reduce((s, i) => s + i.total_amount, 0);
  const collected = invoices.filter((i) => i.paid_at).reduce((s, i) => s + i.total_amount, 0);
  const activeJobs = jobList.filter((j) => j.status === "active");
  const avgProgress = activeJobs.length ? activeJobs.reduce((s, j) => s + j.percent_complete, 0) / activeJobs.length : 0;
  const crewTotal = ((crewRows ?? []) as Pick<Profile, "id">[]).length;
  const assumptions = assumptionRow as CashFlowAssumptions | null;
  const negWeek = assumptions
    ? firstNegativeWeek(
        buildForecast(cash?.bank_balance ?? 0, invoices.filter((i) => !i.paid_at), (billRows ?? []) as Bill[], assumptions),
      )
    : null;
  const runwayWeeks = negWeek ?? 13;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 20 }}>
        <h1 className="display" style={{ fontSize: 22 }}>
          Command
        </h1>
        <span className="cc-chip">
          <span className="cc-dot" /> {crew.length} on site now
        </span>
      </div>

      <div className="grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard
          label="Cash on hand"
          value={cash?.bank_balance != null ? fmt(cash.bank_balance) : "—"}
          hint={cash?.as_of_date ? `as of ${cash.as_of_date}` : "no cash snapshot yet"}
        />
        <StatCard label="Open AR" value={fmt(cash?.open_ar ?? 0)} color="lime" hint="invoiced, not yet paid" />
        <StatCard label="Open AP" value={fmt(cash?.open_ap ?? 0)} color="amber" hint="bills unpaid" />
        <StatCard label="Active jobs" value={String(jobList.filter((j) => j.status === "active").length)} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 20 }}>
        <Dial value={runwayWeeks} max={13} label="Cash runway" suffix=" wk" color={runwayWeeks < 6 ? "red" : runwayWeeks < 13 ? "amber" : "lime"} hint={negWeek == null ? "positive all 13 weeks" : `negative in week ${negWeek + 1}`} />
        <Dial value={invoiced > 0 ? (collected / invoiced) * 100 : 0} max={100} label="Collected" suffix="%" color="cyan" hint={invoiced > 0 ? `${fmt(collected)} of ${fmt(invoiced)}` : "no invoices yet"} />
        <Dial value={avgProgress} max={100} label="Job progress" suffix="%" color="lime" hint={`${activeJobs.length} active job${activeJobs.length === 1 ? "" : "s"}`} />
        <Dial value={crew.length} max={Math.max(crewTotal, crew.length, 1)} label="Crew on site" color="amber" hint={`of ${crewTotal} on the roster`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        <section className="cc-card">
          <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>
            Jobs
          </h3>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ color: "var(--mute)", fontSize: 10.5, letterSpacing: 1, textAlign: "left" }}>
                <th style={{ padding: "6px 8px" }}>Job</th>
                <th style={{ padding: "6px 8px" }}>Status</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>Contract</th>
                <th style={{ padding: "6px 8px", textAlign: "right" }}>% Complete</th>
              </tr>
            </thead>
            <tbody>
              {jobList.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "10px 8px", color: "var(--mute)" }}>
                    No jobs yet.
                  </td>
                </tr>
              )}
              {jobList.map((j) => (
                <tr key={j.id} style={{ borderTop: "1px solid var(--line)" }}>
                  <td style={{ padding: "10px 8px" }}>
                    <Link href={`/jobs/${j.id}`} style={{ color: "var(--text)" }}>
                      <b>{j.job_number}</b> {j.name}
                    </Link>
                  </td>
                  <td style={{ padding: "10px 8px" }}>
                    <Tag color={j.status === "active" ? "lime" : j.status === "holdback" ? "amber" : "mute"}>
                      {j.status}
                    </Tag>
                  </td>
                  <td className="mono" style={{ padding: "10px 8px", textAlign: "right" }}>
                    {fmt(j.contract_value)}
                  </td>
                  <td style={{ padding: "10px 8px", minWidth: 90 }}>
                    <div className="cc-bar">
                      <i style={{ width: `${j.percent_complete}%` }} />
                    </div>
                    <div className="mono" style={{ textAlign: "right", fontSize: 11, marginTop: 3 }}>{j.percent_complete}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="cc-card">
          <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>
            Clocked in now
          </h3>
          {crew.length === 0 && <div style={{ color: "var(--mute)", fontSize: 13 }}>Nobody is clocked in.</div>}
          <div style={{ display: "grid", gap: 8 }}>
            {crew.map((c) => (
              <div
                key={c.time_entry_id}
                style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: "1px solid var(--line)", paddingTop: 8 }}
              >
                <div>
                  <b>{c.worker_name}</b>
                  <div style={{ color: "var(--mute)", fontSize: 11.5 }}>{c.job_name}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono">{fmtTime(c.clock_in_at)}</div>
                  {c.geofence_ok === false && <Tag color="amber">off geofence</Tag>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
