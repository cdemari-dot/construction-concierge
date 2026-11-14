"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayToronto } from "@/lib/today";
import { fetchJobWeather, type JobWeather } from "@/lib/weather";
import { fetchTodayCrew } from "@/lib/todayCrew";
import { Label, Notice, Title } from "./ui";

export function DailyLogForm({
  companyId,
  jobId,
  foremanId,
  lat,
  lon,
}: {
  companyId: string;
  jobId: string;
  foremanId: string;
  lat: number | null;
  lon: number | null;
}) {
  const [crewCount, setCrewCount] = useState<number | null>(null);
  const [weather, setWeather] = useState<JobWeather | null>(null);
  const [weatherState, setWeatherState] = useState<"loading" | "ok" | "none" | "failed">(lat == null || lon == null ? "none" : "loading");
  const [workPerformed, setWorkPerformed] = useState("");
  const [delays, setDelays] = useState("");
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchTodayCrew(jobId)
      .then((c) => {
        if (!cancelled) setCrewCount(c.workers);
      })
      .catch(() => {
        if (!cancelled) setCrewCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    if (lat == null || lon == null) return;
    let cancelled = false;
    fetchJobWeather(lat, lon)
      .then((w) => {
        if (cancelled) return;
        setWeather(w);
        setWeatherState("ok");
      })
      .catch(() => {
        if (!cancelled) setWeatherState("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [lat, lon]);

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
        crew_count: crewCount,
        weather: weather?.text ?? null,
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

      <div className="cc-card" style={{ margin: "16px 0 0", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 36 }}>👷</span>
        <div style={{ fontSize: 15, lineHeight: 1.4 }}>
          <b>{crewCount == null ? "Counting the crew…" : `${crewCount} on site today`}</b>
          <div style={{ color: "var(--mute)", fontSize: 13 }}>Counted from today&apos;s clock-ins · added automatically</div>
        </div>
      </div>

      <div className="cc-card" style={{ margin: "16px 0 0", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 36 }}>{weather?.emoji ?? "🌤️"}</span>
        <div style={{ fontSize: 15, lineHeight: 1.4 }}>
          {weatherState === "loading" && "Checking the weather at this job…"}
          {weatherState === "ok" && weather && (
            <>
              <b>
                {weather.summary}, {weather.tempC}°C
              </b>
              <div style={{ color: "var(--mute)", fontSize: 13 }}>
                Feels {weather.feelsC}°C · wind {weather.windKmh} km/h{weather.precipMm > 0 ? ` · ${weather.precipMm} mm rain/snow` : ""} · added to your log automatically
              </div>
            </>
          )}
          {weatherState === "failed" && "Couldn't get the weather right now. Your log will save without it."}
          {weatherState === "none" && "No location on this job yet, so weather can't be added. The office can set it."}
        </div>
      </div>

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
