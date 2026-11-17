import { AnimatedValue } from "./AnimatedValue";

export function StatCard({
  label,
  value,
  hint,
  color,
  index = 0,
  ink = false,
}: {
  label: string;
  value: string;
  hint?: string;
  color?: "cyan" | "lime" | "amber" | "red";
  index?: number;
  ink?: boolean;
}) {
  return (
    <div className={`cc-card cc-in lift stat${ink ? " ink" : ""}`} style={{ "--i": index } as React.CSSProperties}>
      <div className="stat-label">{label}</div>
      <div className="mono stat-value" style={{ color: color ? `var(--${color})` : "var(--text)" }}>
        <AnimatedValue value={value} />
      </div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
