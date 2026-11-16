-- Field app + crew punch kiosk as separate apps.
-- Shift start time on the schedule (so the foreman sees who is late), and a flag on
-- punches made at a site the person was not scheduled on (allowed, but the office sees it).
alter table schedule_entries add column if not exists start_time time;
alter table time_entries add column if not exists off_schedule boolean not null default false;
