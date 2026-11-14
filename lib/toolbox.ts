import type { SupabaseClient } from "@supabase/supabase-js";
import { todayToronto } from "@/lib/today";
import type { ToolboxTalk } from "@/lib/types/database";

export const TALK_TEMPLATES = [
  { title: "Working at heights", body: "Inspect harnesses and lanyards before use. Tie off at all times above 3 m (10 ft). Check guardrails, ladders and scaffold tags. Never work under a suspended load. Report damaged equipment immediately." },
  { title: "PPE: hard hat, boots, glasses, gloves", body: "Hard hat, CSA-approved safety boots, safety glasses and gloves are required on site at all times. Add hearing protection near loud equipment and a respirator where dust or fumes are present. Replace damaged PPE before starting." },
  { title: "Dust, silica and asbestos awareness", body: "Do not disturb suspect materials until they are tested. Wet methods and HEPA vacuums for dust control. Respirators as per the job's designated substances plan. Stop and tell the foreman if you find unexpected material." },
  { title: "Housekeeping and slips, trips, falls", body: "Keep walkways, stairs and exits clear. Stack materials safely and remove debris daily. Cords and hoses are routed overhead or flagged. Clean up spills immediately." },
];

export interface DayTalk {
  id: string;
  title: string;
  body: string;
}

// Every job always has a talk for today. If the office published one, the latest
// is used; otherwise a default is created (rotating through the templates by day)
// so the crew sign-off is never skipped just because nobody set one up.
export async function ensureTodayTalks(
  supabase: SupabaseClient,
  jobs: { id: string; company_id: string }[],
  createdBy: string,
): Promise<Record<string, DayTalk | null>> {
  const out: Record<string, DayTalk | null> = {};
  for (const j of jobs) out[j.id] = null;
  if (jobs.length === 0) return out;

  const today = todayToronto();
  const { data: existing } = await supabase
    .from("toolbox_talks")
    .select("*")
    .in("job_id", jobs.map((j) => j.id))
    .eq("talk_date", today)
    .order("created_at", { ascending: false });

  for (const t of (existing ?? []) as ToolboxTalk[]) {
    if (!out[t.job_id]) out[t.job_id] = { id: t.id, title: t.title, body: t.body };
  }

  const day = Math.floor(new Date(`${today}T12:00:00Z`).getTime() / 86400000);
  const tpl = TALK_TEMPLATES[day % TALK_TEMPLATES.length];
  for (const j of jobs) {
    if (out[j.id]) continue;
    const { data: created } = await supabase
      .from("toolbox_talks")
      .insert({ company_id: j.company_id, job_id: j.id, talk_date: today, title: tpl.title, body: tpl.body, created_by: createdBy })
      .select("*")
      .single();
    if (created) out[j.id] = { id: created.id, title: created.title, body: created.body };
  }
  return out;
}
