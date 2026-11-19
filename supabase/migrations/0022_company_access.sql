-- Run in the Supabase SQL editor (after 0021). Lets you pause or cancel a company's access.
-- A paused or cancelled company's people can still sign in, but see nothing and can save nothing
-- (every table's access rule keys off current_company_id(), which now returns null for them),
-- and the app sends them to a "your account is paused" page. Their data is kept.
alter table companies
  add column if not exists access_status text not null default 'active',
  add column if not exists access_note text,
  add column if not exists access_changed_at timestamptz;
alter table companies drop constraint if exists companies_access_status_check;
alter table companies add constraint companies_access_status_check check (access_status in ('active', 'paused', 'cancelled'));

create or replace function current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.company_id
  from profiles p
  join companies c on c.id = p.company_id
  where p.auth_user_id = auth.uid() and c.access_status = 'active'
  limit 1;
$$;

-- The app asks this on every page: 'active', 'paused', 'cancelled', or null when the login has no company.
create or replace function my_access_status()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select c.access_status
  from profiles p join companies c on c.id = p.company_id
  where p.auth_user_id = auth.uid()
  limit 1;
$$;
revoke all on function my_access_status() from public, anon;
grant execute on function my_access_status() to authenticated;

create or replace function admin_set_access(p_company_id uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from platform_admins where lower(email) = lower(auth.email())) then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('active', 'paused', 'cancelled') then
    raise exception 'Unknown status';
  end if;
  if p_status <> 'active' and exists (select 1 from profiles where auth_user_id = auth.uid() and company_id = p_company_id) then
    raise exception 'You cannot pause or cancel your own company';
  end if;
  update companies
  set access_status = p_status, access_note = p_note, access_changed_at = now()
  where id = p_company_id;
end;
$$;
revoke all on function admin_set_access(uuid, text, text) from public, anon;
grant execute on function admin_set_access(uuid, text, text) to authenticated;

-- Overview now also reports each company's id, status and whether it is yours.
create or replace function admin_overview()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not exists (select 1 from platform_admins where lower(email) = lower(auth.email())) then
    raise exception 'Not authorized';
  end if;

  return jsonb_build_object(
    'logins', coalesce((
      select jsonb_agg(jsonb_build_object(
        'email', u.email,
        'created_at', u.created_at,
        'last_sign_in_at', u.last_sign_in_at,
        'confirmed', u.email_confirmed_at is not null,
        'role', p.role,
        'status', p.status,
        'company', c.name
      ) order by u.created_at desc)
      from auth.users u
      left join profiles p on p.auth_user_id = u.id
      left join companies c on c.id = p.company_id
    ), '[]'::jsonb),
    'companies', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'name', c.name,
        'created_at', c.created_at,
        'access_status', c.access_status,
        'access_note', c.access_note,
        'is_mine', exists (select 1 from profiles me where me.auth_user_id = auth.uid() and me.company_id = c.id),
        'people', (select count(*) from profiles p where p.company_id = c.id and p.status = 'active'),
        'logins', (select count(*) from profiles p where p.company_id = c.id and p.auth_user_id is not null),
        'jobs', (select count(*) from jobs j where j.company_id = c.id),
        'punches_7d', (select count(*) from time_entries t where t.company_id = c.id and t.clock_in_at > now() - interval '7 days'),
        'last_punch', (select max(t.clock_in_at) from time_entries t where t.company_id = c.id)
      ) order by c.created_at)
      from companies c
    ), '[]'::jsonb),
    'pending_invites', coalesce((
      select jsonb_agg(jsonb_build_object('email', p.email, 'role', p.role, 'company', c.name))
      from profiles p join companies c on c.id = p.company_id
      where p.auth_user_id is null and p.email is not null
    ), '[]'::jsonb)
  );
end;
$$;
