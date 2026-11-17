import type { CashFlowAssumptions, Invoice } from "@/lib/types/database";

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

export interface RevenueBasis {
  annual: number;
  source: "actual" | "target" | "none";
  note: string;
}

// Actual billed (pre-tax) over the last 12 months once there is at least ~9 months of history;
// otherwise the owner's annual revenue target.
export function revenueBasis(invoices: Invoice[], a: CashFlowAssumptions, today: string): RevenueBasis {
  const t = Date.parse(today);
  const yearAgo = t - 365 * 86400000;
  const dated = invoices.filter((i) => i.issued_at);
  const earliest = dated.reduce((m, i) => Math.min(m, Date.parse(i.issued_at as string)), Infinity);
  const spanDays = Number.isFinite(earliest) ? (t - earliest) / 86400000 : 0;
  const billed = dated.filter((i) => Date.parse(i.issued_at as string) >= yearAgo).reduce((s, i) => s + (i.subtotal ?? 0), 0);

  if (spanDays >= 270 && billed > 0) return { annual: billed, source: "actual", note: "Based on what you actually billed over the last 12 months (before tax)." };
  if (a.revenue_target_annual > 0) return { annual: a.revenue_target_annual, source: "target", note: "Based on your yearly revenue target. Once you have 9+ months of invoices this switches to your actual billing." };
  if (billed > 0) return { annual: billed, source: "actual", note: `Based on ${Math.round(spanDays / 30)} months of billing so far. Set a revenue target for a steadier number.` };
  return { annual: 0, source: "none", note: "Add a yearly revenue target in Playbook & settings, or some invoices." };
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
