import type { WeekBucket } from "@/lib/cashflow/forecast";

export function CashFlowChart({ buckets }: { buckets: WeekBucket[] }) {
  const width = 760;
  const height = 220;
  const padding = 24;
  const balances = buckets.map((b) => b.endingBalance);
  const min = Math.min(0, ...balances);
  const max = Math.max(1, ...balances);
  const span = max - min || 1;

  const x = (i: number) => padding + (i / (buckets.length - 1)) * (width - padding * 2);
  const y = (v: number) => height - padding - ((v - min) / span) * (height - padding * 2);
  const zeroY = y(0);

  const linePath = buckets.map((b, i) => `${i === 0 ? "M" : "L"} ${x(i).toFixed(1)} ${y(b.endingBalance).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${x(buckets.length - 1).toFixed(1)} ${zeroY} L ${x(0).toFixed(1)} ${zeroY} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke="var(--line2)" strokeDasharray="4 4" />
      <path d={areaPath} fill="rgba(200,164,100,.12)" stroke="none" />
      <path d={linePath} fill="none" stroke="var(--cyan)" strokeWidth={2} />
      {buckets.map((b, i) => (
        <circle
          key={b.weekStart}
          cx={x(i)}
          cy={y(b.endingBalance)}
          r={3}
          fill={b.endingBalance < 0 ? "var(--red)" : "var(--cyan)"}
        />
      ))}
    </svg>
  );
}
