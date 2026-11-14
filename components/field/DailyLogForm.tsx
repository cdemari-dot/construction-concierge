"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayToronto } from "@/lib/today";
import { Chips, Label, Notice, Stepper, Title } from "./ui";

const WEATHER = [
  { value: "Sunny", emoji: "☀️", label: "Sunny" },
  { value: "Cloudy", emoji: "⛅", label: "Cloudy" },
  { value: "Rain", emoji: "🌧️", label: "Rain" },
  { value: "Snow", emoji: "❄️", label: "Snow" },
  { value: "Windy", emoji: "💨", label: "Windy" },
  { value: "Hot", emoji: "🥵", label: "Hot" },
] as const;

export function DailyLogForm({ companyId, jobId, foremanId }: { companyId: string; jobId: string; foremanId: string }) {
  const [crewCount, setCrewCount] = useState(0);
  const [weather, setWeather] = useState<string | null>(null);
  const [workPerformed, setWorkPerformed] = useState("");
  const [delays, setDelays] = useState("");
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setOk(null);
    setError(null);
    const supabase = createClient();
    const { error: e } = await supabase.from("daily_logs").upsert(
      {
        company_id: companyId,
        job_id: jobId,
        foreman_id: foremanId,
        log_date: todayToronto(),
        crew_count: crewCount || null,
        weather,
        work_performed: workPerformed,
        delays: delays || null,
      },
      { onConflict: "job_id,log_date" },
    );
    setBusy(false);
    if (e) {
      setError(`Not saved: ${e.message}`);
      return;
    }
    setOk("Daily log saved. Nice work today!");
  }

  return (
    <div>
      <Title emoji="📝" help="One quick note per day for this job. Saving again today just updates it.">
        Today&apos;s log
      </Title>
      <Notice ok={ok} error={error} />

      <Label>👷 How many on the crew?</Label>
      <Stepper value={crewCount} onChange={setCrewCount} max={99} />

      <Label>🌤️ Weather</Label>
      <Chips options={[...WEATHER]} value={weather} onChange={setWeather} />

      <Label>🔨 What did we get done?</Label>
      <textarea className="fa-input" rows={4} placeholder="e.g. Finished demo on level 2, hauled 3 bins" value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} />

      <Label>⏳ Any delays? (optional)</Label>
      <textarea className="fa-input" rows={2} placeholder="e.g. Waiting on the GC for access" value={delays} onChange={(e) => setDelays(e.target.value)} />

      <button className="fa-btn go" disabled={busy || !workPerformed.trim()} onClick={submit} type="button">
        {busy ? "Saving…" : "✅ Save today's log"}
      </button>
    </div>
  );
}
