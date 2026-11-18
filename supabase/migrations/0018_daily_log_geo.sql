-- Run in the Supabase SQL editor (after 0017). Daily log gets: where it was written (GPS),
-- the nearest hospital, and a list of containers/bins on site.
alter table daily_logs
  add column if not exists gps_lat numeric,
  add column if not exists gps_lon numeric,
  add column if not exists hospital_name text,
  add column if not exists hospital_address text,
  add column if not exists hospital_phone text,
  add column if not exists hospital_lat numeric,
  add column if not exists hospital_lon numeric,
  add column if not exists hospital_distance_m integer,
  add column if not exists containers jsonb not null default '[]'::jsonb;
