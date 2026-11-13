import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function FieldLayout({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured) {
    // The device itself must be signed in as an Owner/PM/Foreman — workers
    // identify themselves with their PIN inside this already-authenticated
    // session. See CLAUDE.md "Roles & the kiosk/PIN problem".
    await requireRole(["owner", "pm", "foreman"]);
  }

  return <div style={{ minHeight: "100vh", padding: 16 }}>{children}</div>;
}
