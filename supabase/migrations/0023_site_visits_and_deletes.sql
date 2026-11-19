-- Run in the Supabase SQL editor. Adds: deleting bids, and a Site visits scheduler.
-- (Cancelling a pending invite uses the existing delete rule on profiles.)
drop policy if exists bids_delete on bids;
create policy bids_delete on bids for delete
  using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));

create table if not exists site_visits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  bid_id uuid references bids (id) on delete set null,
  job_id uuid references jobs (id) on delete set null,
  title text not null,
  address text,
  visit_on date not null,
  start_time time,
  assigned_to uuid references profiles (id) on delete set null,
  notes text,
  status text not null default 'scheduled' check (status in ('scheduled', 'done', 'cancelled')),
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists site_visits_company_idx on site_visits (company_id, visit_on);
alter table site_visits enable row level security;
create policy site_visits_select on site_visits for select using (company_id = current_company_id());
create policy site_visits_insert on site_visits for insert
  with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy site_visits_update on site_visits for update
  using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy site_visits_delete on site_visits for delete
  using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
