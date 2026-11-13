"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function DailyLogForm({ companyId, jobId, foremanId }: { companyId: string; jobId: string; foremanId: string }) {
  const [crewCount, setCrewCount] = useState("");
  const [weather, setWeather] = useState("");
  const [workPerformed, setWorkPerformed] = useState("");
  const [delays, setDelays] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("daily_logs").upsert(
      {
        company_id: companyId,
        job_id: jobId,
        foreman_id: foremanId,
        log_date: new Date().toISOString().slice(0, 10),
        crew_count: Number(crewCount) || null,
        weather: weather || null,
        work_performed: workPerformed,
        delays: delays || null,
      },
      { onConflict: "job_id,log_date" },
    );
    setBusy(false);
    setSaved(true);
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="display" style={{ fontSize: 18 }}>
        Today&apos;s daily log
      </div>
      {saved && <div style={{ color: "var(--lime)", fontSize: 12.5 }}>Saved.</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input placeholder="Crew count" type="number" value={crewCount} onChange={(e) => setCrewCount(e.target.value)} style={inputStyle} />
        <input placeholder="Weather" value={weather} onChange={(e) => setWeather(e.target.value)} style={inputStyle} />
      </div>
      <textarea rows={3} placeholder="Work performed today" value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
      <textarea rows={2} placeholder="Delays (optional)" value={delays} onChange={(e) => setDelays(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
      <button className="cc-btn lime" disabled={busy || !workPerformed} onClick={submit} type="button">
        {busy ? "Saving…" : "Save daily log"}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line2)",
  borderRadius: 10,
  color: "var(--text)",
  padding: "9px 10px",
  fontSize: 14,
};
