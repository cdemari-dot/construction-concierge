import { monthlyPayroll } from "@/lib/coach/finance";
import { safetyBuffer, type InjectionResult } from "@/lib/cashflow/injection";
import { fmt } from "@/lib/format";
import type { CashFlowAssumptions } from "@/lib/types/database";

export type GateStatus = "pass" | "warn" | "fail";

export interface Gate {
  id: string;
  status: GateStatus;
  title: string;
  detail: string;
}

export interface ScalePlan {
  gates: Gate[];
  passed: number;
  ready: boolean; // every gate passes
  annualRun: number; // revenue run-rate from the last 90 days of invoices
  usableCash: number; // half of the cash above the cushion: what growth may use
  wcPerDollar: number; // working capital tied up per $1 of new annual revenue
  safeAddAnnual: number;
  maxJob: number;
  dso: number;
  crewCushion: number; // cost to carry one new crew of 4 for 8 weeks
}

const HOLDBACK_DAYS = 60; // Ontario holdback (10%) is typically released ~45-60 days after completion

export function planScale(input: {
  bank: number;
  a: CashFlowAssumptions;
  inj: InjectionResult;
  invoicesLast90: number; // sum of invoice subtotals issued in the last 90 days
  dso: number | null; // average days from invoice to payment
  margin: number | null; // actual gross margin 0..1 on billed work
  overdueShare: number; // 0..1 of open AR
  winRate: number | null; // 0..1
  openPipeline: number;
  topClientShare: number | null; // 0..1 of billed revenue
  backlog: number; // contract value not yet billed on active jobs
  avgHourlyRate: number | null;
}): ScalePlan {
  const { bank, a, inj } = input;
  const buffer = safetyBuffer(a);
  const dso = input.dso ?? 45;
  const marginUsed = input.margin ?? (a.gross_margin_target > 0 ? a.gross_margin_target / 100 : 0.25);
  const annualRun = input.invoicesLast90 * (365 / 90);
  const monthlyFixed = a.overhead_monthly + monthlyPayroll(a);

  const wcPerDollar = (1 - Math.min(0.9, Math.max(0, marginUsed))) * (dso / 365) + 0.1 * (HOLDBACK_DAYS / 365);
  const usableCash = Math.max(0, bank - buffer) * 0.5;
  const safeAddAnnual = wcPerDollar > 0 ? usableCash / wcPerDollar : 0;
  const maxJob = usableCash / 0.3; // front-loading: ~30% of a contract is spent before the first cheque

  const crewHours = 4 * 40 * 8;
  const crewCushion = crewHours * (input.avgHourlyRate ?? Math.max(30, a.payroll_per_period / Math.max(1, 10 * 40)));

  const gates: Gate[] = [];
  const g = (id: string, status: GateStatus, title: string, detail: string) => gates.push({ id, status, title, detail });

  // 1 forecast health
  g("forecast", inj.level === "none" ? "pass" : inj.level === "watch" ? "warn" : "fail", "13-week cash stays above the cushion",
    inj.level === "none" ? `Lowest projected balance is ${fmt(inj.minBalance)}, above the ${fmt(buffer)} cushion.` : `Lowest projected balance is ${fmt(inj.minBalance)}. Fix the dip (${fmt(inj.needed)} short) before adding work. Growth makes cash gaps bigger, not smaller.`);

  // 2 cash cushion x1.5
  const need = buffer * 1.5;
  g("cash", bank >= need ? "pass" : bank >= buffer ? "warn" : "fail", "Cash is 1.5× your cushion", `You have ${fmt(bank)}; the bar is ${fmt(need)}. New work eats cash for 45+ days before it pays you back.`);

  // 3 margin
  const target = a.gross_margin_target > 0 ? a.gross_margin_target / 100 : 0.25;
  if (input.margin == null) g("margin", "warn", "Job margin is proven", "No billed jobs yet, so margin isn't proven. Don't scale a margin you haven't seen.");
  else g("margin", input.margin >= target ? "pass" : input.margin >= target - 0.05 ? "warn" : "fail", "Margin meets your target", `Actual margin on billed work is ${Math.round(input.margin * 100)}% against a ${Math.round(target * 100)}% target. Growing at thin margin just makes a bigger, thinner business.`);

  // 4 collections
  g("collect", input.overdueShare <= 0.1 ? "pass" : input.overdueShare <= 0.25 ? "warn" : "fail", "Customers pay on time", `${Math.round(input.overdueShare * 100)}% of open receivables are overdue. Your average payment time is ${Math.round(dso)} days. Aim for under 10% overdue.`);

  // 5 pipeline
  if (input.winRate == null) g("pipeline", "warn", "Pipeline is real", "No decided bids yet, so win rate is unknown. Track bids in the CRM for a quarter first.");
  else g("pipeline", input.winRate >= 0.25 && input.openPipeline >= annualRun * 0.25 ? "pass" : input.winRate >= 0.15 ? "warn" : "fail", "Bid win rate and pipeline support growth", `Win rate ${Math.round(input.winRate * 100)}%, open pipeline ${fmt(input.openPipeline)}. You want 25%+ and a pipeline worth at least a quarter of annual revenue.`);

  // 6 backlog
  g("backlog", input.backlog >= monthlyFixed * 3 ? "pass" : input.backlog >= monthlyFixed ? "warn" : "fail", "Backlog covers 3 months of fixed costs", `${fmt(input.backlog)} of signed, unbilled work versus ${fmt(monthlyFixed * 3)} of overhead and payroll for 3 months.`);

  // 7 concentration
  if (input.topClientShare != null) g("concentration", input.topClientShare <= 0.4 ? "pass" : input.topClientShare <= 0.6 ? "warn" : "fail", "No single client is too big", `Your biggest client is ${Math.round(input.topClientShare * 100)}% of billed revenue. Keep it under 40% so one slow payer can't sink you.`);

  const passed = gates.filter((x) => x.status === "pass").length;
  return { gates, passed, ready: passed === gates.length, annualRun, usableCash, wcPerDollar, safeAddAnnual, maxJob, dso, crewCushion };
}
