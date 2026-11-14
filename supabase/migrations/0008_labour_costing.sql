-- Labour costing. Pay rates live in their own table, not on `profiles`,
-- because every signed-in session in a company (including the Foreman
-- kiosk) can read profiles. Rates are Owner/PM-only.
create table pay_rates (
  profile_id uuid primary key references profiles (id) on delete cascade,
  company_id uuid not null references companies (id) on delete cascade,
  hourly_rate numeric(8, 2) not null check (hourly_rate >= 0),
  updated_at timestamptz not null default now()
);
create index pay_rates_company_idx on pay_rates (company_id);

alter table pay_rates enable row level security;

create policy pay_rates_select on pay_rates for select using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy pay_rates_insert on pay_rates for insert with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy pay_rates_update on pay_rates for update using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy pay_rates_delete on pay_rates for delete using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));

-- Completed shifts only. security_invoker so it inherits the pay_rates RLS:
-- anyone who can't read rates sees labour_cost of 0, never a leaked figure.
create or replace view job_labour_cost
with (security_invoker = true) as
select
  te.company_id,
  te.job_id,
  sum(extract(epoch from (te.clock_out_at - te.clock_in_at)) / 3600.0) as hours,
  sum(extract(epoch from (te.clock_out_at - te.clock_in_at)) / 3600.0 * coalesce(pr.hourly_rate, 0)) as labour_cost,
  count(*) filter (where pr.hourly_rate is null) as unrated_shifts
from time_entries te
left join pay_rates pr on pr.profile_id = te.worker_id
where te.clock_out_at is not null
group by te.company_id, te.job_id;
