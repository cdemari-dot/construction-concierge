import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { ToolboxForm } from "@/components/dashboard/ToolboxForm";
import type { Job, ToolboxTalk } from "@/lib/types/database";

export default async function ToolboxPage() {
  if (!isSupabaseConfigured) return <SetupBanner />;
  const supabase = await createClient();
  const [{ data: jobs }, { data: talks }, { data: acks }, { data: people }] = await Promise.all([
    supabase.from("jobs").select("id, job_number, name").eq("status", "active").order("job_number"),
    supabase.from("toolbox_talks").select("*").order("talk_date", { ascending: false }).limit(30),
    supabase.from("toolbox_talk_acknowledgements").select("toolbox_talk_id, worker_id, acknowledged_at"),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const jobList = (jobs ?? []) as Pick<Job, "id" | "job_number" | "name">[];
  const label = new Map(jobList.map((j) => [j.id, j.job_number]));
  const names = new Map(((people ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
  const signers = new Map<string, string[]>();
  for (const a of (acks ?? []) as { toolbox_talk_id: string; worker_id: string; acknowledged_at: string }[]) {
    const time = new Date(a.acknowledged_at).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", timeZone: "America/Toronto" });
    signers.set(a.toolbox_talk_id, [...(signers.get(a.toolbox_talk_id) ?? []), `${names.get(a.worker_id) ?? "Unknown"} ${time}`]);
  }

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>Toolbox Talks</h1>
      <p style={{ color: "var(--mute)", fontSize: 13, marginBottom: 16, maxWidth: 640, lineHeight: 1.6 }}>
        Every job gets a safety talk every day automatically (rotating the starter topics). Publish your own to replace it for a job. Crew must read and sign it before they can clock in; foremen are not asked to sign.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
        <ToolboxForm jobs={jobList.map((j) => ({ id: j.id, label: `${j.job_number} · ${j.name}` }))} />
        <div style={{ display: "grid", gap: 8 }}>
          {((talks ?? []) as ToolboxTalk[]).map((t) => (
            <div key={t.id} className="cc-card">
              <div style={{ fontSize: 11.5, color: "var(--mute)" }}>{label.get(t.job_id) ?? "Job"} · {t.talk_date}</div>
              <b>{t.title}</b>
              <div style={{ fontSize: 12, color: "var(--lime)", marginTop: 4 }}>{signers.get(t.id)?.length ?? 0} signed</div>
              {(signers.get(t.id) ?? []).length > 0 && (
                <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 2 }}>{signers.get(t.id)!.join(" · ")}</div>
              )}
            </div>
          ))}
          {(talks ?? []).length === 0 && <div className="cc-card" style={{ color: "var(--mute)" }}>No talks yet.</div>}
        </div>
      </div>
    </div>
  );
}
