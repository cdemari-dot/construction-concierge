import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { Tag } from "@/components/ui/Tag";
import { StatCard } from "@/components/ui/StatCard";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { InjectionCard } from "@/components/finance/InjectionCard";
import { CoachPanel } from "@/components/finance/CoachPanel";
import { AffordPanel } from "@/components/finance/AffordPanel";
import { marginActual, revenueActual } from "@/lib/afford/plan";
import { AddBillForm, AddInvoiceForm, MarkBillPaidButton, MarkInvoicePaidButton } from "@/components/dashboard/FinanceForms";
import { analyseInjection } from "@/lib/cashflow/injection";
import { coachFinance, monthlyPayroll } from "@/lib/coach/finance";
import { fmt, fmtDate } from "@/lib/format";
import { todayToronto } from "@/lib/today";
import { DEMO_ASSUMPTIONS, DEMO_BANK, DEMO_BILLS, DEMO_CLIENT_NAMES, DEMO_INVOICES } from "@/lib/demo/finance";
import { addCashSnapshot, updateAssumptions } from "@/app/(owner)/cashflow/actions";
import type { Bill, CashFlowAssumptions, Client, CompanyCashPosition, Invoice, Job } from "@/lib/types/database";

const TABS = [
  { key: "forecast", label: "📈 13-week forecast" },
  { key: "coach", label: "🧠 Finance coach" },
  { key: "afford", label: "🏢 What you can afford" },
  { key: "invoices", label: "🧾 Invoices & bills" },
  { key: "settings", label: "⚙️ Playbook & settings" },
] as const;

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ tab?: string; demo?: string }> }) {
  if (!isSupabaseConfigured) return <SetupBanner />;
  const sp = await searchParams;
  const tab = sp.tab ?? "forecast";
  const demo = sp.demo === "1";

  const supabase = await createClient();
  const [{ data: invoices }, { data: bills }, { data: jobs }, { data: cashRow }, { data: assumptionsRow }, { data: clients }] = await Promise.all([
    supabase.from("invoices").select("*").order("issued_at", { ascending: false }),
    supabase.from("bills").select("*").order("due_date", { ascending: true }),
    supabase.from("jobs").select("*").order("job_number"),
    supabase.from("company_cash_position").select("*").maybeSingle(),
    supabase.from("cash_flow_assumptions").select("*").maybeSingle(),
    supabase.from("clients").select("id, name"),
  ]);

  const invoiceList = (invoices ?? []) as Invoice[];
  const billList = (bills ?? []) as Bill[];
  const jobList = (jobs ?? []) as Job[];
  const cash = cashRow as CompanyCashPosition | null;
  const a = demo ? DEMO_ASSUMPTIONS : (assumptionsRow as CashFlowAssumptions | null);
  const openInvoices = demo ? DEMO_INVOICES : invoiceList.filter((i) => !i.paid_at);
  const unpaidBills = demo ? DEMO_BILLS : billList.filter((b) => b.status === "unpaid");
  const bankNow = demo ? DEMO_BANK : (cash?.bank_balance ?? null);

  const header = (
    <div style={{ marginBottom: 16 }}>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 12 }}>
        Finance &amp; Cash
      </h1>
      {demo && (
        <div className="cc-card" style={{ marginBottom: 12, borderColor: "rgba(200,164,100,.6)", background: "rgba(200,164,100,.08)", fontSize: 13 }}>
          🧪 <b>Demo data.</b> These are sample numbers so you can see the page populated. <Link href={`/finance?tab=${tab}`} style={{ color: "var(--cyan)" }}>Switch to your real numbers</Link>
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <Link key={t.key} href={`/finance?tab=${t.key}${demo ? "&demo=1" : ""}`} className={`cc-btn sm ${tab === t.key ? "" : "ghost"}`}>
            {t.label}
          </Link>
        ))}
      </div>
    </div>
  );

  // Invoices & bills work even before cash assumptions are set up.
  if (tab === "invoices" || !a) {
    return (
      <div>
        {header}
        {!a && tab !== "invoices" && <SetupBanner />}
        <InvoicesAndBills invoiceList={invoiceList} billList={billList} jobList={jobList} />
      </div>
    );
  }

  const inj = analyseInjection(bankNow ?? 0, openInvoices, unpaidBills, a);
  const clientNames: Record<string, string> = demo ? DEMO_CLIENT_NAMES : Object.fromEntries(((clients ?? []) as Pick<Client, "id" | "name">[]).map((c) => [c.id, c.name]));
  const missing = [
    bankNow == null ? "your bank balance" : null,
    a.overhead_monthly <= 0 ? "monthly overhead" : null,
    a.payroll_per_period <= 0 ? "payroll per run" : null,
  ].filter(Boolean) as string[];
  const weeklyRevenueAvg = inj.buckets.reduce((s, b) => s + b.inflows, 0) / inj.buckets.length;

  if (tab === "coach" && missing.length > 0) {
    return (
      <div>
        {header}
        <InjectionCard inj={inj} missing={missing} />
        <section className="cc-card cc-in" style={{ "--i": 1 } as React.CSSProperties}>
          <h3 style={h3}>What your finance coach will do once it has your numbers</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
            {[
              ["🩺", "Cash health score", "One number for how safe your cash is, and why."],
              ["🗓️", "Friday savings routine", "Exactly how much to move into HST, tax, equipment, profit and cushion each week."],
              ["🚨", "Cash injection warning", "If and when you'll need extra cash, how much, and the cheapest way to get it."],
              ["📞", "Who to call today", "Overdue invoices and bills coming due, in the order to tackle them."],
            ].map(([e, t, d], i) => (
              <div key={t} className="cc-in" style={{ "--i": i + 2, background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 14, padding: 12 } as React.CSSProperties}>
                <b>
                  {e} {t}
                </b>
                <div style={{ fontSize: 12.5, color: "var(--mute)", marginTop: 4, lineHeight: 1.55 }}>{d}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (tab === "coach") {
    const coach = coachFinance({ bank: bankNow, snapshotDate: cash?.as_of_date ?? null, invoices: openInvoices, bills: unpaidBills, clientNames, a, inj, today: todayToronto() });
    return (
      <div>
        {header}
        <InjectionCard inj={inj} missing={missing} />
        <CoachPanel coach={coach} />
      </div>
    );
  }

  if (tab === "afford") {
    const labourRows = demo ? [] : (((await supabase.from("job_labour_cost").select("job_id, labour_cost")).data ?? []) as { job_id: string; labour_cost: number }[]);
    const labourByJob = Object.fromEntries(labourRows.map((l) => [l.job_id, Number(l.labour_cost ?? 0)]));
    const revenue = demo ? { annual: null, trailing: 0, months: 0, reliable: false, note: "Sample numbers." } : revenueActual(invoiceList, todayToronto());
    const margin = demo ? { pct: null, jobs: 0, billed: 0, labourSource: "none" as const, codedCostPct: 0, reliable: false, note: "Sample numbers." } : marginActual({ invoices: invoiceList, bills: billList, labourByJob, payrollEstimate: monthlyPayroll(a) * revenue.months });
    const nothing = revenue.annual == null && !(a.revenue_target_annual > 0);
    return (
      <div>
        {header}
        <p style={{ color: "var(--mute)", fontSize: 13, marginBottom: 16, maxWidth: 760, lineHeight: 1.6 }}>
          How much you can spend on rent, vehicles, insurance and staff and still keep the profit you are aiming for. It starts from your real billing and real job margin, and you can switch any line to your target or move the sliders to test a bigger or smaller year.
        </p>
        {nothing ? (
          <div className="cc-card cc-in" style={{ borderColor: "rgba(200,164,100,.6)", background: "rgba(200,164,100,.08)" }}>
            <b>🧮 Add your yearly revenue first.</b> You have no invoices in the last 12 months and no revenue target. Add invoices, or set a target in <Link href="/finance?tab=settings" style={{ color: "var(--cyan)" }}>Playbook &amp; settings</Link> (also check your gross margin target and profit %), or look at the <Link href="/finance?tab=afford&demo=1" style={{ color: "var(--cyan)" }}>sample numbers</Link>.
          </div>
        ) : (
          <AffordPanel a={a} revenue={revenue} margin={margin} demo={demo} />
        )}
      </div>
    );
  }

  if (tab === "settings") {
    return (
      <div>
        {header}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <section className="cc-card cc-in">
            <h3 style={h3}>CFO playbook: where every dollar goes</h3>
            <p style={{ fontSize: 12.5, color: "var(--text2)", marginBottom: 10 }}>On an average week of {fmt(weeklyRevenueAvg)} collected, set aside:</p>
            <ReserveLine label="HST" pct={a.hst_reserve_pct} weekly={weeklyRevenueAvg} />
            <ReserveLine label="Income tax" pct={a.tax_reserve_pct} weekly={weeklyRevenueAvg} />
            <ReserveLine label="Equipment reserve" pct={a.equipment_reserve_pct} weekly={weeklyRevenueAvg} />
            <ReserveLine label="Profit (pay yourself)" pct={a.profit_allocation_pct} weekly={weeklyRevenueAvg} />
            <form action={updateAssumptions} style={{ display: "grid", gap: 10, marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <AssumptionGrid assumptions={a} />
              <button className="cc-btn lime sm" type="submit" style={{ justifySelf: "start" }}>
                Save assumptions
              </button>
            </form>
          </section>
          <section className="cc-card cc-in" style={{ "--i": 1 } as React.CSSProperties}>
            <h3 style={h3}>Add this week&apos;s bank balance</h3>
            <form action={addCashSnapshot} style={{ display: "grid", gap: 10 }}>
              <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
                As of
                <input type="date" name="as_of_date" defaultValue={todayToronto()} style={inputStyle} />
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

  // default: forecast
  return (
    <div>
      {header}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 16 }}>
        <StatCard index={0} label="Cash on hand" value={bankNow != null ? fmt(bankNow) : "—"} hint={cash?.as_of_date ? `as of ${cash.as_of_date}` : "add a bank balance in Settings"} />
        <StatCard index={1} label="Open AR" value={fmt(demo ? openInvoices.reduce((t, i) => t + i.total_amount, 0) : (cash?.open_ar ?? 0))} color="lime" hint="invoiced, not yet paid" />
        <StatCard index={2} label="Open AP" value={fmt(demo ? unpaidBills.reduce((t, b) => t + b.amount, 0) : (cash?.open_ap ?? 0))} color="amber" hint="bills unpaid" />
        <StatCard index={3} label="Lowest point (13 wk)" value={fmt(inj.minBalance)} color={inj.minBalance < 0 ? "red" : inj.minBalance < inj.buffer ? "amber" : "cyan"} hint={`week ${inj.minWeek + 1}`} />
      </div>
      <InjectionCard inj={inj} missing={missing} />
      <section className="cc-card cc-in" style={{ marginBottom: 16, "--i": 3 } as React.CSSProperties}>
        <CashFlowChart buckets={inj.buckets} payrollLine={a.payroll_frequency === "weekly" ? a.payroll_per_period : a.payroll_per_period / 2} />
      </section>
      <p style={{ color: "var(--mute)", fontSize: 12.5 }}>
        Starting from your last cash snapshot, projected forward using open invoices (paid on their due date), unpaid bills, and your payroll and overhead run rate. For a plan to build savings, open the <Link href="/finance?tab=coach" style={{ color: "var(--cyan)" }}>Finance coach</Link>.
      </p>
    </div>
  );
}

function InvoicesAndBills({ invoiceList, billList, jobList }: { invoiceList: Invoice[]; billList: Bill[]; jobList: Job[] }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
      <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
        <AddInvoiceForm jobs={jobList} />
        <section className="cc-card cc-in">
          <h3 style={h3}>Accounts receivable</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {invoiceList.map((inv, i) => (
              <div key={inv.id} className="cc-in" style={{ "--i": i, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: 8, fontSize: 13 } as React.CSSProperties}>
                <div>
                  <b>{inv.invoice_number}</b>
                  <div style={{ color: "var(--mute)", fontSize: 11.5 }}>due {fmtDate(inv.due_at)}</div>
                </div>
                <div style={{ textAlign: "right", display: "flex", gap: 8, alignItems: "center" }}>
                  <div>
                    <div className="mono">{fmt(inv.total_amount)}</div>
                    <Tag color={inv.status === "paid" ? "lime" : inv.status === "overdue" ? "red" : "amber"}>{inv.status}</Tag>
                  </div>
                  {inv.status !== "paid" && <MarkInvoicePaidButton invoiceId={inv.id} />}
                </div>
              </div>
            ))}
            {invoiceList.length === 0 && <div style={{ color: "var(--mute)", fontSize: 13 }}>No invoices yet.</div>}
          </div>
        </section>
      </div>

      <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
        <AddBillForm jobs={jobList} />
        <section className="cc-card cc-in" style={{ "--i": 1 } as React.CSSProperties}>
          <h3 style={h3}>Accounts payable</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {billList.map((b, i) => (
              <div key={b.id} className="cc-in" style={{ "--i": i, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: 8, fontSize: 13 } as React.CSSProperties}>
                <div>
                  <b>{b.vendor_name}</b>
                  <div style={{ color: "var(--mute)", fontSize: 11.5 }}>due {fmtDate(b.due_date)}</div>
                </div>
                <div style={{ textAlign: "right", display: "flex", gap: 8, alignItems: "center" }}>
                  <div>
                    <div className="mono">{fmt(b.amount)}</div>
                    <Tag color={b.status === "paid" ? "lime" : "amber"}>{b.status}</Tag>
                  </div>
                  {b.status !== "paid" && <MarkBillPaidButton billId={b.id} />}
                </div>
              </div>
            ))}
            {billList.length === 0 && <div style={{ color: "var(--mute)", fontSize: 13 }}>No bills yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

const h3: React.CSSProperties = { fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 };

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
