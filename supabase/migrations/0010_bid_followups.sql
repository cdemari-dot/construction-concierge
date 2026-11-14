-- Conversion tracking + automated follow-up emails for bids.
alter table bids
  add column contact_email text,
  add column auto_follow_up boolean not null default true,
  add column follow_up_count integer not null default 0,
  add column last_follow_up_at timestamptz,
  add column submitted_at timestamptz;

update bids set submitted_at = stage_changed_at where stage in ('submitted', 'won') and submitted_at is null;

create table bid_follow_ups (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies (id) on delete cascade,
  bid_id uuid not null references bids (id) on delete cascade,
  sent_at timestamptz not null default now(),
  to_email text not null,
  subject text not null,
  kind text not null check (kind in ('auto', 'manual')),
  status text not null check (status in ('sent', 'failed')),
  error text
);
create index bid_follow_ups_bid_idx on bid_follow_ups (bid_id);

alter table bid_follow_ups enable row level security;
create policy bid_follow_ups_select on bid_follow_ups for select using (company_id = current_company_id());
create policy bid_follow_ups_insert on bid_follow_ups for insert
  with check (company_id = current_company_id() and current_profile_role() in ('owner', 'pm'));
