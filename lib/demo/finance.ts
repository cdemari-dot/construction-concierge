import type { Bill, CashFlowAssumptions, Invoice } from "@/lib/types/database";

// Sample numbers for `?demo=1` on the finance and scale pages, so the pages can be seen
// populated before real data exists. Never written to the database.
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

export const DEMO_BANK = 60000;

export const DEMO_ASSUMPTIONS = {
  id: "demo",
  company_id: "demo",
  overhead_monthly: 18000,
  payroll_per_period: 22000,
  payroll_frequency: "biweekly",
  hst_reserve_pct: 13,
  tax_reserve_pct: 10,
  equipment_reserve_pct: 5,
  profit_allocation_pct: 8,
  revenue_target_annual: 3000000,
  gross_margin_target: 25,
  rent_monthly: 5200,
  vehicles_monthly: 9800,
  insurance_monthly: 3100,
  office_staff_monthly: 7000,
  other_monthly: 1400,
  afford_weights: null,
  updated_by: null,
  updated_at: new Date().toISOString(),
} as CashFlowAssumptions;

const inv = (n: string, total: number, due: number, client: string): Invoice =>
  ({
    id: n,
    company_id: "demo",
    job_id: "demo",
    client_id: client,
    invoice_number: n,
    subtotal: Math.round(total / 1.13),
    hst_amount: total - Math.round(total / 1.13),
    total_amount: total,
    holdback_amount: total * 0.1,
    issued_at: day(due - 30),
    due_at: day(due),
    paid_at: null,
    status: due < 0 ? "overdue" : "sent",
    created_at: day(-30),
  }) as Invoice;

export const DEMO_INVOICES: Invoice[] = [inv("INV-1001", 90000, -12, "c1"), inv("INV-1002", 60000, 10, "c1"), inv("INV-1003", 45000, 35, "c2"), inv("INV-1004", 120000, 60, "c1")];

export const DEMO_BILLS: Bill[] = [
  { id: "b1", company_id: "demo", job_id: null, vendor_name: "Dump & Haul Co", description: null, amount: 38000, due_date: day(5), paid_at: null, status: "unpaid", created_at: day(-10) },
  { id: "b2", company_id: "demo", job_id: null, vendor_name: "Equipment Rental", description: null, amount: 52000, due_date: day(20), paid_at: null, status: "unpaid", created_at: day(-5) },
  { id: "b3", company_id: "demo", job_id: null, vendor_name: "Materials Supply", description: null, amount: 27000, due_date: day(40), paid_at: null, status: "unpaid", created_at: day(-2) },
] as Bill[];

export const DEMO_CLIENT_NAMES = { c1: "Acme General Contracting", c2: "Bolt Builders" };
