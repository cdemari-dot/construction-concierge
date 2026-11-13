-- Helper functions used throughout RLS policies. All are `security definer`
-- so they can read `profiles` even though `profiles` itself is RLS-locked —
-- otherwise every policy that calls them would recurse into itself.

create or replace function current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from profiles where auth_user_id = auth.uid() limit 1;
$$;

create or replace function current_profile_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where auth_user_id = auth.uid() limit 1;
$$;

-- Bootstraps a brand-new tenant: call once, right after Supabase Auth
-- sign-up, to create the company and make the signed-up user its Owner.
-- Refuses to run again for an account that's already linked to a company.
create or replace function create_company_and_owner(company_name text, owner_full_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Must be signed in';
  end if;

  if exists (select 1 from profiles where auth_user_id = auth.uid()) then
    raise exception 'This account is already linked to a company';
  end if;

  insert into companies (name) values (company_name) returning id into new_company_id;

  insert into profiles (auth_user_id, company_id, full_name, email, role)
  values (auth.uid(), new_company_id, owner_full_name, auth.email(), 'owner');

  insert into cash_flow_assumptions (company_id) values (new_company_id);

  return new_company_id;
end;
$$;

-- When an invited PM/Foreman accepts their invite and signs in for the
-- first time, auth.users gets a new row. If the Owner/PM already created a
-- placeholder profile for that email (auth_user_id still null), claim it.
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles
  set auth_user_id = new.id
  where auth_user_id is null
    and email is not null
    and lower(email) = lower(new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();

-- The kiosk PIN pad never gets to see password hashes: the authenticated
-- device session (a Foreman/PM/Owner login) calls this, and only a
-- matching worker's id/name/role comes back — never pin_hash itself.
-- Scoped to the caller's own company, so a 4-digit PIN only has to be
-- unique within one company, not globally.
create or replace function verify_worker_pin(p_pin text)
returns table (id uuid, full_name text, role user_role)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select p.id, p.full_name, p.role
  from profiles p
  where p.company_id = current_company_id()
    and p.status = 'active'
    and p.pin_hash is not null
    and p.pin_hash = crypt(p_pin, p.pin_hash)
  limit 1;
$$;
