-- Run in the Supabase SQL editor. Lets the owner/PM issue a new 6-digit login code for a
-- kiosk (jobsite iPad) account from the Team page. The code is returned once and never stored in plain text.
create or replace function reset_kiosk_code(p_profile_id uuid)
returns text
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_auth uuid;
  v_code text;
begin
  if current_profile_role() not in ('owner', 'pm') then
    raise exception 'Only the owner or PM can reset a login code';
  end if;
  select auth_user_id into v_auth from profiles
    where id = p_profile_id and company_id = current_company_id() and role = 'kiosk';
  if v_auth is null then
    raise exception 'Not a kiosk login in your company';
  end if;
  v_code := (floor(random() * 900000) + 100000)::int::text;
  update auth.users set encrypted_password = extensions.crypt(v_code, extensions.gen_salt('bf')), updated_at = now()
    where id = v_auth;
  return v_code;
end;
$$;
grant execute on function reset_kiosk_code(uuid) to authenticated;
