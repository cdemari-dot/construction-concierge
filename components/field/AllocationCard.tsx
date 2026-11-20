"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

interface Alloc {
  hours_allocated: number | null;
  hours_used: number;
  bins_allocated: number | null;
  bins_used: number;
}

function Meter({ label, used, total, unit }: { label: string; used: number; total: number; unit: string }) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 100;
  const over = used > total;
  const near = !over && used >= total * 0.85;
  const color = over ? "var(--red)" : near ? "var(--amber)" : "var(--lime)";
  const left = Math.round((total - used) * 10) / 10;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color }}>
          {used} of {total} {unit}
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 6, background: "var(--card-a)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width .6s ease" }} />
      </div>
      <div style={{ fontSize: 12.5, color: "var(--mute)", marginTop: 4 }}>
        {over ? `${Math.abs(left)} ${unit} over your allocation` : `${left} ${unit} left`}
      </div>
    </div>
  );
}

// The foreman sees only what the owner allocated to them, never the real budget.
export function AllocationCard({ supabase, jobId }: { supabase: SupabaseClient; jobId: string }) {
  const [a, setA] = useState<Alloc | null>(null);

  useEffect(() => {
    let live = true;
    supabase.rpc("job_allocation", { p_job: jobId }).then(({ data }) => {
      if (live) setA((data as Alloc | null) ?? null);
    });
    return () => {
      live = false;
    };
  }, [supabase, jobId]);

  if (!a || (a.hours_allocated == null && a.bins_allocated == null)) return null;
  return (
    <div className="cc-card cc-in" style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--mute)", marginBottom: 10 }}>Your allocation</div>
      {a.hours_allocated != null && <Meter label="Hours" used={a.hours_used} total={a.hours_allocated} unit="hrs" />}
      {a.bins_allocated != null && <Meter label="Bins" used={a.bins_used} total={a.bins_allocated} unit="bins" />}
    </div>
  );
}
