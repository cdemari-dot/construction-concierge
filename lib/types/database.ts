// Hand-written domain types matching supabase/migrations/0001_schema.sql.
// Once the project is linked to a live Supabase instance, replace this file
// with `npx supabase gen types typescript --linked` output — but keep the
// shape the same so the rest of the app doesn't need to change.

export type UserRole = "owner" | "pm" | "foreman" | "worker";
export type ProfileStatus = "active" | "inactive";
export type JobStatus = "active" | "holdback" | "closed";
export type PayrollStatus = "pending" | "approved" | "exported";
export type ExtraStatus = "reported" | "priced" | "submitted_to_gc" | "approved" | "rejected";
export type ChangeOrderStatus = "pending" | "priced" | "sent_to_gc" | "approved" | "disputed" | "rejected";
export type TmTicketStatus = "draft" | "signed" | "sent_to_gc" | "billed";
export type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "overdue";
export type BillStatus = "unpaid" | "paid";
export type PayrollFrequency = "weekly" | "biweekly";
export type IncidentStatus = "open" | "closed";
export type PayrollBatchStatus = "generated" | "downloaded";

export interface Company {
  id: string;
  name: string;
  timezone: string;
  created_at: string;
}

export interface Profile {
  id: string;
  auth_user_id: string | null;
  company_id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  phone: string | null;
  pin_hash: string | null;
  status: ProfileStatus;
  created_at: string;
}

export interface Client {
  id: string;
  company_id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  company_id: string;
  job_number: string;
  name: string;
  client_id: string | null;
  address: string | null;
  geofence_lat: number | null;
  geofence_lon: number | null;
  geofence_radius_m: number;
  contract_value: number;
  status: JobStatus;
  foreman_id: string | null;
  percent_complete: number;
  start_date: string | null;
  created_at: string;
}

export interface ToolboxTalk {
  id: string;
  company_id: string;
  job_id: string;
  talk_date: string;
  title: string;
  body: string;
  created_by: string | null;
  created_at: string;
}

