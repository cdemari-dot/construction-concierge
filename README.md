# Construction Concierge

Owner's CFO + back-office app for small Ontario construction contractors.
See [`CLAUDE.md`](./CLAUDE.md) for the product scope and architecture decisions.

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com), region `ca-central-1` (Montreal).
2. **Link the CLI and push the schema:**
   ```bash
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
   This runs everything in `supabase/migrations/` in order: tables, RLS
   policies, the `current_company_id()`/`verify_worker_pin()` helper
   functions, the computed views, and the storage buckets.
3. **(Optional) Load demo data** — run `supabase/seed.sql` in the Supabase SQL
   editor. It creates a demo company with sample jobs, crew, and invoices,
   but leaves every profile's `auth_user_id` unset. To sign in as the demo
   Owner, sign up through `/login` → "Start a new company" is for a *real*
   new tenant — instead, sign up with email `owner@demo.constructionconcierge.ai`
   via Supabase Auth directly (Authentication → Users → Add user, or
   `supabase.auth.signUp` from the browser console on `/login`); the
   `handle_new_auth_user` trigger links that login to the seeded Owner
   profile automatically.
4. **Environment variables:** copy `.env.local.example` to `.env.local` and
   fill in your project's URL + anon key + service role key (Project
   Settings → API).
5. **Run it:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000). You'll land on
   `/login`. "Start a new company" creates a brand-new tenant and makes you
   its Owner.

## Where things live

- `/dashboard`, `/jobs`, `/finance`, `/cashflow`, `/change-orders`,
  `/payroll-export` — Owner/PM desktop app.
- `/kiosk/[jobId]` — the shared-iPad punch clock. Sign in as a Foreman (or
  Owner/PM) first, then leave the device on this page; workers identify
  themselves with their 4-digit PIN. See CLAUDE.md "Roles & the kiosk/PIN
  problem" for why it works this way.
- `/m` — the Foreman's own mobile app: punch clock (same PIN flow, with a
  job picker), daily log, extras, T&M tickets, incident reports.

Full schema and design decisions: [`CLAUDE.md`](./CLAUDE.md).

## Known limitations (Phase 1, by design)

- No Docker/local Supabase stack was available while building this, so the
  schema has been reviewed carefully but **not run against a live Postgres
  instance**. Run `npx supabase db push` against a throwaway project first
  and sanity-check the demo data before pointing it at anything real.
- A worker with no Supabase Auth account of their own can only use the
  punch clock on a device where a Foreman/PM/Owner is signed in (the kiosk,
  or a Foreman's own phone at `/m`) — they can't yet use their own personal
  phone independently. Giving a worker their own login (the schema already
  supports it) is the way to unlock that later.
- Payroll CSV export streams straight to the browser as a download; it
  isn't also archived to Storage (`payroll_export_batches.file_path` stays
  null). Easy to add later if you want a permanent copy per export.
