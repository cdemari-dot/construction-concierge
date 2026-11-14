# Construction Concierge — Project Memory

Owner's CFO + back-office app for small Ontario construction/demolition/abatement
contractors (≤50 employees). Product site: constructionconcierge.ai

## Design reference

Two clickable HTML prototypes define the look, feel and feature set. Treat them as
the UX/visual source of truth; do not redesign without a reason:
- `construction-concierge-dashboard.html` (desktop) — Owner/PM command center:
  sidebar nav, animated dials, cash flow chart, kanban, AI agent drawer.
- `construction-concierge-ipad-punch-clock.html` (kiosk) — shared-iPad clock-in flow:
  PIN pad → photo → PPE checklist → toolbox talk sign-off → clock in; clock-out adds
  an injury Y/N question then a shift report.

Visual language: near-black (`#0B0B0D`) card UI, gold/cyan accent (`#C8A464`),
Bodoni Moda (display) + Inter (body) + JetBrains Mono (numbers), light mode via
`[data-theme=light]` CSS variable overrides.

### Real logo asset
The actual brand mark (black rounded-square icon, white "CC" + green accent
dot, plus a wordmark lockup) lives at `public/brand/logo-mark.png` (icon only,
background flood-filled transparent so it sits cleanly on the dark theme) and
`public/brand/logo-lockup.jpg` (icon + wordmark, as originally supplied). It's
used as: the app icon / favicon / apple touch icon (`app/icon.png`,
`app/apple-icon.png`), and the actual logo badge on the login page, the
onboarding page, and the owner sidebar header (replacing the CSS-drawn gold
`.cc-logo` placeholder in those three spots). The gold/black dashboard theme
and accent color from the prototypes are otherwise unchanged — this was a
deliberate, scoped swap of the logo graphic only, not a rebrand. Don't extend
the black/white/green palette elsewhere without asking again.

The dashboard prototype also shows CRM/bids, inventory, scheduler, an integrations
marketplace and an AI agent chat drawer. **Those are later-phase ideas, not Phase 1.**
See "Explicitly out of scope" below.

## Phase 1 scope (this build)

1. Logins with 4 roles — Owner, PM, Foreman, Worker. Full multi-tenant data
   isolation per company.
2. Foreman/Worker mobile web app: clock in/out with GPS + photo, PPE check,
   toolbox-talk sign-off, injury Y/N at clock-out (documentation only, not WSIB
   filing), daily log, extras capture, T&M tickets with GC super signature,
   injury/incident report routed to the office.
3. Owner dashboard: who's clocked in now, cash position, AR/AP, jobs list.
4. Change orders: field extra → PM prices it → sent to GC.
5. Weekly CSV export of **approved** hours for the customer's payroll provider.
   We never run payroll ourselves.
6. 13-week cash flow forecast + CFO playbook, fed by manually entered data.

### Added after Phase 1 went live
Once the app was actually deployed, it became clear Phase 1 was missing the
basic *write* side of its own scope — there was no way to add a job, a
client, an invoice, a bill, or a crew member at all. Fixed by adding:
- **Team** (`/team`): Owner/PM add Foreman/Worker (full name, phone, a
  4-digit PIN set via the `set_worker_pin` RPC — never hashed client-side)
  or invite an Owner/PM by email (`/accept-invite` + the existing
  `handle_new_auth_user` trigger claims their profile the moment they sign
  up, no onboarding step needed since the company already exists).
- **Clients** (`/clients`): add/list the GCs jobs bill to.
- **Jobs** (`/jobs/new`): create a job (number, name, client, address,
  geofence, contract value, foreman, start date).
- **Finance** (`/finance`): add an invoice (AR) or a bill (AP), mark either
  paid.
- **Schedule** (`/schedule`, `schedule_entries` table): a simple 7-day
  grid — assign a crew member to a job on a date. Deliberately minimal, no
  shift times or recurrence.

At the same time, the user asked to pull the AI agent and the Scheduler in
from "later-phase" into now (the CRM/bids, inventory, and integrations
marketplace are still deferred — only the agent and scheduler moved up):
- **AI agent** (`components/agent/AgentDrawer.tsx`, `app/api/agent/route.ts`,
  `lib/ai/tools.ts`): a chat drawer for Owner/PM, backed by the Anthropic
  Messages API with tool use. Every tool runs through the signed-in user's
  own RLS-scoped Supabase client — the agent can only ever see what that
  user could already see. Needs `ANTHROPIC_API_KEY` in the environment;
  the route returns a clear 503 instead of crashing if it's unset.

