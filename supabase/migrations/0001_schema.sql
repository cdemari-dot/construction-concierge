-- Construction Concierge — Phase 1 schema
-- Core tables for a multi-tenant owner's CFO / back-office app.
-- See CLAUDE.md for the architecture decisions behind this schema.

create extension if not exists pgcrypto;

create type user_role as enum ('owner', 'pm', 'foreman', 'worker');
create type profile_status as enum ('active', 'inactive');
create type job_status as enum ('active', 'holdback', 'closed');
create type payroll_status as enum ('pending', 'approved', 'exported');
create type extra_status as enum ('reported', 'priced', 'submitted_to_gc', 'approved', 'rejected');
create type change_order_status as enum ('pending', 'priced', 'sent_to_gc', 'approved', 'disputed', 'rejected');
create type tm_ticket_status as enum ('draft', 'signed', 'sent_to_gc', 'billed');
create type invoice_status as enum ('draft', 'sent', 'partially_paid', 'paid', 'overdue');
create type bill_status as enum ('unpaid', 'paid');
create type payroll_frequency as enum ('weekly', 'biweekly');
create type incident_status as enum ('open', 'closed');
create type payroll_batch_status as enum ('generated', 'downloaded');

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Toronto',
  created_at timestamptz not null default now()
);

-- One row per person who can appear anywhere in the app, logins included.
-- `id` is the stable identity every other table points at; `auth_user_id`
-- is only set once that person has (or claims) a Supabase Auth account.
-- Field workers who only ever use the kiosk PIN pad can stay unclaimed
-- forever — see CLAUDE.md "Roles & the kiosk/PIN problem".
create table profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  company_id uuid not null references companies (id) on delete cascade,
  full_name text not null,
  email text,
  role user_role not null,
  phone text,
  pin_hash text,
  status profile_status not null default 'active',
  created_at timestamptz not null default now(),
  constraint profiles_pin_unique_per_company unique (company_id, pin_hash)
);
create index profiles_company_idx on profiles (company_id);
create index profiles_auth_user_idx on profiles (auth_user_id);

create table clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  name text not null,
  contact_name text,
  contact_email text,
  contact_phone text,
  notes text,
  created_at timestamptz not null default now()
);
create index clients_company_idx on clients (company_id);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  job_number text not null,
  name text not null,
  client_id uuid references clients (id) on delete set null,
  address text,
  geofence_lat double precision,
  geofence_lon double precision,
  geofence_radius_m integer not null default 150,
  contract_value numeric(12, 2) not null default 0,
  status job_status not null default 'active',
  foreman_id uuid references profiles (id) on delete set null,
  percent_complete numeric(5, 2) not null default 0,
  start_date date,
  created_at timestamptz not null default now(),
  unique (company_id, job_number)
);
create index jobs_company_idx on jobs (company_id);

create table toolbox_talks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  talk_date date not null default current_date,
  title text not null,
  body text not null,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index toolbox_talks_job_idx on toolbox_talks (job_id);

create table time_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  worker_id uuid not null references profiles (id) on delete cascade,
  clock_in_at timestamptz not null default now(),
  clock_in_lat double precision,
  clock_in_lon double precision,
  clock_in_photo_path text,
  geofence_ok boolean,
  ppe_confirmed boolean not null default false,
  ppe_missing_items text[] not null default '{}',
  toolbox_talk_id uuid references toolbox_talks (id) on delete set null,
  clock_out_at timestamptz,
  clock_out_lat double precision,
  clock_out_lon double precision,
  clock_out_photo_path text,
  injury_reported boolean not null default false,
  payroll_status payroll_status not null default 'pending',
  approved_by uuid references profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint time_entries_clock_out_after_in check (clock_out_at is null or clock_out_at >= clock_in_at)
);
create index time_entries_company_idx on time_entries (company_id);
create index time_entries_job_idx on time_entries (job_id);
create index time_entries_worker_idx on time_entries (worker_id);
create index time_entries_open_idx on time_entries (job_id) where clock_out_at is null;

create table toolbox_talk_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  toolbox_talk_id uuid not null references toolbox_talks (id) on delete cascade,
  worker_id uuid not null references profiles (id) on delete cascade,
  time_entry_id uuid references time_entries (id) on delete set null,
  acknowledged_at timestamptz not null default now(),
  unique (toolbox_talk_id, worker_id, time_entry_id)
);
create index tta_talk_idx on toolbox_talk_acknowledgements (toolbox_talk_id);

