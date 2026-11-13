-- Storage buckets for photos/signatures. Every object path starts with
-- "<company_id>/...", so the policy can check the first path segment
-- against the caller's own company with no table join.

insert into storage.buckets (id, name, public)
values
  ('punch-photos', 'punch-photos', false),
  ('incident-photos', 'incident-photos', false),
  ('daily-log-photos', 'daily-log-photos', false),
  ('tm-ticket-photos', 'tm-ticket-photos', false),
  ('signatures', 'signatures', false)
on conflict (id) do nothing;

create policy "read own company punch photos" on storage.objects
  for select using (bucket_id = 'punch-photos' and (storage.foldername(name))[1] = current_company_id()::text);
create policy "write own company punch photos" on storage.objects
  for insert with check (bucket_id = 'punch-photos' and (storage.foldername(name))[1] = current_company_id()::text);

create policy "read own company incident photos" on storage.objects
  for select using (bucket_id = 'incident-photos' and (storage.foldername(name))[1] = current_company_id()::text);
create policy "write own company incident photos" on storage.objects
  for insert with check (bucket_id = 'incident-photos' and (storage.foldername(name))[1] = current_company_id()::text);

create policy "read own company daily log photos" on storage.objects
  for select using (bucket_id = 'daily-log-photos' and (storage.foldername(name))[1] = current_company_id()::text);
create policy "write own company daily log photos" on storage.objects
  for insert with check (bucket_id = 'daily-log-photos' and (storage.foldername(name))[1] = current_company_id()::text);

create policy "read own company tm ticket photos" on storage.objects
  for select using (bucket_id = 'tm-ticket-photos' and (storage.foldername(name))[1] = current_company_id()::text);
create policy "write own company tm ticket photos" on storage.objects
  for insert with check (bucket_id = 'tm-ticket-photos' and (storage.foldername(name))[1] = current_company_id()::text);

create policy "read own company signatures" on storage.objects
  for select using (bucket_id = 'signatures' and (storage.foldername(name))[1] = current_company_id()::text);
create policy "write own company signatures" on storage.objects
  for insert with check (bucket_id = 'signatures' and (storage.foldername(name))[1] = current_company_id()::text);
