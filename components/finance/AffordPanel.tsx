"use client";

import { useState } from "react";
import { CountUp } from "@/components/ui/CountUp";
import { fmt } from "@/lib/format";
import { CATEGORIES, planAfford, resolveShares, type CatStatus, type MarginActual, type RevenueActual } from "@/lib/afford/plan";
import { saveAffordShares, saveOverheadBreakdown } from "@/app/(owner)/cashflow/actions";
import type { CashFlowAssumptions } from "@/lib/types/database";

const TONE: Record<CatStatus, { color: string; label: string }> = {
  ok: { color: "var(--lime)", label: "Room to spare" },
  tight: { color: "var(--amber)", label: "At the limit" },
  over: { color: "var(--red)", label: "Over the limit" },
  unknown: { color: "var(--mute)", label: "Add what you spend" },
};

const h3: React.CSSProperties = { fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 10 };
const inputStyle: React.CSSProperties = { background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 10, color: "var(--text)", padding: "9px 10px", fontSize: 14, width: "100%" };

export function AffordPanel({ a, revenue, margin, demo }: { a: CashFlowAssumptions; revenue: RevenueActual; margin: MarginActual; demo: boolean }) {
  const targetRev = a.revenue_target_annual > 0 ? a.revenue_target_annual : null;
  const targetMar = a.gross_margin_target > 0 ? a.gross_margin_target : null;
  const baseProfit = a.profit_allocation_pct > 0 ? a.profit_allocation_pct : 8;

  // Start from, and reset to, the real numbers. A target is used only where there is no actual yet.
  const actualRev = revenue.annual != null ? Math.round(revenue.annual / 1000) * 1000 : null;
  const actualMar = margin.pct != null ? Math.round(margin.pct * 10) / 10 : null;
  // Use the actual when it can be trusted. While it is still an early estimate, never start higher
  // than the target: the safer (lower) of the two, so the page cannot overstate what you can afford.
  const pick = (actual: number | null, target: number | null, reliable: boolean, fallback: number) =>
    actual != null && (reliable || target == null) ? actual : actual != null && target != null ? Math.min(actual, target) : (target ?? fallback);
  const startRev = pick(actualRev, targetRev, revenue.reliable, 0);
  const startMar = pick(actualMar, targetMar, margin.reliable, 25);

  const [revenueV, setRevenue] = useState(startRev);
  const [marginV, setMargin] = useState(startMar);
  const [profit, setProfit] = useState(baseProfit);

  const r = planAfford({ revenue: revenueV, marginPct: marginV, profitPct: profit, overheadMonthly: a.overhead_monthly, a });
  const earlyActuals = (actualRev != null && !revenue.reliable) || (actualMar != null && !margin.reliable);
  const changed = revenueV !== startRev || marginV !== startMar || profit !== baseProfit;
  const levelTone = r.level === "healthy" ? "var(--lime)" : r.level === "tight" ? "var(--amber)" : "var(--red)";
  const levelText = r.level === "healthy" ? "Healthy" : r.level === "tight" ? "Tight" : "Over budget";
  const maxRev = Math.max(6_000_000, (targetRev ?? 0) * 2, (actualRev ?? 0) * 2);

  const revSource = revenueV === actualRev ? "actual" : revenueV === targetRev ? "target" : "custom";
  const marSource = marginV === actualMar ? "actual" : marginV === targetMar ? "target" : "custom";
  const gap = actualRev != null && targetRev ? Math.round(((actualRev - targetRev) / targetRev) * 100) : null;
  const marGap = actualMar != null && targetMar ? Math.round((actualMar - targetMar) * 10) / 10 : null;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section className="cc-card cc-in">
        <h3 style={h3}>Where the numbers come from</h3>
        <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: 14 }}>
          Each dollar you bill has to cover job costs, overhead and your profit. At <b>{marginV}%</b> gross margin and <b>{profit}%</b> kept as profit, overhead can take <b>{r.overheadPct.toFixed(0)}%</b> of revenue. Pick your actual numbers or your targets for each line.
        </p>

        <SourceRow
          label="Yearly revenue"
          actual={actualRev != null ? fmt(actualRev) : null}
          target={targetRev != null ? fmt(targetRev) : null}
          source={revSource}
          onActual={actualRev != null ? () => setRevenue(actualRev) : undefined}
          onTarget={targetRev != null ? () => setRevenue(targetRev) : undefined}
          note={revenue.note}
          flag={gap != null && gap <= -15 ? { tone: "var(--amber)", text: `You are ${Math.abs(gap)}% below your target.` } : gap != null && gap >= 15 ? { tone: "var(--lime)", text: `You are ${gap}% above your target.` } : null}
          warn={actualRev != null && !revenue.reliable}
        />
        <SourceRow
          label="Gross margin"
          actual={actualMar != null ? `${actualMar}%` : null}
          target={targetMar != null ? `${targetMar}%` : null}
          source={marSource}
          onActual={actualMar != null ? () => setMargin(actualMar) : undefined}
          onTarget={targetMar != null ? () => setMargin(targetMar) : undefined}
          note={margin.note}
          flag={marGap != null && marGap <= -5 ? { tone: "var(--amber)", text: `Your real margin is ${Math.abs(marGap)} points below your target.` } : marGap != null && marGap >= 5 ? { tone: "var(--lime)", text: `Your real margin is ${marGap} points above your target.` } : null}
          warn={actualMar != null && !margin.reliable}
        />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
          <Slider label="Yearly revenue" value={fmt(revenueV)} min={100000} max={maxRev} step={10000} v={Math.min(revenueV, maxRev)} on={setRevenue} />
          <Slider label="Gross margin" value={`${marginV}%`} min={0} max={70} step={0.5} v={marginV} on={setMargin} />
          <Slider label="Profit you keep" value={`${profit}%`} min={0} max={25} step={1} v={profit} on={setProfit} />
        </div>
        {earlyActuals && (
          <div style={{ fontSize: 12, color: "var(--amber)", marginTop: 10, lineHeight: 1.55 }}>
            Your actual numbers are still early, so the page starts from the lower of your actual and your target to avoid overstating what you can afford. It switches to your actual numbers by itself once you have 3 months of billing, 3 billed jobs and some clocked-in labour recorded.
          </div>
        )}
        {changed && (
          <button
            type="button"
            className="cc-btn ghost sm"
            style={{ marginTop: 10 }}
            onClick={() => {
              setRevenue(startRev);
              setMargin(startMar);
              setProfit(baseProfit);
            }}
          >
            {earlyActuals ? "Reset to the safe starting numbers" : "Reset to my actual numbers"}
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
        <div style={{ fontSize: 11.5, color: "var(--mute)", marginTop: 14 }}>The black marker is the ceiling. Change the split in the box below to fit your business.</div>
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

      {!demo && <ShareEditor key={JSON.stringify(a.afford_weights)} a={a} />}

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

// Edit how the overhead budget is split across categories. Numbers are scaled to add to 100%.
function ShareEditor({ a }: { a: CashFlowAssumptions }) {
  const current = resolveShares(a);
  const [vals, setVals] = useState<Record<string, string>>(() => Object.fromEntries(CATEGORIES.map((c) => [c.key, String(Math.round(current[c.key] * 10) / 10)])));
  const sum = CATEGORIES.reduce((s, c) => s + (Number(vals[c.key]) || 0), 0);
  const custom = a.afford_weights != null;

  return (
    <section className="cc-card cc-in" style={{ "--i": 6 } as React.CSSProperties}>
      <h3 style={h3}>How your overhead budget is split</h3>
      <p style={{ fontSize: 12.5, color: "var(--mute)", marginBottom: 12, lineHeight: 1.6 }}>
        {custom ? "You are using your own split." : "This is the typical contractor split."} A roofer with a big truck fleet might give vehicles more and rent less. Enter what makes sense for you; it is scaled to add to 100%.
      </p>
      <form action={saveAffordShares} style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
          {CATEGORIES.map((c) => (
            <label key={c.key} style={{ fontSize: 11.5, color: "var(--mute)", display: "grid", gap: 4 }}>
              {c.label} (%)
              <input name={`share_${c.key}`} type="number" min={0} max={100} step="0.1" value={vals[c.key]} onChange={(e) => setVals((v) => ({ ...v, [c.key]: e.target.value }))} style={inputStyle} />
            </label>
          ))}
        </div>
        <div style={{ fontSize: 12, color: Math.abs(sum - 100) < 0.5 ? "var(--lime)" : "var(--amber)" }}>
          Adds up to {Math.round(sum * 10) / 10}%{Math.abs(sum - 100) < 0.5 ? "" : ", it will be scaled to 100%"}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="cc-btn lime sm" type="submit">
            Save my split
          </button>
          {custom && (
            <button className="cc-btn ghost sm" type="submit" name="reset" value="1">
              Back to typical
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

function SourceRow({
  label,
  actual,
  target,
  source,
  onActual,
  onTarget,
  note,
  flag,
  warn,
}: {
  label: string;
  actual: string | null;
  target: string | null;
  source: "actual" | "target" | "custom";
  onActual?: () => void;
  onTarget?: () => void;
  note: string;
  flag: { tone: string; text: string } | null;
  warn: boolean;
}) {
  const pill = (on: boolean): React.CSSProperties => ({
    background: on ? "var(--card-a)" : "transparent",
    border: `1px solid ${on ? "var(--text)" : "var(--line2)"}`,
    borderRadius: 10,
    padding: "8px 12px",
    color: "var(--text)",
    textAlign: "left",
    cursor: "pointer",
    minWidth: 140,
  });
  return (
    <div style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
      <div style={{ fontSize: 12, color: "var(--mute)", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" disabled={!onActual} onClick={onActual} style={{ ...pill(source === "actual"), opacity: onActual ? 1 : 0.5 }} aria-pressed={source === "actual"}>
          <div style={{ fontSize: 10.5, letterSpacing: 1.1, textTransform: "uppercase", color: "var(--mute)" }}>Your actual</div>
          <div className="mono" style={{ fontSize: 17, fontWeight: 600 }}>{actual ?? "No data yet"}</div>
        </button>
        <button type="button" disabled={!onTarget} onClick={onTarget} style={{ ...pill(source === "target"), opacity: onTarget ? 1 : 0.5 }} aria-pressed={source === "target"}>
          <div style={{ fontSize: 10.5, letterSpacing: 1.1, textTransform: "uppercase", color: "var(--mute)" }}>Your target</div>
          <div className="mono" style={{ fontSize: 17, fontWeight: 600 }}>{target ?? "Not set"}</div>
        </button>
      </div>
      <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 6, lineHeight: 1.55 }}>
        {note}
        {source === "custom" ? " You are testing your own number." : ""}
      </div>
      {flag && <div style={{ fontSize: 12.5, color: flag.tone, marginTop: 4, fontWeight: 600 }}>{flag.text}</div>}
      {warn && <div style={{ fontSize: 12, color: "var(--amber)", marginTop: 4 }}>Early estimate: treat it as a rough guide until there is more history.</div>}
    </div>
  );
}
