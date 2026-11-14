import Image from "next/image";
import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AgentDrawer } from "@/components/agent/AgentDrawer";

const NAV = [
  { href: "/dashboard", label: "Command" },
  { href: "/jobs", label: "Jobs" },
  { href: "/clients", label: "Clients" },
  { href: "/schedule", label: "Schedule" },
  { href: "/team", label: "Team" },
  { href: "/finance", label: "Finance & Cash" },
  { href: "/cashflow", label: "13-Week Forecast" },
  { href: "/change-orders", label: "Change Orders" },
  { href: "/payroll-export", label: "Payroll Export" },
];

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const user = isSupabaseConfigured ? await requireRole(["owner", "pm"]) : null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", minHeight: "100vh" }}>
      <aside
        style={{
          borderRight: "1px solid var(--line)",
          background: "var(--glass)",
          padding: "18px 12px",
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px 18px" }}>
          <Image src="/brand/logo-mark.png" alt="" width={34} height={34} />
          <div>
            <b style={{ fontSize: 15 }}>Concierge</b>
            <small style={{ display: "block", color: "var(--mute)", fontSize: 10.5, letterSpacing: 1.5 }}>
              OWNER / PM
            </small>
          </div>
        </div>

        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 10,
              color: "var(--text)",
              fontSize: 13.5,
              textDecoration: "none",
            }}
          >
            {item.label}
          </Link>
        ))}

        <div style={{ marginTop: "auto" }}>
          <div
            className="cc-card"
            style={{ fontSize: 11.5, color: "var(--mute)", lineHeight: 1.5, marginBottom: 8 }}
          >
            {user ? (
              <>
                <div style={{ color: "var(--text)" }}>{user.profile.full_name}</div>
                <div>{user.profile.role.toUpperCase()}</div>
              </>
            ) : (
              "Not connected to Supabase"
            )}
          </div>
          <ThemeToggle style={{ width: "100%", marginBottom: 8 }} />
          {user && <SignOutButton />}
        </div>
      </aside>

      <main style={{ padding: "22px 26px 60px", minWidth: 0 }}>{children}</main>
      {user && <AgentDrawer />}
    </div>
  );
}
