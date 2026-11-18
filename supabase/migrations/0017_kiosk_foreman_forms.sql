-- Run in the Supabase SQL editor. Lets the jobsite iPad (role 'kiosk') save the forms a foreman
-- fills in after entering their PIN on the kiosk: T&M tickets and daily logs. Incident reports and
-- photo/signature uploads already allow any signed-in person in the company.
drop policy if exists tm_tickets_insert on tm_tickets;
create policy tm_tickets_insert on tm_tickets for insert
  with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm', 'foreman', 'kiosk'));
drop policy if exists tm_tickets_update on tm_tickets;
create policy tm_tickets_update on tm_tickets for update
  using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm', 'foreman', 'kiosk'));

drop policy if exists daily_logs_insert on daily_logs;
create policy daily_logs_insert on daily_logs for insert
  with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm', 'foreman', 'kiosk'));
drop policy if exists daily_logs_update on daily_logs;
create policy daily_logs_update on daily_logs for update
  using (company_id = current_company_id() and current_profile_role() in ('owner', 'pm', 'foreman', 'kiosk'));
