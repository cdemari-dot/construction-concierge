-- Computed read models. `security_invoker = true` is essential here: without
-- it, these views would run with the view owner's privileges and quietly
-- bypass the RLS policies on the tables underneath — the one thing we must
-- never allow in a multi-tenant app.

create or replace view job_financial_summary
with (security_invoker = true) as
select
  j.id as job_id,
  j.company_id,
  j.contract_value,
  coalesce(inv.total_invoiced, 0) as total_invoiced,
  coalesce(inv.total_paid, 0) as total_paid,
  coalesce(inv.total_outstanding, 0) as total_outstanding,
  coalesce(inv.total_holdback, 0) as total_holdback,
  coalesce(co.approved_change_orders, 0) as approved_change_orders,
  coalesce(b.total_bills, 0) as total_bills,
  coalesce(b.unpaid_bills, 0) as unpaid_bills
from jobs j
left join (
  select
    job_id,
    sum(total_amount) as total_invoiced,
    sum(case when paid_at is not null then total_amount else 0 end) as total_paid,
    sum(case when paid_at is null then total_amount else 0 end) as total_outstanding,
    sum(holdback_amount) as total_holdback
  from invoices
  group by job_id
) inv on inv.job_id = j.id
left join (
  select job_id, sum(amount) as approved_change_orders
  from change_orders
  where status = 'approved'
  group by job_id
) co on co.job_id = j.id
left join (
  select
    job_id,
    sum(amount) as total_bills,
    sum(case when status = 'unpaid' then amount else 0 end) as unpaid_bills
  from bills
  where job_id is not null
  group by job_id
) b on b.job_id = j.id;

create or replace view company_cash_position
with (security_invoker = true) as
select
  c.id as company_id,
  latest.bank_balance,
  latest.as_of_date,
  coalesce(ar.open_ar, 0) as open_ar,
  coalesce(ap.open_ap, 0) as open_ap
from companies c
left join lateral (
  select bank_balance, as_of_date
  from cash_snapshots cs
  where cs.company_id = c.id
  order by as_of_date desc
  limit 1
) latest on true
left join (
  select company_id, sum(total_amount) as open_ar
  from invoices
  where paid_at is null
  group by company_id
) ar on ar.company_id = c.id
left join (
  select company_id, sum(amount) as open_ap
  from bills
  where status = 'unpaid'
  group by company_id
) ap on ap.company_id = c.id;

create or replace view who_is_clocked_in
with (security_invoker = true) as
select
  te.id as time_entry_id,
  te.company_id,
  te.job_id,
  j.name as job_name,
  te.worker_id,
  p.full_name as worker_name,
  p.role as worker_role,
  te.clock_in_at,
  te.geofence_ok
from time_entries te
join jobs j on j.id = te.job_id
join profiles p on p.id = te.worker_id
where te.clock_out_at is null;
