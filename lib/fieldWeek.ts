import type { SupabaseClient } from "@supabase/supabase-js";
import { todayToronto } from "@/lib/today";
import { ensureTodayTalks } from "@/lib/toolbox";
import type { Job, Profile, ScheduleEntry } from "@/lib/types/database";

export interface CrewRow {
  id: string;
  name: string;
  startTime: string | null; // "07:00"
  clockedInAt: string | null; // ISO, today only
  clockedOut: boolean;
  signedTalk: boolean;
  offSchedule: boolean;
}

export interface SiteDay {
  jobId: string;
  jobNumber: string;
  name: string;
  address: string | null;
  lat: number | null;
  lon: number | null;
  mine: boolean; // I lead this job or I'm on its crew list that day
  crew: CrewRow[];
  talkTitle: string | null; // today only
}

export interface WeekDay {
  date: string; // YYYY-MM-DD
  dow: string; // Mon
  day: number; // 17
  sites: SiteDay[];
}

export interface FieldWeek {
  today: string;
  days: WeekDay[];
  visibleJobs: Job[];
  draftTm: number; // unsigned T&M tickets for my sites
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Today plus the next 6 days, so today is always the first tab (crews do work Sundays).
function weekDates(today: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(today, i));
}

// What a Foreman sees: only sites they lead or are scheduled on. Owner/PM previewing
// the app see every active site. Talks are created only for sites with crew today.
export async function loadFieldWeek(supabase: SupabaseClient, me: Profile): Promise<FieldWeek> {
  const today = todayToronto();
  const dates = weekDates(today);

  const [{ data: jobRows }, { data: entryRows }, { data: crewRows }] = await Promise.all([
    supabase.from("jobs").select("*").eq("status", "active").order("job_number"),
    supabase.from("schedule_entries").select("*").gte("work_date", dates[0]).lte("work_date", dates[dates.length - 1]),
    supabase.from("profiles").select("id, full_name, role").in("role", ["foreman", "worker"]).eq("status", "active"),
  ]);
  const allJobs = (jobRows ?? []) as Job[];
  const entries = (entryRows ?? []) as ScheduleEntry[];
  const names = new Map(((crewRows ?? []) as { id: string; full_name: string; role: string }[]).map((c) => [c.id, c]));

  const seesAll = me.role === "owner" || me.role === "pm";
  const myJobIds = new Set<string>();
  for (const j of allJobs) if (j.foreman_id === me.id) myJobIds.add(j.id);
  for (const e of entries) if (e.worker_id === me.id) myJobIds.add(e.job_id);
  const visibleJobs = seesAll ? allJobs : allJobs.filter((j) => myJobIds.has(j.id));

  // Today's punches + sign-offs for every site I can see (so a punch at an unscheduled site still shows).
  const visibleIds = visibleJobs.map((j) => j.id);
  const since = new Date(Date.now() - 30 * 3600 * 1000).toISOString();
  const punches = visibleIds.length
    ? (((await supabase.from("time_entries").select("id, job_id, worker_id, clock_in_at, clock_out_at, off_schedule").in("job_id", visibleIds).gte("clock_in_at", since)).data ?? []) as {
        id: string;
        job_id: string;
        worker_id: string;
        clock_in_at: string;
        clock_out_at: string | null;
        off_schedule: boolean;
      }[]).filter((p) => new Date(p.clock_in_at).toLocaleDateString("en-CA", { timeZone: "America/Toronto" }) === today)
    : [];
  const todaysJobIds = [...new Set([...entries.filter((e) => e.work_date === today).map((e) => e.job_id), ...punches.map((p) => p.job_id)])].filter((id) => visibleIds.includes(id));
  const entryIds = punches.map((p) => p.id);
  const acks = entryIds.length
    ? (((await supabase.from("toolbox_talk_acknowledgements").select("time_entry_id").in("time_entry_id", entryIds)).data ?? []) as { time_entry_id: string }[])
    : [];
  const signedEntry = new Set(acks.map((a) => a.time_entry_id));

  const talkJobs = visibleJobs.filter((j) => todaysJobIds.includes(j.id));
  const talks = await ensureTodayTalks(supabase, talkJobs, me.id);

  const days: WeekDay[] = dates.map((date) => {
    const dayEntries = entries.filter((e) => e.work_date === date);
    const sites: SiteDay[] = [];
    for (const j of visibleJobs) {
      const here = dayEntries.filter((e) => e.job_id === j.id);
      const isToday = date === today;
      if (here.length === 0 && !(isToday && punches.some((p) => p.job_id === j.id))) continue;
      const crew: CrewRow[] = here
        .filter((e) => e.worker_id !== me.id)
        .map((e) => {
          const p = isToday ? punches.find((x) => x.job_id === j.id && x.worker_id === e.worker_id) : undefined;
          return {
            id: e.worker_id,
            name: names.get(e.worker_id)?.full_name ?? "Crew member",
            startTime: e.start_time ? e.start_time.slice(0, 5) : null,
            clockedInAt: p?.clock_in_at ?? null,
            clockedOut: Boolean(p?.clock_out_at),
            signedTalk: p ? signedEntry.has(p.id) : false,
            offSchedule: false,
          };
        });
      if (isToday) {
        // Punched in here without being scheduled: allowed, but flagged.
        for (const p of punches.filter((x) => x.job_id === j.id && x.off_schedule && !here.some((e) => e.worker_id === x.worker_id))) {
          crew.push({
            id: p.worker_id,
            name: names.get(p.worker_id)?.full_name ?? "Crew member",
            startTime: null,
            clockedInAt: p.clock_in_at,
            clockedOut: Boolean(p.clock_out_at),
            signedTalk: signedEntry.has(p.id),
            offSchedule: true,
          });
        }
      }
      sites.push({
        jobId: j.id,
        jobNumber: j.job_number,
        name: j.name,
        address: j.address,
        lat: j.geofence_lat,
        lon: j.geofence_lon,
        mine: myJobIds.has(j.id),
        crew,
        talkTitle: isToday ? talks[j.id]?.title ?? null : null,
      });
    }
    const dt = new Date(`${date}T12:00:00Z`);
    return { date, dow: date === today ? "Today" : dt.toLocaleDateString("en-CA", { weekday: "short", timeZone: "UTC" }), day: dt.getUTCDate(), sites };
  });

  const siteIds = visibleJobs.map((j) => j.id);
  const { count } = siteIds.length
    ? await supabase.from("tm_tickets").select("id", { count: "exact", head: true }).eq("status", "draft").in("job_id", siteIds)
    : { count: 0 };

  return { today, days, visibleJobs, draftTm: count ?? 0 };
}
