"use client";

import { useState } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { fmt } from "@/lib/format";
import { CATEGORIES, planAfford, type CatStatus, type RevenueBasis } from "@/lib/afford/plan";
import { saveOverheadBreakdown } from "@/app/(owner)/cashflow/actions";
import type { CashFlowAssumptions } from "@/lib/types/database";

const TONE: Record<CatStatus, { color: string; label: string }> = {
  ok: { color: "var(--lime)", label: "Room to spare" },
  tight: { color: "var(--amber)", label: "At the limit" },
  over: { color: "var(--red)", label: "Over the limit" },
  unknown: { color: "var(--mute)", label: "Add what you spend" },
};

const h3: React.CSSProperties = { fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 10 };
const inputStyle: React.CSSProperties = { background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 10, color: "var(--text)", padding: "9px 10px", fontSize: 14, width: "100%" };

export function AffordPanel({ a, basis, demo }: { a: CashFlowAssumptions; basis: RevenueBasis; demo: boolean }) {
  const baseMargin = a.gross_margin_target > 0 ? a.gross_margin_target : 25;
  const baseProfit = a.profit_allocation_pct > 0 ? a.profit_allocation_pct : 8;
  const [revenue, setRevenue] = useState(Math.round(basis.annual / 50000) * 50000 || basis.annual);
  const [margin, setMargin] = useState(baseMargin);
  const [profit, setProfit] = useState(baseProfit);

  const r = planAfford({ revenue, marginPct: margin, profitPct: profit, overheadMonthly: a.overhead_monthly, a });
  const changed = revenue !== Math.round(basis.annual / 50000) * 50000 || margin !== baseMargin || profit !== baseProfit;
  const levelTone = r.level === "healthy" ? "var(--lime)" : r.level === "tight" ? "var(--amber)" : "var(--red)";
  const levelText = r.level === "healthy" ? "Healthy" : r.level === "tight" ? "Tight" : "Over budget";
  const maxRev = Math.max(6_000_000, basis.annual * 2);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="cc-card cc-in">
        <h3 style={h3}>How this is worked out</h3>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: 14 }}>
          Each dollar you bill has to cover job costs, overhead and your profit. At <b>{margin}%</b> gross margin and <b>{profit}%</b> kept as profit, overhead can take <b>{r.overheadPct.toFixed(0)}%</b> of revenue. {basis.note}
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
          <Slider label="Yearly revenue" value={fmt(revenue)} min={100000} max={maxRev} step={50000} v={revenue} on={setRevenue} />
          <Slider label="Gross margin" value={`${margin}%`} min={10} max={50} step={1} v={margin} on={setMargin} />
          <Slider label="Profit you keep" value={`${profit}%`} min={0} max={25} step={1} v={profit} on={setProfit} />
        </div>
        {changed && (
          <button type="button" className="cc-btn ghost sm" style={{ marginTop: 10 }} onClick={() => { setRevenue(Math.round(basis.annual / 50000) * 50000 || basis.annual); setMargin(baseMargin); setProfit(baseProfit); }}>
            Reset to my numbers
          </button>
        )}
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <Stat i={1} label="Overhead you can carry" value={r.roomMonthly} sub={`per month, ${r.overheadPct.toFixed(0)}% of revenue`} />
        <Stat i={2} label="You spend now" value={r.spendMonthly} sub={r.spendMonthly > 0 ? "per month, from your settings" : "add it below"} />
        <section className="cc-card cc-in" style={{ "--i": 3 } as React.CSSProperties}>
          <div style={{ fontSize: 10.5, letterSpacing: 1.1, textTransform: "uppercase", color: "var(--mute)" }}>Room left</div>
          <div className="mono" style={{ fontSize: 26, fontWeight: 600, color: levelTone }}>
            {r.leftMonthly < 0 ? "-" : ""}$<CountUp value={Math.abs(r.leftMonthly)} />
          </div>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "var(--panel)", color: levelTone }}>{r.spendMonthly > 0 ? levelText : "Add your overhead"}</span>
        </section>
      </div>

      <section className="cc-card cc-in" style={{ "--i": 4 } as React.CSSProperties}>
        <h3 style={h3}>Healthy monthly ceiling by category</h3>
        <div style={{ display: "grid", gap: 16 }}>
          {r.categories.map((c, i) => {
            const scale = Math.max(c.ceiling, c.spend) * 1.2 || 1;
            const t = TONE[c.status];
            return (
              <div key={c.key} className="cc-in" style={{ "--i": i + 5 } as React.CSSProperties}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 14 }}>
                  <span>
                    {c.label} <span style={{ color: "var(--mute)", fontSize: 11.5 }}>· {c.hint}</span>
                  </span>
                  <span className="mono">
                    <b>{fmt(c.ceiling)}</b> <span style={{ color: "var(--mute)", fontSize: 11.5 }}>max / month</span>
                  </span>
                </div>
                <div style={{ position: "relative", background: "var(--panel)", borderRadius: 6, height: 10, margin: "8px 0 6px", overflow: "hidden" }}>
                  <div className="cc-barx" style={{ "--i": i, width: `${Math.min(100, (c.spend / scale) * 100)}%`, height: "100%", background: t.color, borderRadius: 6, transition: "width .4s" } as React.CSSProperties} />
                  <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(c.ceiling / scale) * 100}%`, width: 2, background: "var(--text)", transition: "left .4s" }} />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--mute)" }}>
                  <span>{c.spend > 0 ? `You spend ${fmt(c.spend)}` : "Not entered yet"}</span>
                  <span style={{ color: t.color, fontWeight: 600 }}>{c.status === "over" ? `Over by ${fmt(-c.gap)}` : c.status === "unknown" ? t.label : c.status === "tight" ? `${t.label}, ${fmt(c.gap)} left` : `${t.label}, ${fmt(c.gap)} left`}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11.5, color: "var(--mute)", marginTop: 14 }}>The black marker is the ceiling. These shares are typical for contractors, a guide rather than a rule.</div>
      </section>

      <section className="cc-card cc-in" style={{ "--i": 6 } as React.CSSProperties}>
        <h3 style={h3}>Thinking about a truck or another lease?</h3>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <span className="mono" style={{ fontSize: 30, fontWeight: 700, color: r.truckHeadroom > 0 ? "var(--lime)" : "var(--red)" }}>
            $<CountUp value={r.truckHeadroom} />
          </span>
          <span style={{ color: "var(--mute)", fontSize: 13 }}>
            {r.truckHeadroom > 0 ? "more per month you could add to vehicles and stay healthy" : "no room to add vehicle payments right now"}
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--mute)", marginTop: 8, lineHeight: 1.6 }}>
          That covers the payment, insurance and fuel for the new vehicle together, so count all three. {r.unitemised > 0 && `About ${fmt(r.unitemised)} a month of your overhead is not assigned to a category yet.`}
        </div>
      </section>

      {!demo && (
        <section className="cc-card cc-in" style={{ "--i": 7 } as React.CSSProperties}>
          <h3 style={h3}>What you spend each month</h3>
          <form action={saveOverheadBreakdown} style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {CATEGORIES.map((c) => (
                <label key={c.key} style={{ fontSize: 11.5, color: "var(--mute)", display: "grid", gap: 4 }}>
                  {c.label}
                  <input name={c.field} type="number" min={0} step="0.01" defaultValue={Number(a[c.field] ?? 0) || ""} placeholder="0" style={inputStyle} />
                </label>
              ))}
            </div>
            <div style={{ fontSize: 12, color: "var(--mute)" }}>If these add up to more than your total overhead in Playbook &amp; settings, the total is raised to match.</div>
            <button className="cc-btn lime sm" type="submit" style={{ justifySelf: "start" }}>
              Save
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

function Slider({ label, value, min, max, step, v, on }: { label: string; value: string; min: number; max: number; step: number; v: number; on: (n: number) => void }) {
  return (
    <label style={{ display: "grid", gap: 6, fontSize: 12.5, color: "var(--mute)" }}>
      <span style={{ display: "flex", justifyContent: "space-between" }}>
        {label}
        <b className="mono" style={{ color: "var(--text)" }}>{value}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={v} onChange={(e) => on(Number(e.target.value))} aria-label={label} style={{ width: "100%", accentColor: "var(--cyan)" }} />
    </label>
  );
}

function Stat({ i, label, value, sub }: { i: number; label: string; value: number; sub: string }) {
  return (
    <section className="cc-card cc-in" style={{ "--i": i } as React.CSSProperties}>
      <div style={{ fontSize: 10.5, letterSpacing: 1.1, textTransform: "uppercase", color: "var(--mute)" }}>{label}</div>
      <div className="mono" style={{ fontSize: 26, fontWeight: 600 }}>
        $<CountUp value={value} />
      </div>
      <div style={{ fontSize: 12, color: "var(--mute)" }}>{sub}</div>
    </section>
  );
}
