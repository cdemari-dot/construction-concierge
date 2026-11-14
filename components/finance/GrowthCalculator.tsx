"use client";

import { useState } from "react";
import { fmt } from "@/lib/format";

export function GrowthCalculator({ annualRun, usableCash, wcPerDollar, safeAddAnnual }: { annualRun: number; usableCash: number; wcPerDollar: number; safeAddAnnual: number }) {
  const [pct, setPct] = useState(15);
  const added = annualRun * (pct / 100);
  const wc = added * wcPerDollar;
  const shortfall = Math.max(0, wc - usableCash);
  const ok = shortfall === 0;
  const use = usableCash > 0 ? Math.min(100, (wc / usableCash) * 100) : wc > 0 ? 100 : 0;

  return (
    <section className="cc-card cc-in" style={{ "--i": 2 } as React.CSSProperties}>
      <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 10 }}>If you grow by…</h3>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span className="mono" style={{ fontSize: 34, fontWeight: 700 }}>{pct}%</span>
        <span style={{ color: "var(--mute)", fontSize: 13 }}>= {fmt(added)} more revenue a year ({fmt(added / 12)} a month)</span>
      </div>
      <input type="range" min={5} max={100} step={5} value={pct} onChange={(e) => setPct(Number(e.target.value))} aria-label="Growth percentage" style={{ width: "100%", margin: "12px 0", accentColor: "var(--cyan)" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 12 }}>
        <Stat label="Cash it ties up" value={fmt(wc)} />
        <Stat label="Cash growth can use" value={fmt(usableCash)} />
        <Stat label={ok ? "Outside money needed" : "Cash injection needed"} value={ok ? "$0" : fmt(shortfall)} color={ok ? "var(--lime)" : "var(--red)"} />
      </div>
      <div style={{ background: "var(--panel)", borderRadius: 8, height: 12, overflow: "hidden" }}>
        <div style={{ width: `${use}%`, height: "100%", background: ok ? "var(--lime)" : "var(--red)", borderRadius: 8, transition: "width .5s cubic-bezier(.2,.8,.2,1), background .3s" }} />
      </div>
      <div style={{ fontSize: 12.5, color: "var(--mute)", marginTop: 8, lineHeight: 1.6 }}>
        {ok ? `You can fund this from your own cash. The most you can add without outside money right now is about ${fmt(safeAddAnnual)} a year.` : `Your own cash covers about ${fmt(safeAddAnnual)} of new annual revenue. Beyond that you would need roughly ${fmt(shortfall)} of financing (a credit line set up in advance), or slower growth.`}
      </div>
    </section>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, letterSpacing: 1.1, textTransform: "uppercase", color: "var(--mute)" }}>{label}</div>
      <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: color ?? "var(--text)" }}>{value}</div>
    </div>
  );
}
