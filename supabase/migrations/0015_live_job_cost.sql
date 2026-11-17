-- Live job cost: shifts that are still running (no clock-out yet) count up to "now", so the
-- Jobs page moves as soon as someone punches in. A forgotten punch-out is capped at 16 hours
-- so it cannot run away. Completed shifts are unchanged.
create or replace view job_labour_cost
with (security_invoker = true) as
select
  te.company_id,
  te.job_id,
  sum(extract(epoch from (coalesce(te.clock_out_at, least(now(), te.clock_in_at + interval '16 hours')) - te.clock_in_at)) / 3600.0) as hours,
  sum(extract(epoch from (coalesce(te.clock_out_at, least(now(), te.clock_in_at + interval '16 hours')) - te.clock_in_at)) / 3600.0 * coalesce(pr.hourly_rate, 0)) as labour_cost,
  count(*) filter (where pr.hourly_rate is null) as unrated_shifts,
  count(*) filter (where te.clock_out_at is null) as open_shifts,
  -- $/hour currently accruing from people still clocked in (lets the page tick by the minute)
  coalesce(sum(coalesce(pr.hourly_rate, 0)) filter (where te.clock_out_at is null and now() < te.clock_in_at + interval '16 hours'), 0) as open_rate
from time_entries te
left join pay_rates pr on pr.profile_id = te.worker_id
group by te.company_id, te.job_id;