### Labour costing and job margin
Each Foreman/Worker has a private hourly cost (wage plus payroll burden) in
`pay_rates` — a separate table, not a column on `profiles`, because every
signed-in session in a company (including the Foreman kiosk) can read
`profiles`; `pay_rates` RLS is Owner/PM only. The `job_labour_cost` view
(security_invoker, so it inherits that RLS) sums completed shift hours ×
rate per job. Job margin on `/jobs` = (billed − bills coded to the job −
labour cost) ÷ billed. Shifts for someone with no rate set count as $0 and
are flagged on the job card. Overhead is not allocated to jobs.

### Jobs globe
`/jobs` shows a globe.gl real-Earth globe (SVG map pins) with a pin per job (from `jobs.geofence_lat/lon`).
New jobs get coordinates from their address via OpenStreetMap Nominatim
(best-effort, 5 s timeout) or the "use my current location" button.

### Field app launcher and role routing
`lib/auth/home.ts` `homeFor(role)`: Foreman/Worker logins land on `/m`, Owner/PM on
`/dashboard` (used by `/`, `proxy.ts`, `requireRole`). Owners can invite Foremen by
email at `/team`. `/field` (Owner sidebar) lists a QR code + link for the Foreman
phone app and for each active job's kiosk (`/kiosk/[jobId]`). The kiosk reports
failures honestly (error screen) and only lists what actually saved.

