import { createClient } from "@/lib/supabase/client";
import { todayToronto } from "@/lib/today";

export interface TodayCrew {
  workers: number;
  hours: number; // completed + in-progress shift hours so far today
}

// Counted from real clock-ins at this job today (Toronto day), so nobody types it.
export async function fetchTodayCrew(jobId: string): Promise<TodayCrew> {
  const supabase = createClient();
  const since = new Date(Date.now() - 30 * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("time_entries")
    .select("worker_id, clock_in_at, clock_out_at")
    .eq("job_id", jobId)
    .gte("clock_in_at", since);
  if (error) throw new Error(error.message);

  const today = todayToronto();
  const rows = (data ?? []).filter(
    (r: { clock_in_at: string }) => new Date(r.clock_in_at).toLocaleDateString("en-CA", { timeZone: "America/Toronto" }) === today,
  ) as { worker_id: string; clock_in_at: string; clock_out_at: string | null }[];

  let ms = 0;
  for (const r of rows) {
    const end = r.clock_out_at ? new Date(r.clock_out_at).getTime() : Date.now();
    ms += Math.max(0, end - new Date(r.clock_in_at).getTime());
  }
  return { workers: new Set(rows.map((r) => r.worker_id)).size, hours: Math.round((ms / 3600000) * 2) / 2 };
}
