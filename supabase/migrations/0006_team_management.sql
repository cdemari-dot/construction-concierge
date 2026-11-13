-- Lets an Owner/PM set or change a crew member's kiosk PIN without ever
-- handling the hash client-side. Mirrors verify_worker_pin's security
-- model: security definer, scoped to the caller's own company.
create or replace function set_worker_pin(p_profile_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if current_profile_role() not in ('owner', 'pm') then
    raise exception 'Only an Owner or PM can set a crew member''s PIN';
  end if;

  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN must be exactly 4 digits';
  end if;

  update profiles
  set pin_hash = crypt(p_pin, gen_salt('bf'))
  where id = p_profile_id
    and company_id = current_company_id();

  if not found then
    raise exception 'Profile not found in your company';
  end if;
end;
$$;