create table incident_reports (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  worker_id uuid references profiles (id) on delete set null,
  time_entry_id uuid references time_entries (id) on delete set null,
  occurred_at timestamptz not null default now(),
  incident_type text not null,
  body_part text,
  first_aid_given boolean not null default false,
  first_aid_by text,
  needs_medical boolean not null default false,
  description text not null,
  witness text,
  photo_paths text[] not null default '{}',
  status incident_status not null default 'open',
  closed_by uuid references profiles (id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index incident_reports_company_idx on incident_reports (company_id);
create index incident_reports_job_idx on incident_reports (job_id);

create table daily_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  foreman_id uuid references profiles (id) on delete set null,
  log_date date not null default current_date,
  crew_count integer,
  weather text,
  work_performed text,
  delays text,
  photo_paths text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (job_id, log_date)
);
create index daily_logs_company_idx on daily_logs (company_id);

create table change_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null default 0,
  status change_order_status not null default 'pending',
  source_extra_id uuid,
  priced_by uuid references profiles (id) on delete set null,
  priced_at timestamptz,
  sent_to_gc_at timestamptz,
  gc_responded_at timestamptz,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index change_orders_company_idx on change_orders (company_id);
create index change_orders_job_idx on change_orders (job_id);

create table extras (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  reported_by uuid references profiles (id) on delete set null,
  description text not null,
  hours numeric(6, 2) not null default 0,
  materials_cost numeric(10, 2) not null default 0,
  authorized_by text,
  photo_paths text[] not null default '{}',
  status extra_status not null default 'reported',
  change_order_id uuid references change_orders (id) on delete set null,
  created_at timestamptz not null default now()
);
create index extras_company_idx on extras (company_id);
create index extras_job_idx on extras (job_id);

alter table change_orders
  add constraint change_orders_source_extra_fk
  foreign key (source_extra_id) references extras (id) on delete set null;

create table tm_tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  ticket_date date not null default current_date,
  super_name text not null,
  super_email text,
  super_signature_path text,
  signed_at timestamptz,
  hours numeric(6, 2) not null default 0,
  equipment_cost numeric(10, 2) not null default 0,
  materials_cost numeric(10, 2) not null default 0,
  photo_paths text[] not null default '{}',
  gps_lat double precision,
  gps_lon double precision,
  status tm_ticket_status not null default 'draft',
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index tm_tickets_company_idx on tm_tickets (company_id);
create index tm_tickets_job_idx on tm_tickets (job_id);

create table invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  client_id uuid references clients (id) on delete set null,
  invoice_number text not null,
  subtotal numeric(12, 2) not null default 0,
  hst_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null default 0,
  holdback_amount numeric(12, 2) not null default 0,
  issued_at date not null default current_date,
  due_at date,
  paid_at date,
  status invoice_status not null default 'draft',
  created_at timestamptz not null default now(),
  unique (company_id, invoice_number)
);
create index invoices_company_idx on invoices (company_id);
create index invoices_job_idx on invoices (job_id);

create table bills (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  job_id uuid references jobs (id) on delete set null,
  vendor_name text not null,
  description text,
  amount numeric(12, 2) not null default 0,
  due_date date,
  paid_at date,
  status bill_status not null default 'unpaid',
  created_at timestamptz not null default now()
);
create index bills_company_idx on bills (company_id);
create index bills_job_idx on bills (job_id);

create table cash_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  as_of_date date not null default current_date,
  bank_balance numeric(12, 2) not null,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (company_id, as_of_date)
);
create index cash_snapshots_company_idx on cash_snapshots (company_id);

create table cash_flow_assumptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references companies (id) on delete cascade,
  overhead_monthly numeric(12, 2) not null default 0,
  payroll_per_period numeric(12, 2) not null default 0,
  payroll_frequency payroll_frequency not null default 'weekly',
  hst_reserve_pct numeric(5, 2) not null default 0,
  tax_reserve_pct numeric(5, 2) not null default 0,
  equipment_reserve_pct numeric(5, 2) not null default 0,
  profit_allocation_pct numeric(5, 2) not null default 0,
  revenue_target_annual numeric(12, 2) not null default 0,
  gross_margin_target numeric(5, 2) not null default 0,
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create table payroll_export_batches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  generated_by uuid references profiles (id) on delete set null,
  generated_at timestamptz not null default now(),
  file_path text,
  total_hours numeric(10, 2) not null default 0,
  status payroll_batch_status not null default 'generated'
);
create index payroll_export_batches_company_idx on payroll_export_batches (company_id);

create table payroll_export_lines (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references payroll_export_batches (id) on delete cascade,
  worker_id uuid not null references profiles (id) on delete cascade,
  job_id uuid references jobs (id) on delete set null,
  total_hours numeric(8, 2) not null default 0,
  regular_hours numeric(8, 2) not null default 0,
  overtime_hours numeric(8, 2) not null default 0
);
create index payroll_export_lines_batch_idx on payroll_export_lines (batch_id);
