-- CRM: bid pipeline (Lead -> Estimating -> Submitted -> Won / Lost).
-- Per the project convention there is no delete: a dead bid is moved to 'lost'.
create table bids (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  client_id uuid references clients (id) on delete set null,
  name text not null,
  address text,
  contact text,
  value numeric(12, 2) not null default 0,
  stage text not null default 'lead' check (stage in ('lead', 'estimating', 'submitted', 'won', 'lost')),
  bid_due date,
  follow_up_on date,
  notes text,
  lost_reason text,
  job_id uuid references jobs (id) on delete set null,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  stage_changed_at timestamptz not null default now()
);
create index bids_company_idx on bids (company_id);
create index bids_stage_idx on bids (company_id, stage);

alter table bids enable row level security;
create policy bids_select on bids for select using (company_id = current_company_id());
create policy bids_insert on bids for insert
  with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy bids_update on bids for update
  using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