### Field reports, toolbox talks, T&M signatures
`/toolbox` (Owner/PM): publish a toolbox talk per job and date (4 Ontario templates);
the kiosk shows the talk dated today in Toronto time (`lib/today.ts`, never UTC).
`/field-reports` (tabs): incidents (mark closed), daily logs, extras (-> "Create
change order", which makes a pending change order the PM prices on /change-orders),
T&M tickets (signature image via signed URL; signed -> sent to GC -> billed). T&M
signatures are drawn on `components/field/SignaturePad.tsx` and stored in the
private `signatures` bucket; if the upload fails the ticket is not saved.

### CRM (bid pipeline)
`/crm` (Owner/PM): kanban of bids (Lead, Estimating, Bid sent, Won, Lost) in the `bids` table
(migration 0009; no deletes, a dead bid goes to Lost with a reason). Drag cards or use the
dropdown; each card has an editable value, a follow-up date (overdue ones flag amber and show
on the dashboard) and a bid-due date. A Won bid has "Create job" (asks for a job number, carries
over name, client, address, geocodes it, and sets contract value to the bid value) and then links
to the job. Stats: open pipeline, won, win rate, follow-ups due. Dashboard shows the pipeline
stat and a "bid follow-ups due" banner. Estimation-log spreadsheet import is NOT built.

Conversion funnel on /crm: created -> bid sent -> won, with lead->sent, sent->won, lead->won and win-rate ratios (a bid counts as "sent" via `bids.submitted_at`, set on reaching Bid sent or Won). Automated follow-ups (migration 0010): a bid in Bid sent with a contact email gets up to 3 emails at +3/+7/+14 days (`lib/crm/followup.ts`), sent by the daily Vercel cron `/api/cron/follow-ups` (`vercel.json`, needs CRON_SECRET + SUPABASE_SERVICE_ROLE_KEY + Resend), from the app sender with the bid creator as Reply-To/CC; each send is logged in `bid_follow_ups`; pause per bid; "Send now" button. UI rule: every grid, card list and graph gets an entrance animation (`.cc-in` stagger, `.cc-barx`, `CountUp`).

### Finance & Cash (merged), coach, injection, Grow Safely
`/finance` now holds everything money-related in tabs: 13-week forecast, Finance coach, Invoices & bills,
Playbook & settings (`/cashflow` redirects here). `lib/cashflow/injection.ts` answers "if/when/how much
cash do I need": safety cushion = one payroll run + one month overhead; reports the first week under it,
the amount needed, a have-it-in-the-bank-by date, a suggested credit line, and a stress case (customers
pay 2 weeks late). Overdue unpaid invoices/bills count in week 1 of the forecast. `lib/coach/finance.ts`
is a rule-based CFO coach (health score, Friday savings routine across HST/tax/equipment/profit/cushion,
overdue AR calls, bills due, client concentration, holdback, 3-month cushion goal). `/scale` ("Grow
Safely", `lib/scale/plan.ts`) has 7 readiness gates, safe-annual-growth and max-job-to-float from spare
cash (only half the cash above the cushion is spendable on growth), a growth slider, and a conservative
ladder. If bank balance / overhead / payroll are missing, these pages ask for them instead of showing
results. `?demo=1` on /finance and /scale shows labelled sample data (`lib/demo/finance.ts`).

### Still explicitly out of scope
inventory/equipment tracking, the integrations
marketplace, detailed job-cost category breakdowns (labour/AP/material/
equipment variance), and worker certification tracking.

## Stack decisions

- **Next.js** (App Router) on **Vercel**.
- **Supabase**: Postgres + Auth + Storage + Row-Level Security. Project region:
  `ca-central-1` (Montreal) — Supabase's only Canadian region — for data residency.
- No payroll processing, no payment rails. We write CSVs and record AR/AP; we never
  move money.

## Key architecture decisions

### Multi-tenancy
Every business table carries `company_id`. RLS policies key off a
`current_company_id()` SQL function reading the caller's row in `profiles`
(looked up by `auth.uid()`). No cross-company reads are possible even by bugs in
application code — enforced at the database.

### Roles & the kiosk/PIN problem
Owner, PM, and Foreman get real Supabase Auth accounts (email/password or magic
link) — they need individual logins for accountability (who priced a change order,
who approved hours).

Workers generally do **not** get individual Supabase Auth accounts in Phase 1.
The iPad punch clock is a shared kiosk device: one authenticated session (the
Foreman's, or a dedicated per-job kiosk account) stays signed in, and each
worker identifies themselves with a 4-digit PIN (hashed in `profiles.pin_hash`,
scoped unique per company). This matches the real jobsite flow in the prototype
and avoids making muddy-gloved workers type emails. The authenticated session is
still the one performing the DB write, so RLS only needs to check "same company,"
and the `time_entries` row records which `profile` the PIN matched — PIN identity,
not session identity, is what goes to payroll and job costing.

A worker *can* also be given their own login later (e.g. to see their own hours on
their phone) — the schema doesn't block it, it's just not required for Phase 1.

### Financial numbers are computed, not duplicated
`jobs` stores the contract value and status, not running `billed`/`paid` totals.
Those are computed from `invoices` and `bills` via SQL views (`job_financial_summary`,
`company_cash_position`) so AR/AP and the dashboard can never drift out of sync with
the ledger rows. The 13-week cash flow forecast reads from the same tables plus one
manually-maintained `cash_flow_assumptions` row per company (overhead, payroll run
rate, HST/tax/equipment/profit reserve %, revenue + margin targets) — mirroring the
`ALLOC` / `CF` / `PAYROLL` constants in the dashboard prototype's CFO playbook.

### Photos, signatures, PDFs
Stored in Supabase Storage, one bucket per concern (`punch-photos`,
`incident-photos`, `daily-log-photos`, `tm-ticket-photos`, `signatures`), object
paths prefixed `company_id/job_id/...`, storage RLS policies mirror table RLS.

### Payroll export is a snapshot, not a live query
Generating the weekly CSV writes a `payroll_export_batches` row + 
`payroll_export_lines` rows (one per worker per job) at generation time, and flips
the covered `time_entries.payroll_status` to `exported`. This gives an audit trail
of exactly what was sent to the payroll provider and when, even if hours are later
disputed or corrected.

## Database schema (Phase 1)

```
companies
  id, name, timezone, created_at

profiles                               -- all logins + PIN-only workers
  id (= auth.users.id, nullable for PIN-only workers pre-invite),
  company_id, full_name, role enum(owner,pm,foreman,worker),
  phone, pin_hash, status enum(active,inactive), created_at

clients                                -- general contractors we bill
  id, company_id, name, contact_name, contact_email, contact_phone, notes

jobs
  id, company_id, job_number, name, client_id, address,
  geofence_lat, geofence_lon, geofence_radius_m,
  contract_value, status enum(active,holdback,closed),
  foreman_id -> profiles, percent_complete, start_date, created_at

time_entries                           -- the punch clock
  id, company_id, job_id, worker_id -> profiles,
  clock_in_at, clock_in_lat, clock_in_lon, clock_in_photo_path, geofence_ok,
  ppe_confirmed, ppe_missing_items text[],
  toolbox_talk_id -> toolbox_talks,
  clock_out_at, clock_out_lat, clock_out_lon, clock_out_photo_path,
  injury_reported,
  payroll_status enum(pending,approved,exported),
  approved_by -> profiles, approved_at, created_at

toolbox_talks
  id, company_id, job_id, talk_date, title, body, created_by, created_at

toolbox_talk_acknowledgements
  id, toolbox_talk_id, worker_id -> profiles, time_entry_id, acknowledged_at

incident_reports
  id, company_id, job_id, worker_id -> profiles, time_entry_id,
  occurred_at, incident_type, body_part, first_aid_given, first_aid_by,
  needs_medical, description, witness, photo_paths text[],
  status enum(open,closed), closed_by, closed_at, created_at

daily_logs
  id, company_id, job_id, foreman_id -> profiles, log_date,
  crew_count, weather, work_performed, delays, photo_paths text[], created_at

extras                                 -- field-reported scope changes
  id, company_id, job_id, reported_by -> profiles, description,
  hours, materials_cost, authorized_by, photo_paths text[],
  status enum(reported,priced,submitted_to_gc,approved,rejected),
  change_order_id -> change_orders, created_at

change_orders
  id, company_id, job_id, description, amount,
  status enum(pending,priced,sent_to_gc,approved,disputed,rejected),
  source_extra_id -> extras, priced_by -> profiles, priced_at,
  sent_to_gc_at, gc_responded_at, created_by, created_at

tm_tickets                             -- T&M tickets, GC super sign-off
  id, company_id, job_id, ticket_date, super_name, super_email,
  super_signature_path, signed_at, hours, equipment_cost, materials_cost,
  photo_paths text[], gps_lat, gps_lon,
  status enum(draft,signed,sent_to_gc,billed), created_by, created_at

invoices                               -- AR
  id, company_id, job_id, client_id, invoice_number,
  subtotal, hst_amount, total_amount, holdback_amount,
  issued_at, due_at, paid_at,
  status enum(draft,sent,partially_paid,paid,overdue), created_at

bills                                  -- AP
  id, company_id, job_id (nullable = company overhead), vendor_name,
  description, amount, due_date, paid_at,
  status enum(unpaid,paid), created_at

cash_snapshots                         -- manual weekly bank balance entry
  id, company_id, as_of_date, bank_balance, created_by, created_at

cash_flow_assumptions                  -- CFO playbook inputs, one row/company
  id, company_id, overhead_monthly, payroll_per_period,
  payroll_frequency enum(weekly,biweekly),
  hst_reserve_pct, tax_reserve_pct, equipment_reserve_pct, profit_allocation_pct,
  revenue_target_annual, gross_margin_target, updated_by, updated_at

payroll_export_batches
  id, company_id, period_start, period_end, generated_by, generated_at,
  file_path, total_hours, status enum(generated,downloaded)

payroll_export_lines
  id, batch_id, worker_id -> profiles, job_id, total_hours,
  regular_hours, overtime_hours
```

Views (computed, not stored): `job_financial_summary` (billed/paid/outstanding
per job from `invoices`+`bills`), `company_cash_position` (latest `cash_snapshots`
row + open AR − open AP), `who_is_clocked_in` (open `time_entries`).

Every table has RLS enabled, scoped by `company_id = current_company_id()`, plus
role checks on writes that matter (e.g. only `owner`/`pm` can set
`change_orders.status = 'approved'`; only `owner`/`pm` can generate a payroll
export batch).

## Folder structure (Phase 1)

```
construction-concierge/
  app/
    (auth)/login/
    (auth)/accept-invite/
    (owner)/dashboard/              -- who's clocked in, cash, AR/AP, jobs
    (owner)/jobs/[jobId]/
    (owner)/finance/                -- AR/AP lists
    (owner)/cashflow/               -- 13-week forecast + CFO playbook
    (owner)/change-orders/
    (owner)/payroll-export/
    (field)/kiosk/[jobId]/          -- shared-iPad punch clock (PIN flow)
    (field)/m/                      -- Foreman/Worker mobile web app
    api/
      payroll-export/route.ts       -- builds + stores the CSV (service role)
      storage-upload-url/route.ts   -- signed upload URLs for photos/signatures
  components/
    dashboard/
    kiosk/
    field/
    ui/                             -- shared primitives (cards, dials, buttons)
    charts/                         -- cash flow chart, dials
  lib/
    supabase/
      client.ts                     -- browser client
      server.ts                     -- server component / route handler client
      admin.ts                      -- service-role client (payroll export only)
    auth/                           -- role guards, session helpers
    cashflow/                       -- forecast calculation engine
    jobcost/                        -- job financial summary helpers
    csv/                            -- payroll CSV builder
    types/                          -- generated Supabase types + domain types
  supabase/
    migrations/                     -- numbered SQL migrations
    seed.sql                        -- demo data (mirrors the prototypes)
    config.toml
  middleware.ts                     -- auth + role route protection
  CLAUDE.md
  .env.local.example
```

## Conventions

- All money in CAD, stored as numeric (cents-safe via `numeric`, not float).
- All timestamps stored UTC (`timestamptz`); render in the company's `timezone`.
- No destructive deletes on financial or safety records — use `status` fields
  (soft states) so incident reports, change orders, invoices are never hard-deleted.
