import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/ui/StatCard";
import { Tag } from "@/components/ui/Tag";

export const dynamic = "force-dynamic";

interface Login {
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  confirmed: boolean;
  role: string | null;
  status: string | null;
  company: string | null;
}
interface Company {
  name: string;
  created_at: string;
  people: number;
  logins: number;
  jobs: number;
  punches_7d: number;
  last_punch: string | null;
}
interface Invite {
  email: string;
  role: string;
  company: string;
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-CA", { timeZone: "America/Toronto", dateStyle: "medium", timeStyle: "short" }) : "never";

const th: React.CSSProperties = { padding: "6px 8px", textAlign: "left", color: "var(--mute)", fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase" };
const td: React.CSSProperties = { padding: "10px 8px", verticalAlign: "top" };
const h3: React.CSSProperties = { fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 };

// Platform admin back end: who has a login, which companies exist, who is invited. Reads through
// admin_overview(), which only answers for emails listed in platform_admins (migration 0021).
export default async function AdminPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_overview");
  if (error) {
    if (/not authorized/i.test(error.message)) notFound();
    return (
      <div>
        <h1 className="display" style={{ fontSize: 22 }}>Admin</h1>
        <div className="cc-card" style={{ marginTop: 16 }}>
          Could not load the overview: {error.message}. Run migration 0021_platform_admin.sql in the Supabase SQL editor.
        </div>
      </div>
    );
  }
  const logins = (data?.logins ?? []) as Login[];
  const companies = (data?.companies ?? []) as Company[];
  const invites = (data?.pending_invites ?? []) as Invite[];
  const unlinked = logins.filter((l) => !l.company);
  const neverSignedIn = logins.filter((l) => !l.last_sign_in_at);
  const week = Date.now() - 7 * 86400000;
  const newThisWeek = logins.filter((l) => new Date(l.created_at).getTime() > week).length;

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>Admin</h1>
      <div style={{ color: "var(--mute)", fontSize: 13, marginBottom: 18 }}>Platform overview. Only you can see this page.</div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 16, marginBottom: 20 }}>
        <StatCard index={0} label="Logins" value={String(logins.length)} hint={`${newThisWeek} new in the last 7 days`} />
        <StatCard index={1} label="Companies" value={String(companies.length)} />
        <StatCard index={2} label="Pending invites" value={String(invites.length)} hint="invited, not signed up yet" />
        <StatCard index={3} label="Logins with no company" value={String(unlinked.length)} color={unlinked.length ? "red" : "lime"} hint={unlinked.length ? "check these" : "none"} />
        <StatCard index={4} label="Never signed in" value={String(neverSignedIn.length)} color={neverSignedIn.length ? "amber" : "lime"} />
      </div>

      <section className="cc-card cc-in" style={{ marginBottom: 16, overflowX: "auto" }}>
        <h3 style={h3}>Companies</h3>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr><th style={th}>Company</th><th style={th}>Created</th><th style={th}>People</th><th style={th}>Logins</th><th style={th}>Jobs</th><th style={th}>Punches (7d)</th><th style={th}>Last punch</th></tr>
          </thead>
          <tbody>
            {companies.map((c) => (
              <tr key={c.name + c.created_at} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={td}><b>{c.name}</b></td>
                <td style={td}>{when(c.created_at)}</td>
                <td style={td}>{c.people}</td>
                <td style={td}>{c.logins}</td>
                <td style={td}>{c.jobs}</td>
                <td style={td}>{c.punches_7d}</td>
                <td style={td}>{when(c.last_punch)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="cc-card cc-in" style={{ marginBottom: 16, overflowX: "auto" }}>
        <h3 style={h3}>Logins</h3>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr><th style={th}>Email</th><th style={th}>Company</th><th style={th}>Role</th><th style={th}>Created</th><th style={th}>Last sign-in</th><th style={th}>Flags</th></tr>
          </thead>
          <tbody>
            {logins.map((l) => (
              <tr key={l.email + l.created_at} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={td}>{l.email}</td>
                <td style={td}>{l.company ?? "none"}</td>
                <td style={td}>{l.role ?? "none"}</td>
                <td style={td}>{when(l.created_at)}</td>
                <td style={td}>{when(l.last_sign_in_at)}</td>
                <td style={td}>
                  {!l.company && <Tag color="red">no company</Tag>} {!l.confirmed && <Tag color="amber">email not confirmed</Tag>} {l.status === "inactive" && <Tag color="amber">inactive</Tag>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="cc-card cc-in" style={{ overflowX: "auto" }}>
        <h3 style={h3}>Invited, not signed up yet</h3>
        {invites.length === 0 && <div style={{ color: "var(--mute)", fontSize: 13 }}>None.</div>}
        {invites.map((i) => (
          <div key={i.email} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", padding: "9px 0", fontSize: 13 }}>
            <span>{i.email}</span>
            <span style={{ color: "var(--mute)" }}>{i.role} · {i.company}</span>
          </div>
        ))}
      </section>
    </div>
  );
}
