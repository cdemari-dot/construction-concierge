-- Run in the Supabase SQL editor (after 0018). The PM designated on a job gets a copy of every
-- signed T&M ticket for that job (the client gets the other copy).
alter table jobs add column if not exists pm_id uuid references profiles (id) on delete set null;
