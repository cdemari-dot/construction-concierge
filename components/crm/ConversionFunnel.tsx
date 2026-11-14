import { CountUp } from "@/components/ui/CountUp";

export interface FunnelData {
  created: number;
  sent: number;
  won: number;
  lost: number;
  wonValue: number;
  lostValue: number;
}

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : null);

export function ConversionFunnel({ d }: { d: FunnelData }) {
  const steps = [
    { label: "Bids created", n: d.created, base: d.created, color: "var(--mute)" },
    { label: "Bid sent", n: d.sent, base: d.created, color: "var(--cyan)" },
    { label: "Won", n: d.won, base: d.created, color: "var(--lime)" },
  ];
  const ratios = [
    { label: "Lead → bid sent", v: pct(d.sent, d.created) },
    { label: "Bid sent → won", v: pct(d.won, d.sent) },
    { label: "Lead → won", v: pct(d.won, d.created) },
    { label: "Win rate (won ÷ decided)", v: pct(d.won, d.won + d.lost) },
  ];
  const valueWon = pct(d.wonValue, d.wonValue + d.lostValue);

  return (
    <section className="cc-card cc-in" style={{ marginBottom: 18, "--i": 4 } as React.CSSProperties}>
      <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 14 }}>Conversion funnel</h3>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 22, alignItems: "center" }}>
        <div style={{ display: "grid", gap: 12 }}>
          {steps.map((s, i) => {
            const w = s.base > 0 ? Math.max(3, (s.n / s.base) * 100) : 3;
            return (
              <div key={s.label}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 4 }}>
                  <span>{s.label}</span>
                  <b className="mono">
                    <CountUp value={s.n} />
                  </b>
                </div>
                <div style={{ background: "var(--panel)", borderRadius: 8, height: 14, overflow: "hidden" }}>
                  <div className="cc-barx" style={{ "--i": i, width: `${w}%`, height: "100%", background: s.color, borderRadius: 8 } as React.CSSProperties} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {ratios.map((r, i) => (
            <div key={r.label} className="cc-in" style={{ "--i": 5 + i } as React.CSSProperties}>
              <div style={{ fontSize: 10.5, letterSpacing: 1.1, textTransform: "uppercase", color: "var(--mute)" }}>{r.label}</div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 600, color: r.v == null ? "var(--mute)" : "var(--text)" }}>
                {r.v == null ? "—" : <CountUp value={r.v} suffix="%" />}
              </div>
            </div>
          ))}
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "var(--mute)" }}>
            {valueWon == null ? "No decided bids yet." : <>By dollar value you&apos;ve won <b style={{ color: "var(--text)" }}>{Math.round(valueWon)}%</b> of what you&apos;ve decided.</>}
          </div>
        </div>
      </div>
    </section>
  );
}
