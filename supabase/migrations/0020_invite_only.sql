-- Run in the Supabase SQL editor. Makes sign-up invite-only at the database, so it holds even if
-- someone calls the sign-up API directly:
--  1. A new login can only be created for an email that already has an invited profile.
--  2. Self-service company creation is switched off. New companies are created by you.
-- Existing logins are not affected.
create or replace function block_uninvited_signups()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from profiles
    where auth_user_id is null
      and email is not null
      and lower(email) = lower(new.email)
  ) then
    raise exception 'Sign-up is by invitation only. Ask your company owner to invite you.';
  end if;
  return new;
end;
$$;

drop trigger if exists block_uninvited_signups on auth.users;
create trigger block_uninvited_signups
  before insert on auth.users
  for each row execute function block_uninvited_signups();

create or replace function create_company_and_owner(company_name text, owner_full_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Company sign-up is closed. Contact hello@constructionconcierge.ai.';
end;
$$;
