import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";

// Service-role client. Bypasses RLS entirely — only ever use this for the
// handful of operations that legitimately need to see across the request's
// own RLS scope (building the payroll export CSV, issuing signed upload
// URLs). Never import this into anything that runs in the browser.
export function createAdminClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local (see .env.local.example) — this key must never be exposed to the browser.",
    );
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
