import type { Bill, CashFlowAssumptions, Invoice } from "@/lib/types/database";

export interface WeekBucket {
  weekStart: string;
  inflows: number;
  outflows: number;
  payroll: number;
  overhead: number;
  billsDue: number;
  endingBalance: number;
  reserve: { hst: number; tax: number; equipment: number; profit: number };
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKS = 13;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function inRange(dateStr: string | null, start: Date, end: Date): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d >= start && d < end;
}

/**
 * Builds a 13-week cash flow forecast starting from the most recent manual
 * cash snapshot. Inflows assume a GC pays on an invoice's due date; outflows
 * are unpaid bills by their due date plus the recurring payroll run rate and
 * a smoothed monthly overhead figure. Reserve targets (HST/tax/equipment/
 * profit) are CFO-playbook guidance — money you should be moving to a
 * separate account — not a deduction from the projected balance.
 */
export function buildForecast(
  startingBalance: number,
  openInvoices: Invoice[],
  unpaidBills: Bill[],
  assumptions: CashFlowAssumptions,
  startDate: Date = new Date(),
): WeekBucket[] {
  const weeklyOverhead = assumptions.overhead_monthly / 4.345;
  let running = startingBalance;
  const buckets: WeekBucket[] = [];

  for (let i = 0; i < WEEKS; i++) {
    const weekStart = addDays(startDate, i * 7);
    const weekEnd = addDays(weekStart, 7);

    const inflows = openInvoices
      .filter((inv) => inRange(inv.due_at, weekStart, weekEnd))
      .reduce((sum, inv) => sum + inv.total_amount, 0);

    const billsDue = unpaidBills
      .filter((b) => inRange(b.due_date, weekStart, weekEnd))
      .reduce((sum, b) => sum + b.amount, 0);

    const payroll =
      assumptions.payroll_frequency === "weekly"
        ? assumptions.payroll_per_period
        : i % 2 === 0
          ? assumptions.payroll_per_period
          : 0;

    const outflows = billsDue + payroll + weeklyOverhead;
    running += inflows - outflows;

    buckets.push({
      weekStart: weekStart.toISOString().slice(0, 10),
      inflows,
      outflows,
      payroll,
      overhead: weeklyOverhead,
      billsDue,
      endingBalance: running,
      reserve: {
        hst: (inflows * assumptions.hst_reserve_pct) / 100,
        tax: (inflows * assumptions.tax_reserve_pct) / 100,
        equipment: (inflows * assumptions.equipment_reserve_pct) / 100,
        profit: (inflows * assumptions.profit_allocation_pct) / 100,
      },
    });
  }

  return buckets;
}

export function firstNegativeWeek(buckets: WeekBucket[]): number | null {
  const idx = buckets.findIndex((b) => b.endingBalance < 0);
  return idx === -1 ? null : idx;
}
