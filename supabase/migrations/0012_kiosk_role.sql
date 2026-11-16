-- A dedicated login role for the jobsite iPad (Crew Punch). Run the ALTER TYPE line on its own
-- first (a new enum value can't be used in the same transaction), then the rest.
alter type user_role add value if not exists 'kiosk';
