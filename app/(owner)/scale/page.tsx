import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { StatCard } from "@/components/ui/StatCard";
import { Dial } from "@/components/charts/Dial";
import { GrowthCalculator } from "@/components/finance/GrowthCalculator";
import { analyseInjection } from "@/lib/cashflow/injection";
import { planScale, type GateStatus } from "@/lib/scale/plan";
import { fmt } from "@/lib/format";
import { DEMO_ASSUMPTIONS, DEMO_BANK, DEMO_BILLS, DEMO_INVOICES } from "@/lib/demo/finance";
import { todayToronto } from "@/lib/today";
import type { Bid, Bill, CashFlowAssumptions, CompanyCashPosition, Invoice, Job, JobFinancialSummary, JobLabourCost } from "@/lib/types/database";

const ICON: Record<GateStatus, string> = { pass: "✅", warn: "⚠️", fail: "⛔" };
const COLOR: Record<GateStatus, string> = { pass: "var(--lime)", warn: "var(--amber)", fail: "var(--red)" };

export default async function ScalePage({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  if (!isSupabaseConfigured) return <SetupBanner />;
  const demo = (await searchParams).demo === "1";
  const supabase = await createClient();
  const [{ data: invRows }, { data: billRows }, { data: jobRows }, { data: cashRow }, { data: aRow }, { data: fin }, { data: labour }, { data: bidRows }, { data: rates }] = await Promise.all([
    supabase.from("invoices").select("*"),
    supabase.from("bills").select("*").eq("status", "unpaid"),
    supabase.from("jobs").select("*"),
    supabase.from("company_cash_position").select("*").maybeSingle(),
    supabase.from("cash_flow_assumptions").select("*").maybeSingle(),
    supabase.from("job_financial_summary").select("*"),
    supabase.from("job_labour_cost").select("*"),
    supabase.from("bids").select("*"),
    supabase.from("pay_rates").select("hourly_rate"),
  ]);
  const a = demo ? DEMO_ASSUMPTIONS : (aRow as CashFlowAssumptions | null);
  if (!a) return <SetupBanner />;

  const invoices = demo ? DEMO_INVOICES : ((invRows ?? []) as Invoice[]);
  const jobs = (jobRows ?? []) as Job[];
  const cash = cashRow as CompanyCashPosition | null;
  const bank = demo ? DEMO_BANK : (cash?.bank_balance ?? 0);
  const today = todayToronto();
  const open = invoices.filter((i) => !i.paid_at);
  const inj = analyseInjection(bank, open, (demo ? DEMO_BILLS : ((billRows ?? []) as Bill[])), a);

  const d90 = new Date(Date.parse(today) - 90 * 86400000).toISOString().slice(0, 10);
  const invoicesLast90 = invoices.filter((i) => i.issued_at >= d90).reduce((s, i) => s + i.subtotal, 0);

  const paid = invoices.filter((i) => i.paid_at);
  const dso = paid.length >= 3 ? paid.reduce((s, i) => s + (Date.parse(i.paid_at as string) - Date.parse(i.issued_at)) / 86400000, 0) / paid.length : null;

  const finRows = (fin ?? []) as JobFinancialSummary[];
  const billed = finRows.reduce((s, r) => s + r.total_invoiced, 0);
  const jobBills = finRows.reduce((s, r) => s + r.total_bills, 0);
  const labourCost = ((labour ?? []) as JobLabourCost[]).reduce((s, r) => s + Number(r.labour_cost), 0);
  const margin = billed > 0 ? (billed - jobBills - labourCost) / billed : null;

  const openAR = open.reduce((s, i) => s + i.total_amount, 0);
  const overdue = open.filter((i) => i.due_at && i.due_at < today).reduce((s, i) => s + i.total_amount, 0);

  const bids = (bidRows ?? []) as Bid[];
  const won = bids.filter((b) => b.stage === "won").length;
  const lost = bids.filter((b) => b.stage === "lost").length;
  const openPipeline = bids.filter((b) => ["lead", "estimating", "submitted"].includes(b.stage)).reduce((s, b) => s + Number(b.value), 0);

  const byClient = new Map<string, number>();
  for (const i of invoices) byClient.set(i.client_id ?? "x", (byClient.get(i.client_id ?? "x") ?? 0) + i.subtotal);
  const totalBilledSub = [...byClient.values()].reduce((s, v) => s + v, 0);
  const topClientShare = totalBilledSub > 0 && invoices.length > 1 ? Math.max(...byClient.values()) / totalBilledSub : null;

  const backlog = finRows.reduce((s, r) => {
    const job = jobs.find((j) => j.id === r.job_id);
    return job && job.status === "active" ? s + Math.max(0, r.contract_value - r.total_invoiced) : s;
  }, 0);

  const rateList = ((rates ?? []) as { hourly_rate: number }[]).map((r) => Number(r.hourly_rate));
  const avgHourlyRate = rateList.length ? rateList.reduce((s, r) => s + r, 0) / rateList.length : null;

  const plan = planScale(
    demo
      ? { bank, a, inj, invoicesLast90: 600000, dso: 52, margin: 0.28, overdueShare: 90000 / 315000, winRate: 0.3, openPipeline: 900000, topClientShare: 0.62, backlog: 400000, avgHourlyRate: 48 }
      : {
          bank,
          a,
          inj,
          invoicesLast90,
          dso,
          margin,
          overdueShare: openAR > 0 ? overdue / openAR : 0,
          winRate: won + lost > 0 ? won / (won + lost) : null,
          openPipeline,
          topClientShare,
          backlog,
          avgHourlyRate,
        },
  );

  const target = a.revenue_target_annual;
  const missing = demo ? [] : [cash?.bank_balance == null ? "your bank balance" : null, a.overhead_monthly <= 0 ? "monthly overhead" : null, a.payroll_per_period <= 0 ? "payroll per run" : null].filter(Boolean) as string[];
  if (missing.length > 0) {
    return (
      <div>
        <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>Grow Safely</h1>
        <p style={{ color: "var(--mute)", fontSize: 13, marginBottom: 16, maxWidth: 720, lineHeight: 1.6 }}>
          A conservative plan to scale without running out of cash, built from your own numbers.
        </p>
        <div className="cc-card cc-in" style={{ marginBottom: 16, borderColor: "rgba(200,164,100,.6)", background: "rgba(200,164,100,.08)" }}>
          <b>🧮 Add your numbers first.</b> Still missing: {missing.join(", ")}. Enter them in <Link href="/finance?tab=settings" style={{ color: "var(--cyan)" }}>Playbook &amp; settings</Link> and this page will show how much you can safely grow, the largest job you can float, and whether you&apos;re ready.
        </div>
        <section className="cc-card cc-in" style={{ "--i": 1 } as React.CSSProperties}>
          <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>The conservative growth ladder</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
            {[
              ["1️⃣", "Fix cash first", "Keep the 13-week forecast above your safety cushion. Never grow into a cash gap."],
              ["2️⃣", "Grow in small steps", "10–15% more revenue per quarter, and only after every readiness check has been green for two months."],
              ["3️⃣", "Hire one crew at a time", "Add a crew when current crews are over 85% booked for six weeks, with 8 weeks of that crew's payroll in cash."],
              ["4️⃣", "Cap job size", "Don't take one job so big that a single bad month could sink you."],
              ["5️⃣", "Fund growth before you need it", "Open a credit line while your numbers look strong, and use it as a bridge, not a crutch."],
              ["6️⃣", "Protect margin and terms", "Price for your target margin and ask for deposits or progress billing."],
            ].map(([e, t, d], i) => (
              <div key={t} className="cc-in" style={{ "--i": i + 2, background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 14, padding: 12 } as React.CSSProperties}>
                <b style={{ fontSize: 14 }}>
                  {e} {t}
                </b>
                <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.55, marginTop: 4 }}>{d}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  const steps = [
    { e: "1️⃣", t: "Fix cash first", d: `Get the 13-week forecast above your ${fmt(inj.buffer)} cushion and keep it there. Never grow into a cash gap.` },
    { e: "2️⃣", t: "Grow in small steps", d: `Add at most 10–15% revenue per quarter (about ${fmt(plan.annualRun * 0.125)} a year at today's pace). Only step up after every check below has stayed green for two months.` },
    { e: "3️⃣", t: "Hire one crew at a time", d: `Add a crew only after your current crews are over 85% booked for six weeks. Keep ${fmt(plan.crewCushion)} in cash to carry a crew of four for 8 weeks before their work pays.` },
    { e: "4️⃣", t: "Cap job size", d: `Don't take a single job bigger than about ${fmt(plan.maxJob)} on your own cash. Big jobs need money up front, and one bad one can sink you.` },
    { e: "5️⃣", t: "Fund growth before you need it", d: "Open a credit line while your numbers look strong. Use it as a bridge for timing, never to cover losses." },
    { e: "6️⃣", t: "Protect margin and cash terms", d: "Price for your target margin, ask for deposits or progress billing, and don't trade payment terms for volume." },
  ];

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>Grow Safely</h1>
      {demo && (
        <div className="cc-card" style={{ marginBottom: 12, borderColor: "rgba(200,164,100,.6)", background: "rgba(200,164,100,.08)", fontSize: 13 }}>
          🧪 <b>Demo data.</b> Sample numbers so you can see the page populated. <Link href="/scale" style={{ color: "var(--cyan)" }}>Switch to your real numbers</Link>
        </div>
      )}
      <p style={{ color: "var(--mute)", fontSize: 13, marginBottom: 16, maxWidth: 720, lineHeight: 1.6 }}>
        A conservative plan to scale without running out of cash. It uses your own numbers and holds back half of your spare cash as a safety margin.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 16 }}>
        <Dial value={plan.passed} max={plan.gates.length} label="Readiness checks" color={plan.ready ? "lime" : plan.passed >= plan.gates.length - 2 ? "amber" : "red"} hint={plan.ready ? "ready to scale" : `${plan.gates.length - plan.passed} to fix first`} />
        <StatCard index={1} label="Safe to add (per year)" value={fmt(plan.safeAddAnnual)} color="lime" hint={`${fmt(plan.safeAddAnnual / 12)} a month, from your own cash`} />
        <StatCard index={2} label="Largest job to float" value={fmt(plan.maxJob)} color="cyan" hint="before first payment lands" />
        <StatCard index={3} label="Revenue run-rate" value={fmt(plan.annualRun)} hint={target > 0 ? `target ${fmt(target)} (${Math.round((plan.annualRun / target) * 100)}%)` : "last 90 days, annualised"} />
      </div>

      {inj.level !== "none" && (
        <div className="cc-card cc-in" style={{ marginBottom: 16, borderColor: "rgba(229,72,77,.5)", background: "rgba(229,72,77,.08)" }}>
          <b style={{ color: "var(--red)" }}>Hold off on growth for now.</b> Your forecast needs about {fmt(inj.needed)} of extra cash by {inj.neededBy}. See{" "}
          <Link href="/finance?tab=coach" style={{ color: "var(--cyan)" }}>Finance coach</Link>.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, marginBottom: 16, alignItems: "start" }}>
        <section className="cc-card cc-in">
          <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>Am I ready? {plan.passed} of {plan.gates.length} green</h3>
          <div style={{ display: "grid", gap: 10 }}>
            {plan.gates.map((g, i) => (
              <div key={g.id} className="cc-in" style={{ "--i": i + 1, display: "flex", gap: 10, borderLeft: `3px solid ${COLOR[g.status]}`, paddingLeft: 10 } as React.CSSProperties}>
                <span style={{ fontSize: 20 }}>{ICON[g.status]}</span>
                <div>
                  <b style={{ fontSize: 13.5 }}>{g.title}</b>
                  <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.55 }}>{g.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
        <GrowthCalculator annualRun={plan.annualRun} usableCash={plan.usableCash} wcPerDollar={plan.wcPerDollar} safeAddAnnual={plan.safeAddAnnual} />
      </div>

      <section className="cc-card cc-in">
        <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>The conservative growth ladder</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12 }}>
          {steps.map((s, i) => (
            <div key={s.t} className="cc-in" style={{ "--i": i, background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 14, padding: 12 } as React.CSSProperties}>
              <b style={{ fontSize: 14 }}>
                {s.e} {s.t}
              </b>
              <div style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.55, marginTop: 4 }}>{s.d}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--mute)" }}>
          Estimates only. Cash tied up per new revenue dollar ≈ {(plan.wcPerDollar * 100).toFixed(1)}¢ (your {Math.round(plan.dso)}-day payment time, your margin, and 10% holdback held ~60 days). Confirm major decisions with your accountant.
        </div>
      </section>
    </div>
  );
}
