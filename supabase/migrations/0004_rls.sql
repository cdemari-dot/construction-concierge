-- Row-level security. Every business table is scoped to the caller's own
-- company via current_company_id(); write access is further narrowed by
-- role where it matters (pricing, approvals, finance, payroll).

alter table companies enable row level security;
alter table profiles enable row level security;
alter table clients enable row level security;
alter table jobs enable row level security;
alter table toolbox_talks enable row level security;
alter table time_entries enable row level security;
alter table toolbox_talk_acknowledgements enable row level security;
alter table incident_reports enable row level security;
alter table daily_logs enable row level security;
alter table extras enable row level security;
alter table change_orders enable row level security;
alter table tm_tickets enable row level security;
alter table invoices enable row level security;
alter table bills enable row level security;
alter table cash_snapshots enable row level security;
alter table cash_flow_assumptions enable row level security;
alter table payroll_export_batches enable row level security;
alter table payroll_export_lines enable row level security;

-- companies
create policy companies_select on companies
  for select using (id = current_company_id());

-- profiles
create policy profiles_select on profiles
  for select using (company_id = current_company_id());
create policy profiles_insert on profiles
  for insert with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy profiles_update_by_manager on profiles
  for update using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy profiles_update_self on profiles
  for update using (auth_user_id = auth.uid());
create policy profiles_delete on profiles
  for delete using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));

-- clients (the GCs we bill)
create policy clients_select on clients for select using (company_id = current_company_id());
create policy clients_insert on clients for insert with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy clients_update on clients for update using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy clients_delete on clients for delete using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));

-- jobs
create policy jobs_select on jobs for select using (company_id = current_company_id());
create policy jobs_insert on jobs for insert with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy jobs_update on jobs for update using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy jobs_delete on jobs for delete using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));

-- toolbox_talks: office + foreman author them, whole company can read.
create policy toolbox_talks_select on toolbox_talks for select using (company_id = current_company_id());
create policy toolbox_talks_insert on toolbox_talks for insert with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm', 'foreman'));
create policy toolbox_talks_update on toolbox_talks for update using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm', 'foreman'));

-- time_entries: the punch clock. Office/foreman roles can write any
-- worker's entry (this is what makes the shared-kiosk PIN flow work — the
-- authenticated session is the foreman's, the PIN just picks the worker);
-- a worker with their own login can only touch their own entries.
create policy time_entries_select on time_entries for select using (company_id = current_company_id());
create policy time_entries_insert on time_entries for insert with check (
  company_id = current_company_id()
  and (current_profile_role() in ('owner', 'pm', 'foreman') or worker_id = current_profile_id())
);
create policy time_entries_update on time_entries for update
  using (
    company_id = current_company_id()
    and (current_profile_role() in ('owner', 'pm', 'foreman') or worker_id = current_profile_id())
  )
  with check (
    payroll_status = 'pending' or current_profile_role() in ('owner', 'pm')
  );

-- toolbox_talk_acknowledgements
create policy tta_select on toolbox_talk_acknowledgements for select using (
  exists (select 1 from toolbox_talks t where t.id = toolbox_talk_id and t.company_id = current_company_id())
);
create policy tta_insert on toolbox_talk_acknowledgements for insert with check (
  exists (select 1 from toolbox_talks t where t.id = toolbox_talk_id and t.company_id = current_company_id())
);

-- incident_reports: anyone in the company can file one; only office closes it.
create policy incident_reports_select on incident_reports for select using (company_id = current_company_id());
create policy incident_reports_insert on incident_reports for insert with check (company_id = current_company_id());
create policy incident_reports_update on incident_reports for update using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));

-- daily_logs
create policy daily_logs_select on daily_logs for select using (company_id = current_company_id());
create policy daily_logs_insert on daily_logs for insert with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm', 'foreman'));
create policy daily_logs_update on daily_logs for update using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm', 'foreman'));

-- extras: field reports it, office prices/approves it.
create policy extras_select on extras for select using (company_id = current_company_id());
create policy extras_insert on extras for insert with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm', 'foreman'));
create policy extras_update on extras for update using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));

-- change_orders: field can propose one (status stays 'pending'); only
-- office can move it to 'approved' — enforced in the WITH CHECK, not just
-- the app, so a compromised field session still can't self-approve money.
create policy change_orders_select on change_orders for select using (company_id = current_company_id());
create policy change_orders_insert on change_orders for insert with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm', 'foreman'));
create policy change_orders_update on change_orders for update
  using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'))
  with check (status <> 'approved' or current_profile_role() in ('owner', 'pm'));

-- tm_tickets
create policy tm_tickets_select on tm_tickets for select using (company_id = current_company_id());
create policy tm_tickets_insert on tm_tickets for insert with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm', 'foreman'));
create policy tm_tickets_update on tm_tickets for update using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm', 'foreman'));

-- invoices / bills / cash / payroll: office only, end to end.
create policy invoices_select on invoices for select using (company_id = current_company_id());
create policy invoices_insert on invoices for insert with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy invoices_update on invoices for update using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy invoices_delete on invoices for delete using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));

create policy bills_select on bills for select using (company_id = current_company_id());
create policy bills_insert on bills for insert with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy bills_update on bills for update using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy bills_delete on bills for delete using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));

create policy cash_snapshots_select on cash_snapshots for select using (company_id = current_company_id());
create policy cash_snapshots_insert on cash_snapshots for insert with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));

create policy cash_flow_assumptions_select on cash_flow_assumptions for select using (company_id = current_company_id());
create policy cash_flow_assumptions_insert on cash_flow_assumptions for insert with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
create policy cash_flow_assumptions_update on cash_flow_assumptions for update using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));

create policy payroll_batches_select on payroll_export_batches for select using (company_id = current_company_id());
create policy payroll_batches_insert on payroll_export_batches for insert with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));

create policy payroll_lines_select on payroll_export_lines for select using (
  exists (select 1 from payroll_export_batches b where b.id = batch_id and b.company_id = current_company_id())
);
create policy payroll_lines_insert on payroll_export_lines for insert with check (
  exists (select 1 from payroll_export_batches b where b.id = batch_id and b.company_id = current_company_id())
);
