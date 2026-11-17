import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { HubFX } from "@/components/ui/HubFX";

export default async function FieldLayout({ children }: { children: React.ReactNode }) {
  if (isSupabaseConfigured) {
    // The device itself must be signed in as an Owner/PM/Foreman — workers
    // identify themselves with their PIN inside this already-authenticated
    // session. See CLAUDE.md "Roles & the kiosk/PIN problem".
    await requireRole(["owner", "pm", "foreman", "worker", "kiosk"]);
  }

  return (
    <div className="hub" style={{ minHeight: "100vh", padding: 16 }}>
      <HubFX />
      {children}
    </div>
  );
}
