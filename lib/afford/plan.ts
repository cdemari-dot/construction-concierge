import type { Bill, CashFlowAssumptions, Invoice } from "@/lib/types/database";

// How much overhead a contractor can carry and stay healthy.
//   overhead room = revenue x (gross margin - profit you want to keep)
// That room is split across categories using typical contractor weights (rent, vehicles, etc.),
// then each category's real spend is compared to its ceiling. Rule-based, no AI.

export type CategoryKey = "rent" | "vehicles" | "insurance" | "office" | "other";

export const CATEGORIES: { key: CategoryKey; label: string; weight: number; field: keyof CashFlowAssumptions; hint: string }[] = [
  { key: "rent", label: "Office and shop rent", weight: 3.0, field: "rent_monthly", hint: "Typically 2 to 4% of revenue" },
  { key: "vehicles", label: "Vehicles, fuel and leases", weight: 5.5, field: "vehicles_monthly", hint: "Typically 4 to 7% of revenue" },
  { key: "insurance", label: "Insurance and admin fees", weight: 3.0, field: "insurance_monthly", hint: "Typically 2 to 4% of revenue" },
  { key: "office", label: "Office staff", weight: 6.0, field: "office_staff_monthly", hint: "Typically 5 to 8% of revenue" },
  { key: "other", label: "Phones, software, tools", weight: 1.5, field: "other_monthly", hint: "Typically 1 to 2% of revenue" },
];

// The share of the overhead budget each category gets, as percentages that add to 100.
// Uses the company's own split if saved, otherwise the typical one.
export function resolveShares(a: Pick<CashFlowAssumptions, "afford_weights">): Record<CategoryKey, number> {
  const custom = a.afford_weights;
  const raw = CATEGORIES.map((c) => {
    const v = custom ? Number(custom[c.key]) : NaN;
    return Number.isFinite(v) && v >= 0 ? v : c.weight;
  });
  const useCustom = custom && CATEGORIES.every((c) => Number.isFinite(Number(custom[c.key])) && Number(custom[c.key]) >= 0) && raw.some((v) => v > 0);
  const w = useCustom ? raw : CATEGORIES.map((c) => c.weight);
  const total = w.reduce((s, v) => s + v, 0);
  return Object.fromEntries(CATEGORIES.map((c, i) => [c.key, (w[i] / total) * 100])) as Record<CategoryKey, number>;
}

export type CatStatus = "ok" | "tight" | "over" | "unknown";

export interface CategoryResult {
  key: CategoryKey;
  label: string;
  hint: string;
  ceiling: number; // $/month
  spend: number; // $/month, 0 if not entered
  status: CatStatus;
  gap: number; // ceiling - spend (negative = over)
}

export interface RevenueActual {
  annual: number | null; // billing over the last 12 months, scaled up if there is less than a year of history
  trailing: number; // billed (before tax) in the last 12 months
  months: number; // months of billing history, up to 12
  reliable: boolean; // at least 3 months of billing
  note: string;
}

// Actual billing, before tax. With under a year of history it is scaled up to a full year.
export function revenueActual(invoices: Invoice[], today: string): RevenueActual {
  const t = Date.parse(today);
  const yearAgo = t - 365 * 86400000;
  const dated = invoices.filter((i) => i.issued_at);
  if (dated.length === 0) return { annual: null, trailing: 0, months: 0, reliable: false, note: "No invoices yet." };
  const earliest = dated.reduce((m, i) => Math.min(m, Date.parse(i.issued_at as string)), Infinity);
  const months = Math.min(12, Math.max(1, (t - earliest) / (86400000 * 30.44)));
  const trailing = dated.filter((i) => Date.parse(i.issued_at as string) >= yearAgo).reduce((s, i) => s + (i.subtotal ?? 0), 0);
  if (trailing <= 0) return { annual: null, trailing, months, reliable: false, note: "No billing in the last 12 months." };
  const annual = (trailing / months) * 12;
  const reliable = months >= 3;
  const m = Math.round(months);
  return {
    annual,
    trailing,
    months,
    reliable,
    note: months >= 11.5 ? "Your actual billing over the last 12 months, before tax." : `Your billing over the last ${m} month${m === 1 ? "" : "s"} (${fmtMoney(trailing)}), scaled up to a full year.${reliable ? "" : " Too little history to trust yet."}`,
  };
}

export interface MarginActual {
  pct: number | null; // real gross margin across jobs, in percent
  jobs: number;
  billed: number;
  labourSource: "clocked" | "payroll" | "none";
  codedCostPct: number; // job-coded bills as a share of billing
  reliable: boolean;
  note: string;
}

