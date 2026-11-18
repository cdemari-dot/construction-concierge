"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

interface Row {
  id: string;
  name: string;
  state: "in" | "out" | "not-in";
  at: string | null;
  geo: "ok" | "off" | "unknown" | null;
  offSchedule: boolean;
}

const chip = (bad: boolean): React.CSSProperties => ({
  fontSize: 11.5,
  fontWeight: 700,
  padding: "3px 9px",
  borderRadius: 999,
  marginLeft: 6,
  background: bad ? "rgba(217,119,6,.16)" : "rgba(31,163,90,.14)",
  color: bad ? "#b45309" : "#1fa35a",
});

export function ForemanBoard({ supabase, jobId, onBack }: { supabase: SupabaseClient; jobId: string; onBack: () => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
        const since = new Date(Date.now() - 30 * 3600 * 1000).toISOString();
        const [{ data: sched }, { data: punches }] = await Promise.all([
          supabase.from("schedule_entries").select("worker_id").eq("job_id", jobId).eq("work_date", today),
          supabase.from("time_entries").select("worker_id, clock_in_at, clock_out_at, geofence_ok, off_schedule").eq("job_id", jobId).gte("clock_in_at", since),
        ]);
        const todays = (punches ?? []).filter((p) => new Date(p.clock_in_at).toLocaleDateString("en-CA", { timeZone: "America/Toronto" }) === today);
        const ids = [...new Set([...(sched ?? []).map((s) => s.worker_id as string), ...todays.map((p) => p.worker_id as string)])];
        const { data: people } = ids.length ? await supabase.from("profiles").select("id, full_name").in("id", ids) : { data: [] };
        const name = new Map((people ?? []).map((p) => [p.id as string, p.full_name as string]));
        const out: Row[] = ids.map((id) => {
          const mine = todays.filter((p) => p.worker_id === id).sort((a, b) => (a.clock_in_at < b.clock_in_at ? 1 : -1));
          const p = mine[0];
          return {
            id,
            name: name.get(id) ?? "Crew member",
            state: !p ? "not-in" : p.clock_out_at ? "out" : "in",
            at: p?.clock_in_at ?? null,
            geo: !p ? null : p.geofence_ok === false ? "off" : p.geofence_ok == null ? "unknown" : "ok",
            offSchedule: Boolean(p?.off_schedule),
          };
        });
        const order = { in: 0, "not-in": 1, out: 2 } as const;
        out.sort((a, b) => order[a.state] - order[b.state] || a.name.localeCompare(b.name));
        setRows(out);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Could not load the site board");
      }
    })();
  }, [supabase, jobId]);

  const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-CA", { hour: "numeric", minute: "2-digit", timeZone: "America/Toronto" }) : "");

  return (
    <div>
      <div className="display" style={{ fontSize: 26, marginBottom: 12 }}>Site board</div>
      {err && <div style={{ color: "var(--red)" }}>{err}</div>}
      {!rows && !err && <div style={{ color: "var(--mute)" }}>Loading…</div>}
      {rows && rows.length === 0 && <div style={{ color: "var(--mute)" }}>No one is scheduled or punched in here today.</div>}
      {rows?.map((r) => (
        <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--line)", fontSize: 15 }}>
          <span>
            <b>{r.name}</b>
            {r.geo === "off" && <span style={chip(true)}>Off site</span>}
            {r.geo === "unknown" && <span style={chip(true)}>Location not checked</span>}
            {r.offSchedule && <span style={chip(true)}>Off schedule</span>}
          </span>
          <span style={chip(r.state === "not-in")}>
            {r.state === "in" ? `On site since ${time(r.at)}` : r.state === "out" ? "Clocked out" : "Not in yet"}
          </span>
        </div>
      ))}
      <button className="cc-btn" type="button" onClick={onBack} style={{ marginTop: 16, width: "100%", height: 54, fontSize: 17 }}>
        Back
      </button>
    </div>
  );
}
