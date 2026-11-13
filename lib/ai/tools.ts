import type { SupabaseClient } from "@supabase/supabase-js";
import { buildForecast, firstNegativeWeek } from "@/lib/cashflow/forecast";
import { fmt } from "@/lib/format";
import type { Bill, CashFlowAssumptions, ChangeOrder, CompanyCashPosition, Invoice, Job, JobFinancialSummary } from "@/lib/types/database";

// Every tool runs its queries through the caller's own RLS-scoped Supabase
// client (never the service-role client) — the agent can only ever see or
// touch what the signed-in Owner/PM could already see or touch themselves.
export function buildTools(supabase: SupabaseClient) {
  return {
    get_cash_position: {
      description: "Current bank balance (from the latest manual snapshot), open AR, and open AP for the company.",
      input_schema: { type: "object" as const, properties: {} },
      run: async () => {
        const { data } = await supabase.from("company_cash_position").select("*").maybeSingle();
        const c = data as CompanyCashPosition | null;
        if (!c || c.bank_balance == null) return { note: "No cash snapshot has been entered yet." };
        return {
          bank_balance: fmt(c.bank_balance),
          as_of_date: c.as_of_date,
          open_ar: fmt(c.open_ar),
          open_ap: fmt(c.open_ap),
        };
      },
    },

    get_cashflow_forecast: {
      description: "13-week cash flow forecast built from the latest cash snapshot, open invoices, unpaid bills, and payroll/overhead assumptions. Returns the week it goes negative (if any) and the ending balance of each week.",
      input_schema: { type: "object" as const, properties: {} },
      run: async () => {
        const [{ data: cash }, { data: invoices }, { data: bills }, { data: assumptions }] = await Promise.all([
          supabase.from("company_cash_position").select("*").maybeSingle(),
          supabase.from("invoices").select("*").is("paid_at", null),
          supabase.from("bills").select("*").eq("status", "unpaid"),
          supabase.from("cash_flow_assumptions").select("*").maybeSingle(),
        ]);
        if (!assumptions) return { note: "No CFO playbook assumptions set yet." };
        const buckets = buildForecast(
          (cash as CompanyCashPosition | null)?.bank_balance ?? 0,
          (invoices ?? []) as Invoice[],
          (bills ?? []) as Bill[],
          assumptions as CashFlowAssumptions,
        );
        const negWeek = firstNegativeWeek(buckets);
        return {
          weeks: buckets.map((b) => ({ weekStart: b.weekStart, endingBalance: fmt(b.endingBalance) })),
          goesNegativeWeek: negWeek == null ? null : negWeek + 1,
        };
      },
    },

    list_jobs: {
      description: "All jobs with contract value, billed/outstanding AR, approved change orders, and status.",
      input_schema: { type: "object" as const, properties: {} },
      run: async () => {
        const [{ data: jobs }, { data: summaries }] = await Promise.all([
          supabase.from("jobs").select("*"),
          supabase.from("job_financial_summary").select("*"),
        ]);
        const summaryByJob = new Map(((summaries ?? []) as JobFinancialSummary[]).map((s) => [s.job_id, s]));
        return ((jobs ?? []) as Job[]).map((j) => {
          const s = summaryByJob.get(j.id);
          return {
            job_number: j.job_number,
            name: j.name,
            status: j.status,
            contract_value: fmt(j.contract_value),
            percent_complete: j.percent_complete,
            total_invoiced: s ? fmt(s.total_invoiced) : "$0",
            total_outstanding: s ? fmt(s.total_outstanding) : "$0",
            approved_change_orders: s ? fmt(s.approved_change_orders) : "$0",
          };
        });
      },
    },

    list_open_change_orders: {
      description: "Change orders that are not yet approved, disputed, or rejected — i.e. still need pricing or a GC response.",
      input_schema: { type: "object" as const, properties: {} },
      run: async () => {
        const { data } = await supabase.from("change_orders").select("*").in("status", ["pending", "priced", "sent_to_gc"]);
        return ((data ?? []) as ChangeOrder[]).map((c) => ({ id: c.id, description: c.description, amount: fmt(c.amount), status: c.status }));
      },
    },

    list_overdue_invoices: {
      description: "Unpaid invoices whose due date has passed.",
      input_schema: { type: "object" as const, properties: {} },
      run: async () => {
        const today = new Date().toISOString().slice(0, 10);
        const { data } = await supabase.from("invoices").select("*").is("paid_at", null).lt("due_at", today);
        return ((data ?? []) as Invoice[]).map((i) => ({ invoice_number: i.invoice_number, total_amount: fmt(i.total_amount), due_at: i.due_at }));
      },
    },

    list_unpaid_bills: {
      description: "All unpaid bills (accounts payable), soonest due first.",
      input_schema: { type: "object" as const, properties: {} },
      run: async () => {
        const { data } = await supabase.from("bills").select("*").eq("status", "unpaid").order("due_date");
        return ((data ?? []) as Bill[]).map((b) => ({ vendor_name: b.vendor_name, amount: fmt(b.amount), due_date: b.due_date }));
      },
    },
  };
}

export type ToolName = keyof ReturnType<typeof buildTools>;
