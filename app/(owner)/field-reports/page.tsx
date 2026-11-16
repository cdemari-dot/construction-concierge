import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { Tag } from "@/components/ui/Tag";
import { ReportButton } from "@/components/dashboard/ReportButton";
import { closeIncident, emailTmTicket, extraToChangeOrder, setTmStatus } from "./actions";
import { fmt } from "@/lib/format";
import type { DailyLog, Extra, IncidentReport, Job, Profile, TmTicket } from "@/lib/types/database";

const TABS = [
  { key: "incidents", label: "Incidents" },
  { key: "logs", label: "Daily logs" },
  { key: "extras", label: "Extras" },
  { key: "tm", label: "T&M tickets" },
] as const;

const when = (iso: string) => new Date(iso).toLocaleString("en-CA", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function FieldReportsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  if (!isSupabaseConfigured) return <SetupBanner />;
  const tab = (await searchParams).tab ?? "incidents";
  const supabase = await createClient();

  const [{ data: jobs }, { data: people }] = await Promise.all([
    supabase.from("jobs").select("id, job_number"),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const job = new Map(((jobs ?? []) as Pick<Job, "id" | "job_number">[]).map((j) => [j.id, j.job_number]));
  const person = new Map(((people ?? []) as Pick<Profile, "id" | "full_name">[]).map((p) => [p.id, p.full_name]));

  let body: React.ReactNode = null;

  if (tab === "incidents") {
    const { data } = await supabase.from("incident_reports").select("*").order("occurred_at", { ascending: false }).limit(100);
    const rows = (data ?? []) as IncidentReport[];
    body = rows.map((r) => (
      <div key={r.id} className="cc-card" style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--mute)" }}>
              {job.get(r.job_id) ?? "Job"} · {when(r.occurred_at)} · {r.worker_id ? person.get(r.worker_id) ?? "Unknown" : "Unknown"}
            </div>
            <b>{r.incident_type}</b>{r.body_part ? ` · ${r.body_part}` : ""}
          </div>
          <Tag color={r.status === "open" ? "red" : "mute"}>{r.status}</Tag>
        </div>
        <div style={{ fontSize: 13.5 }}>{r.description}</div>
        <div style={{ fontSize: 12, color: "var(--mute)" }}>
          First aid: {r.first_aid_given ? `yes${r.first_aid_by ? ` (${r.first_aid_by})` : ""}` : "no"} · Medical attention: {r.needs_medical ? "YES" : "no"}
          {r.witness ? ` · Witness: ${r.witness}` : ""}
        </div>
        {r.status === "open" && <div><ReportButton label="Mark closed" run={closeIncident.bind(null, r.id)} /></div>}
      </div>
    ));
    if (rows.length === 0) body = <Empty text="No incident reports." />;
  }

  if (tab === "logs") {
    const { data } = await supabase.from("daily_logs").select("*").order("log_date", { ascending: false }).limit(100);
    const rows = (data ?? []) as DailyLog[];
    body = rows.map((r) => (
      <div key={r.id} className="cc-card" style={{ display: "grid", gap: 4 }}>
        <div style={{ fontSize: 11.5, color: "var(--mute)" }}>
          {job.get(r.job_id) ?? "Job"} · {r.log_date} · {r.foreman_id ? person.get(r.foreman_id) ?? "" : ""}
          {r.crew_count != null ? ` · crew ${r.crew_count}` : ""}{r.weather ? ` · ${r.weather}` : ""}
        </div>
        <div style={{ fontSize: 13.5 }}>{r.work_performed || "No work noted."}</div>
        {r.delays && <div style={{ fontSize: 12.5, color: "var(--amber)" }}>Delays: {r.delays}</div>}
      </div>
    ));
    if (rows.length === 0) body = <Empty text="No daily logs yet." />;
  }

  if (tab === "extras") {
    const { data } = await supabase.from("extras").select("*").order("created_at", { ascending: false }).limit(100);
    const rows = (data ?? []) as Extra[];
    body = rows.map((r) => (
      <div key={r.id} className="cc-card" style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--mute)" }}>
              {job.get(r.job_id) ?? "Job"} · {when(r.created_at)} · {r.reported_by ? person.get(r.reported_by) ?? "" : ""}
            </div>
            <div style={{ fontSize: 13.5 }}>{r.description}</div>
          </div>
          <Tag color={r.change_order_id ? "lime" : "amber"}>{r.change_order_id ? "change order" : r.status}</Tag>
        </div>
        <div style={{ fontSize: 12, color: "var(--mute)" }}>
          {r.hours} h · {fmt(r.materials_cost)} materials{r.authorized_by ? ` · authorized by ${r.authorized_by}` : ""}
        </div>
        {r.change_order_id ? (
          <Link href="/change-orders" className="cc-btn ghost sm" style={{ justifySelf: "start" }}>View change order</Link>
        ) : (
          <div><ReportButton label="Create change order" run={extraToChangeOrder.bind(null, r.id)} /></div>
        )}
      </div>
    ));
    if (rows.length === 0) body = <Empty text="No extras reported." />;
  }

  if (tab === "tm") {
    const { data } = await supabase.from("tm_tickets").select("*").order("created_at", { ascending: false }).limit(100);
    const rows = (data ?? []) as TmTicket[];
    const signed = await Promise.all(
      rows.map(async (r) =>
        r.super_signature_path ? (await supabase.storage.from("signatures").createSignedUrl(r.super_signature_path, 3600)).data?.signedUrl ?? null : null,
      ),
    );
    body = rows.map((r, i) => (
      <div key={r.id} className="cc-card" style={{ display: "grid", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11.5, color: "var(--mute)" }}>{job.get(r.job_id) ?? "Job"} · {r.ticket_date}</div>
            <b>{r.super_name}</b>{r.super_email ? <span style={{ color: "var(--mute)", fontSize: 12 }}> · {r.super_email}</span> : null}
          </div>
          <Tag color={r.status === "draft" ? "amber" : r.status === "billed" ? "mute" : "lime"}>{r.status.replaceAll("_", " ")}</Tag>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--mute)" }}>
          {r.hours} h · {(r.photo_paths ?? []).length} photo{(r.photo_paths ?? []).length === 1 ? "" : "s"}
        </div>
        {signed[i] && (
          // Signed URL from private storage, not a static asset, so next/image isn't useful here.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signed[i]!} alt="Superintendent signature" style={{ background: "#fff", borderRadius: 8, height: 64, justifySelf: "start", padding: 4 }} />
        )}
        <div style={{ display: "flex", gap: 8 }}>
          {r.super_email && r.super_signature_path && (r.status === "signed" || r.status === "sent_to_gc") && (
            <ReportButton
              label={r.status === "signed" ? `Email copy to ${r.super_email}` : "Email again"}
              run={emailTmTicket.bind(null, r.id)}
            />
          )}
          {r.status === "signed" && <ReportButton ghost label="Mark sent (no email)" run={setTmStatus.bind(null, r.id, "sent_to_gc")} />}
          {r.status === "sent_to_gc" && <ReportButton label="Mark billed" run={setTmStatus.bind(null, r.id, "billed")} />}
        </div>
      </div>
    ));
    if (rows.length === 0) body = <Empty text="No T&M tickets yet." />;
  }

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 12 }}>Field Reports</h1>
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <Link key={t.key} href={`/field-reports?tab=${t.key}`} className={`cc-btn sm ${tab === t.key ? "" : "ghost"}`}>
            {t.label}
          </Link>
        ))}
      </div>
      <div style={{ display: "grid", gap: 10, maxWidth: 760 }}>{body}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="cc-card" style={{ color: "var(--mute)" }}>{text}</div>;
}
