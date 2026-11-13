-- Simple resource calendar: which crew member is assigned to which job on
-- which day. Deliberately minimal for Phase "now" — one row per
-- worker/job/day, no shift times, no recurrence.
create table schedule_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  job_id uuid not null references jobs (id) on delete cascade,
  worker_id uuid not null references profiles (id) on delete cascade,
  work_date date not null,
  notes text,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (job_id, worker_id, work_date)
);
create index schedule_entries_company_idx on schedule_entries (company_id);
create index schedule_entries_job_idx on schedule_entries (job_id);
create index schedule_entries_date_idx on schedule_entries (work_date);

alter table schedule_entries enable row level security;

create policy schedule_entries_select on schedule_entries for select using (company_id = current_company_id());
create policy schedule_entries_insert on schedule_entries for insert with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy schedule_entries_update on schedule_entries for update using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy schedule_entries_delete on schedule_entries for delete using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
