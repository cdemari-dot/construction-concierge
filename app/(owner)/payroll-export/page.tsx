import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { GenerateCsvButton } from "@/components/dashboard/GenerateCsvButton";
import { approveHours } from "./actions";
import type { PayrollExportBatch } from "@/lib/types/database";

function lastWeekRange() {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default async function PayrollExportPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string; end?: string }>;
}) {
  if (!isSupabaseConfigured) return <SetupBanner />;

  const params = await searchParams;
  const defaults = lastWeekRange();
  const periodStart = params.start ?? defaults.start;
  const periodEnd = params.end ?? defaults.end;

  const supabase = await createClient();
  const [{ count: pendingCount }, { count: approvedCount }, { data: batches }] = await Promise.all([
    supabase
      .from("time_entries")
      .select("id", { count: "exact", head: true })
      .eq("payroll_status", "pending")
      .not("clock_out_at", "is", null)
      .gte("clock_in_at", periodStart)
      .lt("clock_in_at", periodEnd),
    supabase
      .from("time_entries")
      .select("id", { count: "exact", head: true })
      .eq("payroll_status", "approved")
      .gte("clock_in_at", periodStart)
      .lt("clock_in_at", periodEnd),
    supabase.from("payroll_export_batches").select("*").order("generated_at", { ascending: false }).limit(10),
  ]);

  const approveWithPeriod = approveHours.bind(null, periodStart, periodEnd);
  const pastBatches = (batches ?? []) as PayrollExportBatch[];

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>
        Payroll Export
      </h1>
      <p style={{ color: "var(--mute)", fontSize: 13, marginBottom: 16 }}>
        We never run payroll — this exports approved hours as a CSV for your payroll provider.
      </p>

      <section className="cc-card" style={{ marginBottom: 16 }}>
        <form method="get" style={{ display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
            Period start
            <input type="date" name="start" defaultValue={periodStart} style={inputStyle} />
          </label>
          <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
            Period end
            <input type="date" name="end" defaultValue={periodEnd} style={inputStyle} />
          </label>
          <button className="cc-btn ghost sm" type="submit">
            Update period
          </button>
        </form>

        <div style={{ display: "flex", gap: 24, marginTop: 16, fontSize: 13 }}>
          <div>
            <b className="mono">{pendingCount ?? 0}</b> <span style={{ color: "var(--mute)" }}>shifts awaiting approval</span>
          </div>
          <div>
            <b className="mono">{approvedCount ?? 0}</b> <span style={{ color: "var(--mute)" }}>approved, ready to export</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <form action={approveWithPeriod}>
            <button className="cc-btn sm" type="submit" disabled={!pendingCount}>
              Approve all pending shifts in this period
            </button>
          </form>
          <GenerateCsvButton periodStart={periodStart} periodEnd={periodEnd} />
        </div>
      </section>

      <section className="cc-card">
        <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>
          Past exports
        </h3>
        <div style={{ display: "grid", gap: 8 }}>
          {pastBatches.map((b) => (
            <div key={b.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
              <span>
                {b.period_start} → {b.period_end}
              </span>
              <span className="mono">{b.total_hours.toFixed(1)} hrs</span>
            </div>
          ))}
          {pastBatches.length === 0 && <div style={{ color: "var(--mute)", fontSize: 13 }}>No exports yet.</div>}
        </div>
      </section>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line2)",
  borderRadius: 10,
  color: "var(--text)",
  padding: "9px 10px",
  fontSize: 14,
};
