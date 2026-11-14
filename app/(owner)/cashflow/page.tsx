import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { buildForecast, firstNegativeWeek } from "@/lib/cashflow/forecast";
import { fmt } from "@/lib/format";
import { addCashSnapshot, updateAssumptions } from "./actions";
import type { Bill, CashFlowAssumptions, CompanyCashPosition, Invoice } from "@/lib/types/database";

export default async function CashflowPage() {
  if (!isSupabaseConfigured) return <SetupBanner />;

  const supabase = await createClient();
  const [{ data: cashRow }, { data: invoices }, { data: bills }, { data: assumptionsRow }] = await Promise.all([
    supabase.from("company_cash_position").select("*").maybeSingle(),
    supabase.from("invoices").select("*").is("paid_at", null),
    supabase.from("bills").select("*").eq("status", "unpaid"),
    supabase.from("cash_flow_assumptions").select("*").maybeSingle(),
  ]);

  const cash = cashRow as CompanyCashPosition | null;
  const assumptions = assumptionsRow as CashFlowAssumptions | null;

  if (!assumptions) {
    return <SetupBanner />;
  }

  const buckets = buildForecast(cash?.bank_balance ?? 0, (invoices ?? []) as Invoice[], (bills ?? []) as Bill[], assumptions);
  const negWeek = firstNegativeWeek(buckets);
  const weeklyRevenueAvg = buckets.reduce((s, b) => s + b.inflows, 0) / buckets.length;

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>
        13-Week Cash Flow
      </h1>
      <p style={{ color: "var(--mute)", fontSize: 13, marginBottom: 16 }}>
        Starting from your last cash snapshot, projected forward using open invoices, unpaid bills, and payroll/overhead run rate.
      </p>

      {negWeek !== null && (
        <div className="cc-card" style={{ borderColor: "rgba(229,72,77,.5)", background: "rgba(229,72,77,.08)", marginBottom: 16 }}>
          <b style={{ color: "var(--red)" }}>Cash goes negative in week {negWeek + 1}</b> ({buckets[negWeek].weekStart}) — projected
          balance {fmt(buckets[negWeek].endingBalance)}.
        </div>
      )}

      <section className="cc-card" style={{ marginBottom: 16 }}>
        <CashFlowChart buckets={buckets} payrollLine={assumptions.payroll_frequency === "weekly" ? assumptions.payroll_per_period : assumptions.payroll_per_period / 2} />
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section className="cc-card">
          <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>
            CFO playbook — where every dollar goes
          </h3>
          <p style={{ fontSize: 12.5, color: "var(--text2)", marginBottom: 10 }}>
            On an average week of {fmt(weeklyRevenueAvg)} collected, set aside:
          </p>
          <ReserveLine label="HST" pct={assumptions.hst_reserve_pct} weekly={weeklyRevenueAvg} />
          <ReserveLine label="Income tax" pct={assumptions.tax_reserve_pct} weekly={weeklyRevenueAvg} />
          <ReserveLine label="Equipment reserve" pct={assumptions.equipment_reserve_pct} weekly={weeklyRevenueAvg} />
          <ReserveLine label="Profit (pay yourself)" pct={assumptions.profit_allocation_pct} weekly={weeklyRevenueAvg} />

          <form action={updateAssumptions} style={{ display: "grid", gap: 10, marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
            <AssumptionGrid assumptions={assumptions} />
            <button className="cc-btn lime sm" type="submit" style={{ justifySelf: "start" }}>
              Save assumptions
            </button>
          </form>
        </section>

        <section className="cc-card">
          <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>
            Add this week&apos;s bank balance
          </h3>
          <form action={addCashSnapshot} style={{ display: "grid", gap: 10 }}>
            <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
              As of
              <input type="date" name="as_of_date" defaultValue={new Date().toISOString().slice(0, 10)} style={inputStyle} />
            </label>
            <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
              Bank balance (CAD)
              <input type="number" name="bank_balance" step="0.01" defaultValue={cash?.bank_balance ?? ""} style={inputStyle} />
            </label>
            <button className="cc-btn lime sm" type="submit" style={{ justifySelf: "start" }}>
              Save snapshot
            </button>
          </form>

          <div style={{ marginTop: 18, fontSize: 12.5, color: "var(--mute)" }}>
            Last snapshot: {cash?.as_of_date ?? "none yet"} · {fmt(cash?.bank_balance ?? 0)}
          </div>
        </section>
      </div>
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

function ReserveLine({ label, pct, weekly }: { label: string; pct: number; weekly: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "5px 0" }}>
      <span>
        {label} <span style={{ color: "var(--mute)" }}>({pct}%)</span>
      </span>
      <span className="mono">{fmt((weekly * pct) / 100)}/wk</span>
    </div>
  );
}

function AssumptionGrid({ assumptions }: { assumptions: CashFlowAssumptions }) {
  const fields: [string, number, string][] = [
    ["overhead_monthly", assumptions.overhead_monthly, "Overhead / month"],
    ["payroll_per_period", assumptions.payroll_per_period, "Payroll / period"],
    ["hst_reserve_pct", assumptions.hst_reserve_pct, "HST reserve %"],
    ["tax_reserve_pct", assumptions.tax_reserve_pct, "Tax reserve %"],
    ["equipment_reserve_pct", assumptions.equipment_reserve_pct, "Equipment reserve %"],
    ["profit_allocation_pct", assumptions.profit_allocation_pct, "Profit %"],
    ["revenue_target_annual", assumptions.revenue_target_annual, "Annual revenue target"],
    ["gross_margin_target", assumptions.gross_margin_target, "Gross margin target %"],
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {fields.map(([name, value, label]) => (
        <label key={name} style={{ fontSize: 11.5, color: "var(--mute)", display: "grid", gap: 4 }}>
          {label}
          <input name={name} type="number" step="0.01" defaultValue={value} style={inputStyle} />
        </label>
      ))}
      <label style={{ fontSize: 11.5, color: "var(--mute)", display: "grid", gap: 4 }}>
        Payroll frequency
        <select name="payroll_frequency" defaultValue={assumptions.payroll_frequency} style={inputStyle}>
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
        </select>
      </label>
    </div>
  );
}