export interface TimeEntry {
  id: string;
  company_id: string;
  job_id: string;
  worker_id: string;
  clock_in_at: string;
  clock_in_lat: number | null;
  clock_in_lon: number | null;
  clock_in_photo_path: string | null;
  geofence_ok: boolean | null;
  ppe_confirmed: boolean;
  ppe_missing_items: string[];
  toolbox_talk_id: string | null;
  clock_out_at: string | null;
  clock_out_lat: number | null;
  clock_out_lon: number | null;
  clock_out_photo_path: string | null;
  injury_reported: boolean;
  off_schedule: boolean;
  payroll_status: PayrollStatus;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface IncidentReport {
  id: string;
  company_id: string;
  job_id: string;
  worker_id: string | null;
  time_entry_id: string | null;
  occurred_at: string;
  incident_type: string;
  body_part: string | null;
  first_aid_given: boolean;
  first_aid_by: string | null;
  needs_medical: boolean;
  description: string;
  witness: string | null;
  photo_paths: string[];
  status: IncidentStatus;
  closed_by: string | null;
  closed_at: string | null;
  created_at: string;
}

export interface DailyLog {
  id: string;
  company_id: string;
  job_id: string;
  foreman_id: string | null;
  log_date: string;
  crew_count: number | null;
  weather: string | null;
  work_performed: string | null;
  delays: string | null;
  photo_paths: string[];
  created_at: string;
}

export interface Extra {
  id: string;
  company_id: string;
  job_id: string;
  reported_by: string | null;
  description: string;
  hours: number;
  materials_cost: number;
  authorized_by: string | null;
  photo_paths: string[];
  status: ExtraStatus;
  change_order_id: string | null;
  created_at: string;
}

export interface ChangeOrder {
  id: string;
  company_id: string;
  job_id: string;
  description: string;
  amount: number;
  status: ChangeOrderStatus;
  source_extra_id: string | null;
  priced_by: string | null;
  priced_at: string | null;
  sent_to_gc_at: string | null;
  gc_responded_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TmTicket {
  id: string;
  company_id: string;
  job_id: string;
  ticket_date: string;
  super_name: string;
  super_email: string | null;
  super_signature_path: string | null;
  signed_at: string | null;
  hours: number;
  equipment_cost: number;
  materials_cost: number;
  photo_paths: string[];
  gps_lat: number | null;
  gps_lon: number | null;
  status: TmTicketStatus;
  created_by: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  job_id: string;
  client_id: string | null;
  invoice_number: string;
  subtotal: number;
  hst_amount: number;
  total_amount: number;
  holdback_amount: number;
  issued_at: string;
  due_at: string | null;
  paid_at: string | null;
  status: InvoiceStatus;
  created_at: string;
}

export interface Bill {
  id: string;
  company_id: string;
  job_id: string | null;
  vendor_name: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  paid_at: string | null;
  status: BillStatus;
  created_at: string;
}

export interface CashSnapshot {
  id: string;
  company_id: string;
  as_of_date: string;
  bank_balance: number;
  created_by: string | null;
  created_at: string;
}

export interface CashFlowAssumptions {
  id: string;
  company_id: string;
  overhead_monthly: number;
  payroll_per_period: number;
  payroll_frequency: PayrollFrequency;
  hst_reserve_pct: number;
  tax_reserve_pct: number;
  equipment_reserve_pct: number;
  profit_allocation_pct: number;
  revenue_target_annual: number;
  gross_margin_target: number;
  updated_by: string | null;
  updated_at: string;
}

export interface PayrollExportBatch {
  id: string;
  company_id: string;
  period_start: string;
  period_end: string;
  generated_by: string | null;
  generated_at: string;
  file_path: string | null;
  total_hours: number;
  status: PayrollBatchStatus;
}

export interface PayrollExportLine {
  id: string;
  batch_id: string;
  worker_id: string;
  job_id: string | null;
  total_hours: number;
  regular_hours: number;
  overtime_hours: number;
}

// Read models (views)
export interface JobFinancialSummary {
  job_id: string;
  company_id: string;
  contract_value: number;
  total_invoiced: number;
  total_paid: number;
  total_outstanding: number;
  total_holdback: number;
  approved_change_orders: number;
  total_bills: number;
  unpaid_bills: number;
}

export interface CompanyCashPosition {
  company_id: string;
  bank_balance: number | null;
  as_of_date: string | null;
  open_ar: number;
  open_ap: number;
}

export interface ScheduleEntry {
  id: string;
  company_id: string;
  job_id: string;
  worker_id: string;
  work_date: string;
  start_time: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PayRate {
  profile_id: string;
  company_id: string;
  hourly_rate: number;
  updated_at: string;
}

export interface JobLabourCost {
  company_id: string;
  job_id: string;
  hours: number;
  labour_cost: number;
  unrated_shifts: number;
}

export interface WhoIsClockedIn {
  time_entry_id: string;
  company_id: string;
  job_id: string;
  job_name: string;
  worker_id: string;
  worker_name: string;
  worker_role: UserRole;
  clock_in_at: string;
  geofence_ok: boolean | null;
}

export type BidStage = "lead" | "estimating" | "submitted" | "won" | "lost";

export interface Bid {
  id: string;
  company_id: string;
  client_id: string | null;
  name: string;
  address: string | null;
  contact: string | null;
  value: number;
  stage: BidStage;
  bid_due: string | null;
  follow_up_on: string | null;
  notes: string | null;
  lost_reason: string | null;
  job_id: string | null;
  created_by: string | null;
  created_at: string;
  stage_changed_at: string;
  contact_email: string | null;
  auto_follow_up: boolean;
  follow_up_count: number;
  last_follow_up_at: string | null;
  submitted_at: string | null;
}
