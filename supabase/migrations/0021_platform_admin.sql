-- Run in the Supabase SQL editor. Adds a private "Platform admin" overview for you only
-- (the app page is /admin). Only emails listed in platform_admins can read it.
create table if not exists platform_admins (email text primary key);
alter table platform_admins enable row level security; -- no policies: nobody reads it through the API
insert into platform_admins (email) values ('chris@demstos.com') on conflict do nothing;

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
        'name', c.name,
        'created_at', c.created_at,
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
revoke all on function admin_overview() from public, anon;
grant execute on function admin_overview() to authenticated;
