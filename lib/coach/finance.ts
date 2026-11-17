import { safetyBuffer, type InjectionResult } from "@/lib/cashflow/injection";
import { fmt } from "@/lib/format";
import type { Bill, CashFlowAssumptions, Invoice } from "@/lib/types/database";

export interface CoachItem {
  id: string;
  tone: "red" | "amber" | "lime" | "cyan";
  emoji: string;
  title: string;
  detail: string;
}

export interface CoachResult {
  score: number;
  label: string;
  items: CoachItem[];
  weekly: { avgCollected: number; hst: number; tax: number; equipment: number; profit: number; cushion: number; total: number };
  cushion: { goal: number; current: number; weeksToGoal: number | null };
}

const CUSHION_PCT = 5; // % of every collected dollar parked in the cushion until the goal is met

export function monthlyPayroll(a: CashFlowAssumptions): number {
  return a.payroll_per_period * (a.payroll_frequency === "weekly" ? 4.345 : 2.1725);
}

export function coachFinance(input: {
  bank: number | null;
  snapshotDate: string | null;
  invoices: Invoice[]; // open (unpaid)
  bills: Bill[]; // unpaid
  clientNames: Record<string, string>;
  a: CashFlowAssumptions;
  inj: InjectionResult;
  today: string; // YYYY-MM-DD
}): CoachResult {
  const { bank, invoices, bills, clientNames, a, inj, today } = input;
  const items: CoachItem[] = [];
  const bal = bank ?? 0;

  const avgCollected = inj.buckets.reduce((s, b) => s + b.inflows, 0) / inj.buckets.length;
  const w = {
    avgCollected,
    hst: (avgCollected * a.hst_reserve_pct) / 100,
    tax: (avgCollected * a.tax_reserve_pct) / 100,
    equipment: (avgCollected * a.equipment_reserve_pct) / 100,
    profit: (avgCollected * a.profit_allocation_pct) / 100,
    cushion: (avgCollected * CUSHION_PCT) / 100,
    total: 0,
  };
  w.total = w.hst + w.tax + w.equipment + w.profit + w.cushion;

  const goal = 3 * (a.overhead_monthly + monthlyPayroll(a));
  const gap = Math.max(0, goal - bal);
  const weeksToGoal = gap === 0 ? 0 : w.cushion > 0 ? Math.ceil(gap / w.cushion) : null;

  // 1. no balance on file
  if (bank == null) {
    items.push({ id: "snapshot", tone: "amber", emoji: "", title: "Add your bank balance", detail: "Everything here is only as good as your last bank number. Enter this week's balance in Settings. It takes 30 seconds and the forecast, injection and coach all update." });
  }

  // 2. cash injection
  if (inj.level !== "none") {
    items.push({
      id: "injection",
      tone: inj.level === "urgent" ? "red" : "amber",
      emoji: "",
      title: inj.level === "urgent" ? `Line up about ${fmt(inj.needed)} of cash now` : `Plan for about ${fmt(inj.needed)} of extra cash`,
      detail: `Your lowest projected balance is ${fmt(inj.minBalance)} in week ${inj.minWeek + 1}, below your safety cushion of ${fmt(inj.buffer)} (one payroll plus one month of overhead). Have funds in place by ${inj.neededBy}. The cheapest fixes, in order: collect faster, stretch bills, then a credit line of about ${fmt(inj.suggestedLine)} set up before you need it.`,
    });
  } else {
    items.push({ id: "runway", tone: "lime", emoji: "", title: "Cash stays above your cushion for 13 weeks", detail: `Your lowest projected balance is ${fmt(inj.minBalance)} (week ${inj.minWeek + 1}), above the ${fmt(inj.buffer)} cushion. Keep it that way: don't pull profit early.` });
  }

  // 3. overdue receivables
  const overdue = invoices.filter((i) => i.due_at && i.due_at < today).sort((x, y) => (x.due_at as string).localeCompare(y.due_at as string));
  const openAR = invoices.reduce((s, i) => s + i.total_amount, 0);
  const overdueSum = overdue.reduce((s, i) => s + i.total_amount, 0);
  if (overdue.length > 0) {
    const oldestDays = Math.floor((Date.parse(today) - Date.parse(overdue[0].due_at as string)) / 86400000);
    const top = [...overdue].sort((x, y) => y.total_amount - x.total_amount).slice(0, 3);
    items.push({
      id: "overdue",
      tone: openAR > 0 && overdueSum / openAR > 0.2 ? "red" : "amber",
      emoji: "",
      title: `${fmt(overdueSum)} is overdue (${overdue.length} invoice${overdue.length === 1 ? "" : "s"})`,
      detail: `Oldest is ${oldestDays} day${oldestDays === 1 ? "" : "s"} late. Call these first today: ${top.map((i) => `${i.invoice_number} (${fmt(i.total_amount)})`).join(", ")}. Money owed to you is the cheapest cash you'll ever find. Ask for a payment date, not "soon".`,
    });
  }

  // 4. bills due in the next 14 days
  const in14 = new Date(Date.parse(today) + 14 * 86400000).toISOString().slice(0, 10);
  const due14 = bills.filter((b) => b.due_date && b.due_date <= in14).reduce((s, b) => s + b.amount, 0);
  if (due14 > 0) {
    items.push({
      id: "bills14",
      tone: due14 > bal ? "amber" : "cyan",
      emoji: "",
      title: `${fmt(due14)} of bills fall due in the next 14 days`,
      detail: due14 > bal ? `That's more than the ${fmt(bal)} in the bank. Pay payroll and CRA remittances first, then suppliers who can hurt you (materials, equipment), and ask the rest for a short extension before the due date, not after.` : `You can cover it from the bank today (${fmt(bal)}). Pay on the due date, not early, so the cash works for you longer.`,
    });
  }

  // 5. client concentration
  if (openAR > 0) {
    const by = new Map<string, number>();
    for (const i of invoices) by.set(i.client_id ?? "unknown", (by.get(i.client_id ?? "unknown") ?? 0) + i.total_amount);
    const [topId, topAmt] = [...by.entries()].sort((x, y) => y[1] - x[1])[0];
    const share = topAmt / openAR;
    if (share > 0.5 && invoices.length > 1) {
      items.push({ id: "concentration", tone: "amber", emoji: "", title: `${Math.round(share * 100)}% of what you're owed is one client`, detail: `${clientNames[topId] ?? "One client"} owes ${fmt(topAmt)}. If they pay late your whole month slides. Keep the relationship, but spread future work across more GCs and get progress billing in writing.` });
    }
  }

  // 6. holdback tied up
  const holdback = invoices.reduce((s, i) => s + (i.holdback_amount ?? 0), 0);
  if (holdback > 0) {
    items.push({ id: "holdback", tone: "cyan", emoji: "", title: `${fmt(holdback)} is tied up in holdback`, detail: "Put a calendar reminder to request each holdback release the day the lien period ends. Unclaimed holdback is free cash sitting with your client." });
  }

  // 7. payroll coverage
  if (a.payroll_per_period > 0 && bal < a.payroll_per_period * 2) {
    items.push({ id: "payroll", tone: "amber", emoji: "", title: "Less than two payrolls in the bank", detail: `Payroll is ${fmt(a.payroll_per_period)} per run and you have ${fmt(bal)}. Your crew is your biggest promise. Build to at least two runs (${fmt(a.payroll_per_period * 2)}) before anything else.` });
  }

  // 8. the weekly savings routine
  if (w.avgCollected > 0) {
    items.push({
      id: "routine",
      tone: "cyan",
      emoji: "",
      title: `Every Friday, move ${fmt(w.total)} into separate accounts`,
      detail: `On an average week of ${fmt(w.avgCollected)} collected: HST ${fmt(w.hst)}, income tax ${fmt(w.tax)}, equipment ${fmt(w.equipment)}, profit ${fmt(w.profit)}, cushion ${fmt(w.cushion)}. Move it the same day the money lands, so it never looks like spendable cash.`,
    });
  }

  // 9. cushion goal
  items.push({
    id: "cushion",
    tone: gap === 0 ? "lime" : "cyan",
    emoji: "",
    title: gap === 0 ? "You've hit your 3-month cushion" : `Build a 3-month cushion: ${fmt(goal)}`,
    detail: gap === 0 ? "Three months of overhead and payroll in the bank. That's what lets you say no to a bad job." : `You're at ${fmt(bal)}, ${fmt(gap)} short. Saving ${CUSHION_PCT}% of every collected dollar gets you there in about ${weeksToGoal ?? "?"} weeks.`,
  });

  // health score
  let score = 100;
  if (inj.level === "urgent") score -= 40;
  else if (inj.level === "soon") score -= 25;
  else if (inj.level === "watch") score -= 12;
  if (openAR > 0) score -= Math.min(25, Math.round((overdueSum / openAR) * 50));
  if (bank == null) score -= 15;
  score -= Math.round(Math.min(1, gap / Math.max(1, goal)) * 15);
  if (a.payroll_per_period > 0 && bal < a.payroll_per_period * 2) score -= 8;
  score = Math.max(0, Math.min(100, score));

  const rank = { red: 0, amber: 1, cyan: 2, lime: 3 } as const;
  items.sort((x, y) => rank[x.tone] - rank[y.tone]);

  return {
    score,
    label: score >= 80 ? "Healthy" : score >= 60 ? "Watch closely" : score >= 40 ? "Needs attention" : "At risk",
    items,
    weekly: w,
    cushion: { goal, current: bal, weeksToGoal },
  };
}

export { safetyBuffer };
