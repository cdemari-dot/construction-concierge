-- Per-company split of the overhead budget across categories (rent, vehicles, insurance,
-- office staff, other) for the "What you can afford" tab. Null = the typical contractor split.
alter table cash_flow_assumptions add column if not exists afford_weights jsonb;
