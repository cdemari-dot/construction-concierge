import { Dial } from "@/components/charts/Dial";
import { CountUp } from "@/components/ui/CountUp";
import { fmt } from "@/lib/format";
import type { CoachResult } from "@/lib/coach/finance";

const TONE = { red: "var(--red)", amber: "var(--amber)", lime: "var(--lime)", cyan: "var(--cyan)" } as const;

export function CoachPanel({ coach }: { coach: CoachResult }) {
  const w = coach.weekly;
  const buckets = [
    { label: "HST", v: w.hst, c: "var(--amber)" },
    { label: "Income tax", v: w.tax, c: "var(--red)" },
    { label: "Equipment", v: w.equipment, c: "var(--cyan)" },
    { label: "Profit (you)", v: w.profit, c: "var(--lime)" },
    { label: "Cushion", v: w.cushion, c: "var(--text2)" },
  ];
  const maxV = Math.max(1, ...buckets.map((b) => b.v));
  const cushionPct = coach.cushion.goal > 0 ? Math.min(100, (coach.cushion.current / coach.cushion.goal) * 100) : 0;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <Dial value={coach.score} max={100} label="Cash health" suffix="" color={coach.score >= 80 ? "lime" : coach.score >= 60 ? "amber" : "red"} hint={coach.label} />
        <section className="cc-card cc-in" style={{ "--i": 1 } as React.CSSProperties}>
          <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 6 }}>Your Friday savings routine</h3>
          <div style={{ fontSize: 12.5, color: "var(--mute)", marginBottom: 10 }}>
            Move this on an average week of {fmt(w.avgCollected)} collected: <b className="mono" style={{ color: "var(--text)" }}>$<CountUp value={w.total} /></b>
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {buckets.map((b, i) => (
              <div key={b.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span>{b.label}</span>
                  <span className="mono">{fmt(b.v)}/wk</span>
                </div>
                <div style={{ background: "var(--panel)", borderRadius: 6, height: 8, overflow: "hidden" }}>
                  <div className="cc-barx" style={{ "--i": i, width: `${Math.max(3, (b.v / maxV) * 100)}%`, height: "100%", background: b.c, borderRadius: 6 } as React.CSSProperties} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="cc-card cc-in" style={{ "--i": 2 } as React.CSSProperties}>
          <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 6 }}>3-month cushion</h3>
          <div className="mono" style={{ fontSize: 26, fontWeight: 600 }}>
            {fmt(coach.cushion.current)} <span style={{ fontSize: 14, color: "var(--mute)" }}>of {fmt(coach.cushion.goal)}</span>
          </div>
          <div style={{ background: "var(--panel)", borderRadius: 8, height: 14, overflow: "hidden", margin: "10px 0 6px" }}>
            <div className="cc-barx" style={{ width: `${Math.max(2, cushionPct)}%`, height: "100%", background: cushionPct >= 100 ? "var(--lime)" : "var(--cyan)", borderRadius: 8 }} />
          </div>
          <div style={{ fontSize: 12.5, color: "var(--mute)" }}>
            {coach.cushion.weeksToGoal === 0 ? "Goal reached" : coach.cushion.weeksToGoal == null ? "Add revenue data to estimate a timeline." : `About ${coach.cushion.weeksToGoal} weeks at your current collections.`}
          </div>
        </section>
      </div>

      <section className="cc-card cc-in" style={{ "--i": 3 } as React.CSSProperties}>
        <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>Your CFO says…</h3>
        <div style={{ display: "grid", gap: 10 }}>
          {coach.items.map((it, i) => (
            <div key={it.id} className="cc-in" style={{ "--i": i + 4, display: "flex", gap: 12, borderLeft: `3px solid ${TONE[it.tone]}`, paddingLeft: 12 } as React.CSSProperties}>
              <div style={{ fontSize: 24 }}>{it.emoji}</div>
              <div>
                <b style={{ fontSize: 14 }}>{it.title}</b>
                <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginTop: 2 }}>{it.detail}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--mute)" }}>Guidance from your own numbers, not tax or legal advice. Confirm anything that matters with your accountant.</div>
      </section>
    </div>
  );
}
