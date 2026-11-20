-- Run in the Supabase SQL editor. Per-job hours + bin budgets.
-- The owner/PM sets the real budget and the % handed to the foreman. Foremen cannot read this
-- table; they only get the allocated numbers (and what has been used) through job_allocation().
create table if not exists job_budgets (
  job_id uuid primary key references jobs (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  budget_hours numeric,
  hours_pct numeric not null default 100 check (hours_pct > 0 and hours_pct <= 200),
  budget_bins numeric,
  bins_pct numeric not null default 100 check (bins_pct > 0 and bins_pct <= 200),
  updated_at timestamptz not null default now()
);
alter table job_budgets enable row level security;
drop policy if exists job_budgets_select on job_budgets;
drop policy if exists job_budgets_insert on job_budgets;
drop policy if exists job_budgets_update on job_budgets;
drop policy if exists job_budgets_delete on job_budgets;
create policy job_budgets_select on job_budgets for select
  using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy job_budgets_insert on job_budgets for insert
  with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy job_budgets_update on job_budgets for update
  using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy job_budgets_delete on job_budgets for delete
  using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));

-- What a foreman may see: allocated = budget x percent. Used hours = all punches on the job
-- (open punches count up to now). Used bins = bins logged as Hauled or Swapped in daily logs.
create or replace function job_allocation(p_job uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  b job_budgets;
  hrs numeric;
  bins numeric;
begin
  if not exists (select 1 from jobs where id = p_job and company_id = current_company_id()) then
    return null;
  end if;
  select * into b from job_budgets where job_id = p_job;
  select coalesce(sum(extract(epoch from (coalesce(clock_out_at, now()) - clock_in_at)) / 3600), 0)
    into hrs from time_entries where job_id = p_job;
  select coalesce(sum((c ->> 'qty')::numeric), 0) into bins
    from daily_logs d, jsonb_array_elements(coalesce(d.containers, '[]'::jsonb)) c
    where d.job_id = p_job and (c ->> 'status') in ('Hauled', 'Swapped');
  return json_build_object(
    'hours_allocated', case when b.budget_hours is null then null else round(b.budget_hours * b.hours_pct / 100, 1) end,
    'hours_used', round(hrs, 1),
    'bins_allocated', case when b.budget_bins is null then null else floor(b.budget_bins * b.bins_pct / 100) end,
    'bins_used', bins
  );
end;
$$;
grant execute on function job_allocation(uuid) to authenticated;
