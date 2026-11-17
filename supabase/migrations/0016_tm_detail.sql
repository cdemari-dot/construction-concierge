-- More detail on T&M tickets: what was done, where, and the equipment and materials used (quantities only,
-- no prices). Additive and optional, so existing tickets are unaffected.
alter table tm_tickets
  add column if not exists work_description text,
  add column if not exists work_area text,
  add column if not exists equipment jsonb not null default '[]'::jsonb,
  add column if not exists materials jsonb not null default '[]'::jsonb;

-- Company logo for printed sheets (T&M ticket etc.). The file lives in a private bucket under
-- "<company_id>/", the path is saved on the company, and only an Owner/PM can change it.
alter table companies add column if not exists logo_path text;

create policy companies_update on companies
  for update using (id = current_company_id() and current_profile_role() in ('owner', 'pm'))
  with check (id = current_company_id());

insert into storage.buckets (id, name, public) values ('company-logos', 'company-logos', false) on conflict (id) do nothing;

create policy "read own company logos" on storage.objects
  for select using (bucket_id = 'company-logos' and (storage.foldername(name))[1] = current_company_id()::text);
create policy "write own company logos" on storage.objects
  for insert with check (bucket_id = 'company-logos' and (storage.foldername(name))[1] = current_company_id()::text and current_profile_role() in ('owner', 'pm'));
create policy "replace own company logos" on storage.objects
  for update using (bucket_id = 'company-logos' and (storage.foldername(name))[1] = current_company_id()::text and current_profile_role() in ('owner', 'pm'));
