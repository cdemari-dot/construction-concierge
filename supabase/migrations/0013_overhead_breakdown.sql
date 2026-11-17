-- What the company spends per month on each overhead category, so the "What you can afford"
-- tab can compare each one to its healthy ceiling. overhead_monthly stays the total used by the
-- cash forecast; these are optional detail (anything not itemised shows as "other").
alter table cash_flow_assumptions
  add column if not exists rent_monthly numeric not null default 0,
  add column if not exists vehicles_monthly numeric not null default 0,
  add column if not exists insurance_monthly numeric not null default 0,
  add column if not exists office_staff_monthly numeric not null default 0,
  add column if not exists other_monthly numeric not null default 0;
