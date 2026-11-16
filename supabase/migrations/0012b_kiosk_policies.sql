-- Run after 0012_kiosk_role.sql. The kiosk session punches for whichever worker's PIN was
-- entered, so it needs the same write access as foreman on time entries, and it must be able to
-- create the day's safety talk if nobody has yet.
drop policy if exists time_entries_insert on time_entries;
create policy time_entries_insert on time_entries for insert with check (
  company_id = current_company_id()
  and (current_profile_role() in ('owner', 'pm', 'foreman', 'kiosk') or worker_id = current_profile_id())
);
drop policy if exists time_entries_update on time_entries;
create policy time_entries_update on time_entries for update
  using (
    company_id = current_company_id()
    and (current_profile_role() in ('owner', 'pm', 'foreman', 'kiosk') or worker_id = current_profile_id())
  )
  with check (
    payroll_status = 'pending' or current_profile_role() in ('owner', 'pm')
  );
drop policy if exists toolbox_talks_insert on toolbox_talks;
create policy toolbox_talks_insert on toolbox_talks for insert with check (
  company_id = current_company_id() and current_profile_role() in ('owner', 'pm', 'foreman', 'kiosk')
);