// Same idea as the Jobs page: (billed - bills coded to the job - labour) / billed, summed over all jobs.
// Labour is the clocked-in hours x hourly cost once there are enough of them; until then it is
// estimated from payroll (payrollEstimate = payroll per month x months of billing history).
export function marginActual(input: { invoices: Invoice[]; bills: Bill[]; labourByJob: Record<string, number>; payrollEstimate: number }): MarginActual {
  const { invoices, bills, labourByJob, payrollEstimate } = input;
  const billedByJob = new Map<string, number>();
  for (const i of invoices) billedByJob.set(i.job_id, (billedByJob.get(i.job_id) ?? 0) + (i.subtotal ?? 0));
  const costByJob = new Map<string, number>();
  for (const b of bills) if (b.job_id) costByJob.set(b.job_id, (costByJob.get(b.job_id) ?? 0) + b.amount);

  let billed = 0;
  let billCost = 0;
  let clocked = 0;
  let jobs = 0;
  for (const [jobId, amt] of billedByJob) {
    if (amt <= 0) continue;
    jobs++;
    billed += amt;
    billCost += costByJob.get(jobId) ?? 0;
    clocked += labourByJob[jobId] ?? 0;
  }
  if (billed <= 0) return { pct: null, jobs, billed, labourSource: "none", codedCostPct: 0, reliable: false, note: "No billed jobs yet." };

  // Clocked hours only cover part of payroll (office staff are not on jobs), so trust them once they reach 60% of it.
  const useClocked = clocked > 0 && (payrollEstimate <= 0 || clocked >= payrollEstimate * 0.6);
  const labourSource: MarginActual["labourSource"] = useClocked ? "clocked" : payrollEstimate > 0 ? "payroll" : "none";
  const labour = useClocked ? clocked : payrollEstimate > 0 ? payrollEstimate : 0;
  const pct = ((billed - billCost - labour) / billed) * 100;
  const codedCostPct = (billCost / billed) * 100;

  const caveats = [
    labourSource === "payroll" ? "labour is estimated from your payroll until enough shifts are clocked in" : null,
    labourSource === "none" ? "no labour is recorded and no payroll is set" : null,
    codedCostPct < 15 ? `only ${Math.round(codedCostPct)}% of your billing has bills coded to its job (materials, subs and equipment are probably missing, so this is too high)` : null,
    jobs < 3 ? "fewer than 3 billed jobs" : null,
  ].filter(Boolean);
  const reliable = jobs >= 3 && billed >= 50000 && labourSource !== "none" && codedCostPct >= 15;
  return {
    pct,
    jobs,
    billed,
    labourSource,
    codedCostPct,
    reliable,
    note: `Across ${jobs} billed job${jobs === 1 ? "" : "s"}: billed minus the bills coded to each job minus labour (${labourSource === "clocked" ? "clocked-in hours" : labourSource === "payroll" ? "estimated from payroll" : "none yet"}).${caveats.length ? ` Careful: ${caveats.join("; ")}.` : ""}`,
  };
}

function fmtMoney(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-CA");
}

export interface AffordResult {
  revenue: number;
  marginPct: number;
  profitPct: number;
  overheadPct: number; // share of revenue overhead may take
  roomMonthly: number; // total overhead you can carry per month
  spendMonthly: number; // what you spend now (total overhead)
  leftMonthly: number; // room - spend
  level: "healthy" | "tight" | "over";
  categories: CategoryResult[];
  unitemised: number; // total overhead not assigned to a category
  truckHeadroom: number; // extra vehicle payment per month before breaking the vehicles ceiling
}

export function planAfford(input: { revenue: number; marginPct: number; profitPct: number; overheadMonthly: number; a: CashFlowAssumptions }): AffordResult {
  const { revenue, marginPct, profitPct, overheadMonthly, a } = input;
  const overheadPct = Math.max(0, marginPct - profitPct);
  const roomMonthly = (revenue * overheadPct) / 100 / 12;
  const shares = resolveShares(a);

  const categories: CategoryResult[] = CATEGORIES.map((c) => {
    const ceiling = (roomMonthly * shares[c.key]) / 100;
    const spend = Number(a[c.field] ?? 0);
    const status: CatStatus = spend <= 0 ? "unknown" : spend <= ceiling * 0.9 ? "ok" : spend <= ceiling ? "tight" : "over";
    return { key: c.key, label: c.label, hint: c.hint, ceiling, spend, status, gap: ceiling - spend };
  });

  const itemised = categories.reduce((s, c) => s + c.spend, 0);
  const leftMonthly = roomMonthly - overheadMonthly;
  const level = overheadMonthly <= 0 ? "healthy" : leftMonthly > roomMonthly * 0.1 ? "healthy" : leftMonthly >= 0 ? "tight" : "over";
  const veh = categories.find((c) => c.key === "vehicles")!;

  return {
    revenue,
    marginPct,
    profitPct,
    overheadPct,
    roomMonthly,
    spendMonthly: overheadMonthly,
    leftMonthly,
    level,
    categories,
    unitemised: Math.max(0, overheadMonthly - itemised),
    truckHeadroom: Math.max(0, veh.ceiling - veh.spend),
  };
}
