import { buildForecast, type WeekBucket } from "./forecast";
import type { Bill, CashFlowAssumptions, Invoice } from "@/lib/types/database";

export type InjectionLevel = "none" | "watch" | "soon" | "urgent";

export interface InjectionResult {
  buffer: number; // safety cushion we want to stay above
  minBalance: number;
  minWeek: number;
  firstShortWeek: number | null; // first week below the buffer
  firstNegativeWeek: number | null;
  needed: number; // cash to bring in so the lowest point stays at the buffer
  neededBy: string | null; // date the money should already be in the bank
  level: InjectionLevel;
  suggestedLine: number; // credit line size (needed + 25% headroom, rounded up to $5k)
  stress: { minBalance: number; needed: number; minWeek: number }; // if every customer pays 2 weeks late
  buckets: WeekBucket[];
}

const DAY = 86400000;

// Safety cushion = one payroll run plus one month of overhead.
export function safetyBuffer(a: CashFlowAssumptions): number {
  return Math.max(0, a.payroll_per_period + a.overhead_monthly);
}

function lowest(buckets: WeekBucket[]) {
  let minBalance = Infinity;
  let minWeek = 0;
  buckets.forEach((b, i) => {
    if (b.endingBalance < minBalance) {
      minBalance = b.endingBalance;
      minWeek = i;
    }
  });
  return { minBalance, minWeek };
}

export function analyseInjection(
  startingBalance: number,
  openInvoices: Invoice[],
  unpaidBills: Bill[],
  a: CashFlowAssumptions,
  now: Date = new Date(),
): InjectionResult {
  const buffer = safetyBuffer(a);
  const buckets = buildForecast(startingBalance, openInvoices, unpaidBills, a, now);
  const { minBalance, minWeek } = lowest(buckets);

  const shortIdx = buckets.findIndex((b) => b.endingBalance < buffer);
  const negIdx = buckets.findIndex((b) => b.endingBalance < 0);
  const needed = Math.max(0, Math.ceil(buffer - minBalance));

  let neededBy: string | null = null;
  if (shortIdx !== -1) {
    // have the money in the bank a week before the first week that dips under the cushion
    neededBy = new Date(new Date(buckets[shortIdx].weekStart).getTime() - 7 * DAY).toISOString().slice(0, 10);
    if (neededBy < now.toISOString().slice(0, 10)) neededBy = now.toISOString().slice(0, 10);
  }

  let level: InjectionLevel = "none";
  if (negIdx !== -1 && negIdx <= 3) level = "urgent";
  else if (shortIdx !== -1 && shortIdx <= 2) level = "urgent";
  else if (shortIdx !== -1 && shortIdx <= 7) level = "soon";
  else if (shortIdx !== -1) level = "watch";

  // Stress case: every receivable lands two weeks later than its due date.
  const late = openInvoices.map((i) => (i.due_at ? { ...i, due_at: new Date(new Date(i.due_at).getTime() + 14 * DAY).toISOString().slice(0, 10) } : i));
  const sBuckets = buildForecast(startingBalance, late, unpaidBills, a, now);
  const s = lowest(sBuckets);

  return {
    buffer,
    minBalance,
    minWeek,
    firstShortWeek: shortIdx === -1 ? null : shortIdx,
    firstNegativeWeek: negIdx === -1 ? null : negIdx,
    needed,
    neededBy,
    level,
    suggestedLine: needed > 0 ? Math.ceil((needed * 1.25) / 5000) * 5000 : 0,
    stress: { minBalance: s.minBalance, minWeek: s.minWeek, needed: Math.max(0, Math.ceil(buffer - s.minBalance)) },
    buckets,
  };
}
