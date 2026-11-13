-- Demo data for local development, trimmed down from the two HTML
-- prototypes. Profiles are seeded with `auth_user_id = null` — to actually
-- sign in as one of them, sign up through Supabase Auth using the matching
-- email below; the `handle_new_auth_user` trigger claims the profile for
-- you automatically. Owner: owner@demo.constructionconcierge.ai

do $$
declare
  v_company_id uuid;
  v_owner uuid;
  v_pm uuid;
  v_foreman_luca uuid;
  v_foreman_marco uuid;
  v_worker_andrei uuid;
  v_worker_kevin uuid;
  v_client_stonegate uuid;
  v_client_halcyon uuid;
  v_job_bay uuid;
  v_job_wellington uuid;
  v_talk_id uuid;
  v_extra_id uuid;
begin
  insert into companies (name, timezone)
  values ('Demo Contracting Ltd.', 'America/Toronto')
  returning id into v_company_id;

  insert into profiles (company_id, full_name, email, role)
  values (v_company_id, 'Chris Owner', 'owner@demo.constructionconcierge.ai', 'owner')
  returning id into v_owner;

  insert into profiles (company_id, full_name, email, role)
  values (v_company_id, 'Sarah K.', 'pm@demo.constructionconcierge.ai', 'pm')
  returning id into v_pm;

  insert into profiles (company_id, full_name, email, role, pin_hash)
  values (v_company_id, 'Luca Romano', 'luca@demo.constructionconcierge.ai', 'foreman', crypt('1111', gen_salt('bf')))
  returning id into v_foreman_luca;

  insert into profiles (company_id, full_name, email, role, pin_hash)
  values (v_company_id, 'Marco Di Stefano', 'marco@demo.constructionconcierge.ai', 'foreman', crypt('2222', gen_salt('bf')))
  returning id into v_foreman_marco;

  insert into profiles (company_id, full_name, role, pin_hash)
  values (v_company_id, 'Andrei Popescu', 'worker', crypt('5678', gen_salt('bf')))
  returning id into v_worker_andrei;

  insert into profiles (company_id, full_name, role, pin_hash)
  values (v_company_id, 'Kevin Mercer', 'worker', crypt('2468', gen_salt('bf')))
  returning id into v_worker_kevin;

  insert into clients (company_id, name, contact_name, contact_email)
  values (v_company_id, 'Stonegate Construction', 'R. Patel', 'rpatel@stonegate.example')
  returning id into v_client_stonegate;

  insert into clients (company_id, name, contact_name, contact_email)
  values (v_company_id, 'Halcyon Builders', 'M. Chen', 'mchen@halcyon.example')
  returning id into v_client_halcyon;

  insert into jobs (company_id, job_number, name, client_id, address, geofence_lat, geofence_lon, contract_value, status, foreman_id, percent_complete, start_date)
  values (v_company_id, 'J-26-031', 'Bay St Tower — Flrs 12-15 Interior Demo', v_client_stonegate, 'Bay St & Adelaide St W, Toronto', 43.6489, -79.3794, 486000, 'active', v_foreman_luca, 68, '2026-08-10')
  returning id into v_job_bay;

  insert into jobs (company_id, job_number, name, client_id, address, geofence_lat, geofence_lon, contract_value, status, foreman_id, percent_complete, start_date)
  values (v_company_id, 'J-26-034', 'Wellington Office — Abatement Phase 2', v_client_halcyon, 'Wellington St W & York St, Toronto', 43.6472, -79.3822, 298000, 'active', v_foreman_marco, 52, '2026-09-02')
  returning id into v_job_wellington;

  insert into toolbox_talks (company_id, job_id, title, body, created_by)
  values (v_company_id, v_job_bay, 'Silica dust when breaking concrete',
    'Wet-cut or use a HEPA shroud on every saw and breaker. P100 respirator on inside the work zone, no exceptions. Keep the zone taped off and the neg air running.',
    v_foreman_luca)
  returning id into v_talk_id;

  insert into time_entries (company_id, job_id, worker_id, clock_in_at, clock_in_lat, clock_in_lon, geofence_ok, ppe_confirmed, toolbox_talk_id)
  values
    (v_company_id, v_job_bay, v_foreman_luca, now() - interval '2 hours', 43.6489, -79.3794, true, true, v_talk_id),
    (v_company_id, v_job_bay, v_worker_andrei, now() - interval '110 minutes', 43.6489, -79.3794, true, true, v_talk_id);

  insert into extras (company_id, job_id, reported_by, description, hours, materials_cost, authorized_by, status)
  values (v_company_id, v_job_bay, v_foreman_luca, 'Found 2nd layer VCT + black mastic rm 1204-1210. Super told us to proceed.', 46, 1600, 'Super (verbal)', 'priced')
  returning id into v_extra_id;

  insert into change_orders (company_id, job_id, description, amount, status, source_extra_id, priced_by, priced_at, created_by)
  values (v_company_id, v_job_bay, 'Remove extra layer of VCT + mastic, rooms 1204-1210', 14800, 'pending', v_extra_id, v_pm, now(), v_foreman_luca);

  insert into invoices (company_id, job_id, client_id, invoice_number, subtotal, hst_amount, total_amount, holdback_amount, issued_at, due_at, status)
  values
    (v_company_id, v_job_bay, v_client_stonegate, 'INV-1201', 38000, 4940, 42940, 2470, current_date - 19, current_date + 11, 'sent'),
    (v_company_id, v_job_wellington, v_client_halcyon, 'INV-1194', 56000, 7280, 63280, 3640, current_date - 47, current_date - 17, 'overdue');

  insert into bills (company_id, job_id, vendor_name, description, amount, due_date, status)
  values
    (v_company_id, v_job_bay, 'Bin Co.', 'Equipment rental — scissor lift', 1450, current_date + 7, 'unpaid'),
    (v_company_id, null, 'Union benefits remittance', null, 5400, current_date + 7, 'unpaid'),
    (v_company_id, v_job_wellington, 'Disposal / tipping fees', null, 6240, current_date + 13, 'unpaid');

  insert into cash_snapshots (company_id, as_of_date, bank_balance, created_by)
  values (v_company_id, current_date, 184212, v_owner);

  update cash_flow_assumptions
  set overhead_monthly = 24500,
      payroll_per_period = 33800,
      payroll_frequency = 'weekly',
      hst_reserve_pct = 11.5,
      tax_reserve_pct = 4,
      equipment_reserve_pct = 2,
      profit_allocation_pct = 3,
      revenue_target_annual = 1350000,
      gross_margin_target = 28,
      updated_by = v_owner,
      updated_at = now()
  where company_id = v_company_id;
end $$;
