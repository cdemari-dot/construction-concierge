import { Fragment } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { AddScheduleForm, RemoveScheduleButton } from "@/components/dashboard/ScheduleForm";
import type { Job, Profile, ScheduleEntry } from "@/lib/types/database";

function weekDates(start: Date, days: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

export default async function SchedulePage() {
  if (!isSupabaseConfigured) return <SetupBanner />;

  const supabase = await createClient();
  const dates = weekDates(new Date(), 7);

  const [{ data: jobs }, { data: crew }, { data: entries }] = await Promise.all([
    supabase.from("jobs").select("*").eq("status", "active").order("job_number"),
    supabase.from("profiles").select("*").in("role", ["foreman", "worker"]).eq("status", "active"),
    supabase.from("schedule_entries").select("*").gte("work_date", dates[0]).lte("work_date", dates[dates.length - 1]),
  ]);

  const jobList = (jobs ?? []) as Job[];
  const crewList = (crew ?? []) as Profile[];
  const entryList = (entries ?? []) as ScheduleEntry[];
  const crewName = new Map(crewList.map((c) => [c.id, c.full_name]));

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 4 }}>
        Schedule
      </h1>
      <p style={{ color: "var(--mute)", fontSize: 13, marginBottom: 16 }}>Next 7 days. Assign crew to a job and a date.</p>

      <div style={{ marginBottom: 16 }}>
        <AddScheduleForm jobs={jobList} crew={crewList} />
      </div>

      <div style={{ overflowX: "auto" }}>
      <div style={{ minWidth: 820, display: "grid", gridTemplateColumns: `150px repeat(${dates.length}, minmax(0, 1fr))`, gap: 1, background: "var(--line)", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ background: "var(--panel)", padding: 10, fontSize: 11, color: "var(--mute)" }}>JOB</div>
        {dates.map((d) => (
          <div key={d} style={{ background: "var(--panel)", padding: 10, fontSize: 11, color: "var(--mute)", textAlign: "center" }}>
            {new Date(d + "T00:00:00").toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}
          </div>
        ))}

        {jobList.map((j) => (
          <Fragment key={j.id}>
            <div style={{ background: "var(--card-a)", padding: 10, fontSize: 12.5 }}>
              <b>{j.job_number}</b>
              <div style={{ color: "var(--mute)", fontSize: 11 }}>{j.name}</div>
            </div>
            {dates.map((d) => {
              const dayEntries = entryList.filter((e) => e.job_id === j.id && e.work_date === d);
              return (
                <div key={j.id + d} style={{ background: "var(--card-b)", padding: 6, minHeight: 50 }}>
                  {dayEntries.map((e) => (
                    <div
                      key={e.id}
                      className="cc-tag lime"
                      style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 3, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}
                    >
                      {crewName.get(e.worker_id) ?? "?"}
                      <RemoveScheduleButton id={e.id} />
                    </div>
                  ))}
                </div>
              );
            })}
          </Fragment>
        ))}
        {jobList.length === 0 && (
          <div style={{ gridColumn: `1 / span ${dates.length + 1}`, background: "var(--card-b)", padding: 16, color: "var(--mute)", fontSize: 13 }}>
            No active jobs to schedule yet.
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
