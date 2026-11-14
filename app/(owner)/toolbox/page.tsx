import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { ToolboxForm } from "@/components/dashboard/ToolboxForm";
import type { Job, ToolboxTalk } from "@/lib/types/database";

export default async function ToolboxPage() {
  if (!isSupabaseConfigured) return <SetupBanner />;
  const supabase = await createClient();
  const [{ data: jobs }, { data: talks }, { data: acks }] = await Promise.all([
    supabase.from("jobs").select("id, job_number, name").eq("status", "active").order("job_number"),
    supabase.from("toolbox_talks").select("*").order("talk_date", { ascending: false }).limit(30),
    supabase.from("toolbox_talk_acknowledgements").select("toolbox_talk_id"),
  ]);
  const jobList = (jobs ?? []) as Pick<Job, "id" | "job_number" | "name">[];
  const label = new Map(jobList.map((j) => [j.id, j.job_number]));
  const counts = new Map<string, number>();
  for (const a of (acks ?? []) as { toolbox_talk_id: string }[]) counts.set(a.toolbox_talk_id, (counts.get(a.toolbox_talk_id) ?? 0) + 1);

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>Toolbox Talks</h1>
      <p style={{ color: "var(--mute)", fontSize: 13, marginBottom: 16, maxWidth: 640, lineHeight: 1.6 }}>
        Publish today&apos;s talk for a job. Crew read and sign it on the kiosk at clock-in. The date matters: a talk only shows on its own day.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
        <ToolboxForm jobs={jobList.map((j) => ({ id: j.id, label: `${j.job_number} · ${j.name}` }))} />
        <div style={{ display: "grid", gap: 8 }}>
          {((talks ?? []) as ToolboxTalk[]).map((t) => (
            <div key={t.id} className="cc-card">
              <div style={{ fontSize: 11.5, color: "var(--mute)" }}>{label.get(t.job_id) ?? "Job"} · {t.talk_date}</div>
              <b>{t.title}</b>
              <div style={{ fontSize: 12, color: "var(--lime)", marginTop: 4 }}>{counts.get(t.id) ?? 0} signed</div>
            </div>
          ))}
          {(talks ?? []).length === 0 && <div className="cc-card" style={{ color: "var(--mute)" }}>No talks yet.</div>}
        </div>
      </div>
    </div>
  );
}
