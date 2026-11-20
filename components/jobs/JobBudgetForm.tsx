"use client";

import { useState, useTransition } from "react";
import { saveJobBudget } from "@/app/(owner)/jobs/actions";

export interface BudgetValues {
  budget_hours: number | null;
  hours_pct: number;
  budget_bins: number | null;
  bins_pct: number;
}

const input: React.CSSProperties = { padding: "8px 10px", borderRadius: 10, border: "1px solid var(--line2)", background: "transparent", color: "inherit", width: 110 };
const lab: React.CSSProperties = { fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 };

export function JobBudgetForm({ jobId, initial, hoursUsed, binsUsed }: { jobId: string; initial: BudgetValues; hoursUsed: number; binsUsed: number }) {
  const [hours, setHours] = useState(initial.budget_hours?.toString() ?? "");
  const [hPct, setHPct] = useState(String(initial.hours_pct));
  const [bins, setBins] = useState(initial.budget_bins?.toString() ?? "");
  const [bPct, setBPct] = useState(String(initial.bins_pct));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const hAlloc = hours ? Math.round(Number(hours) * Number(hPct)) / 100 : null;
  const bAlloc = bins ? Math.floor((Number(bins) * Number(bPct)) / 100) : null;

  return (
    <div className="cc-card" style={{ marginBottom: 20, display: "grid", gap: 10 }}>
      <div style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)" }}>Hours and bin budget</div>
      <div style={{ fontSize: 13, color: "var(--mute)" }}>
        Your real budget stays here. The foreman only sees the allocated number (budget × percent) on their app and kiosk.
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={lab}>
          Budget hours
          <input style={input} type="number" min={0} step="0.5" inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
        </label>
        <label style={lab}>
          % to foreman
          <input style={input} type="number" min={1} max={200} inputMode="numeric" value={hPct} onChange={(e) => setHPct(e.target.value)} />
        </label>
        <div style={{ fontSize: 13 }}>
          Foreman sees <b>{hAlloc ?? "none"}</b> hrs · used so far <b>{Math.round(hoursUsed * 10) / 10}</b>
        </div>
      </div>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        <label style={lab}>
          Budget bins
          <input style={input} type="number" min={0} inputMode="numeric" value={bins} onChange={(e) => setBins(e.target.value)} />
        </label>
        <label style={lab}>
          % to foreman
          <input style={input} type="number" min={1} max={200} inputMode="numeric" value={bPct} onChange={(e) => setBPct(e.target.value)} />
        </label>
        <div style={{ fontSize: 13 }}>
          Foreman sees <b>{bAlloc ?? "none"}</b> bins · hauled so far <b>{binsUsed}</b>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          type="button"
          className="cc-btn lime sm"
          disabled={pending}
          onClick={() => {
            setMsg(null);
            start(async () => {
              try {
                await saveJobBudget(jobId, {
                  budget_hours: hours === "" ? null : Number(hours),
                  hours_pct: Number(hPct) || 100,
                  budget_bins: bins === "" ? null : Number(bins),
                  bins_pct: Number(bPct) || 100,
                });
                setMsg({ ok: true, text: "Saved" });
              } catch (e) {
                setMsg({ ok: false, text: e instanceof Error ? e.message : "Not saved" });
              }
            });
          }}
        >
          Save budget
        </button>
        {msg && <span style={{ fontSize: 13, color: msg.ok ? "var(--lime)" : "var(--red)" }}>{msg.text}</span>}
      </div>
    </div>
  );
}
