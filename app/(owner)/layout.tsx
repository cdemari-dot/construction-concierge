import Image from "next/image";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { HubNav } from "@/components/dashboard/HubNav";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AgentDrawer } from "@/components/agent/AgentDrawer";

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = isSupabaseConfigured ? await requireRole(["owner", "pm"]) : null;

  return (
    <div className="hub hub-shell owner-shell">
      <aside className="hub-side">
        <div className="hub-brand">
          <Image src="/brand/logo-mark.png" alt="" width={32} height={32} />
          <div>
            <b>Construction Concierge</b>
            <small>Owner / PM</small>
          </div>
        </div>

        <HubNav />

        <div className="hub-foot">
          <div className="hub-user">
            {user ? (
              <>
                <b>{user.profile.full_name}</b>
                {user.profile.role.toUpperCase()}
              </>
            ) : (
              "Not connected to Supabase"
            )}
          </div>
          <ThemeToggle style={{ width: "100%" }} />
          {user && <SignOutButton />}
        </div>
      </aside>

      <main className="hub-main">{children}</main>
      {user && <AgentDrawer />}
    </div>
  );
}
