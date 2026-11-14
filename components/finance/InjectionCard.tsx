import Link from "next/link";
import { CountUp } from "@/components/ui/CountUp";
import { fmt } from "@/lib/format";
import type { InjectionResult } from "@/lib/cashflow/injection";

const LEVEL = {
  none: { color: "var(--lime)", bg: "rgba(63,191,127,.08)", border: "rgba(63,191,127,.45)", emoji: "✅", head: "No cash injection needed" },
  watch: { color: "var(--amber)", bg: "rgba(245,166,35,.08)", border: "rgba(245,166,35,.5)", emoji: "👀", head: "Keep an eye on cash" },
  soon: { color: "var(--amber)", bg: "rgba(245,166,35,.1)", border: "rgba(245,166,35,.6)", emoji: "⏳", head: "You'll likely need a cash injection" },
  urgent: { color: "var(--red)", bg: "rgba(229,72,77,.1)", border: "rgba(229,72,77,.6)", emoji: "🚨", head: "You need a cash injection soon" },
} as const;

export function InjectionCard({ inj, missing = [] }: { inj: InjectionResult; missing?: string[] }) {
  if (missing.length > 0) {
    return (
      <section className="cc-card cc-in" style={{ marginBottom: 16, borderColor: "rgba(200,164,100,.6)", background: "rgba(200,164,100,.08)" }}>
        <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--mute)" }}>Cash injection forecast</div>
        <div style={{ fontSize: 18, fontWeight: 700, margin: "4px 0 6px" }}>🧮 Add your numbers to see if and when you&apos;ll need cash</div>
        <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text2)" }}>
          The forecast can&apos;t tell you anything real yet. Still missing: <b>{missing.join(", ")}</b>. It takes a couple of minutes in{" "}
          <Link href="/finance?tab=settings" style={{ color: "var(--cyan)" }}>Playbook &amp; settings</Link>, then this card tells you how much cash you&apos;ll need and by when.
        </div>
      </section>
    );
  }
  const L = LEVEL[inj.level];
  const weekDate = (i: number) => inj.buckets[i]?.weekStart;
  return (
    <section className="cc-card cc-in" style={{ marginBottom: 16, background: L.bg, borderColor: L.border }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ minWidth: 240, flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--mute)" }}>Cash injection forecast</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: L.color, margin: "4px 0 6px" }}>
            {L.emoji} {L.head}
          </div>
          {inj.level === "none" ? (
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text2)" }}>
              Over the next 13 weeks your lowest projected balance is <b>{fmt(inj.minBalance)}</b> (week {inj.minWeek + 1}, {weekDate(inj.minWeek)}), above your {fmt(inj.buffer)} safety cushion.
              {inj.stress.needed > 0 && <> If every customer paid two weeks late you would need about <b>{fmt(inj.stress.needed)}</b>, so keep chasing invoices.</>}
            </div>
          ) : (
            <div style={{ fontSize: 13.5, lineHeight: 1.6, color: "var(--text2)" }}>
              {inj.firstNegativeWeek != null ? (
                <>Your balance goes negative in <b>week {inj.firstNegativeWeek + 1}</b> ({weekDate(inj.firstNegativeWeek)}). </>
              ) : (
                <>Your balance dips under the {fmt(inj.buffer)} safety cushion in <b>week {(inj.firstShortWeek ?? 0) + 1}</b> ({weekDate(inj.firstShortWeek ?? 0)}). </>
              )}
              The lowest point is <b>{fmt(inj.minBalance)}</b> in week {inj.minWeek + 1}. Have the money in the bank by <b>{inj.neededBy}</b>.
            </div>
          )}
        </div>
        {inj.level !== "none" && (
          <div style={{ textAlign: "center", minWidth: 160 }}>
            <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: "var(--mute)" }}>Amount needed</div>
            <div className="mono" style={{ fontSize: 34, fontWeight: 700, color: L.color }}>
              $<CountUp value={inj.needed} />
            </div>
            <div style={{ fontSize: 12, color: "var(--mute)" }}>stress case (customers 2 wks late): {fmt(inj.stress.needed)}</div>
          </div>
        )}
      </div>

      {inj.level !== "none" && (
        <div style={{ marginTop: 14, display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
          {[
            { e: "📞", t: "1. Collect faster", d: "Chase overdue invoices and ask for early payment on the big ones. It costs nothing." },
            { e: "🧾", t: "2. Stretch payables", d: "Ask suppliers for 2-week extensions before the due date. Pay payroll and CRA first." },
            { e: "🏦", t: `3. Credit line (~${fmt(inj.suggestedLine)})`, d: "Open it while the books look good, not when you're short. Use it as a bridge, not a habit." },
            { e: "🤝", t: "4. Owner loan or factoring", d: "Last resort: a shareholder loan or selling invoices at a discount. Costly, so only if 1–3 aren't enough." },
          ].map((o, i) => (
            <div key={o.t} className="cc-in" style={{ "--i": i + 1, background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 12, padding: 10, fontSize: 12.5, lineHeight: 1.5 } as React.CSSProperties}>
              <b>
                {o.e} {o.t}
              </b>
              <div style={{ color: "var(--mute)", marginTop: 2 }}>{o.d}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--mute)" }}>
        Safety cushion = one payroll run + one month of overhead. These are estimates from your entered data. Confirm borrowing decisions with your accountant or banker.
      </div>
    </section>
  );
}
