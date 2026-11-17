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
    <div className={`cc-card cc-in${ink ? " ink" : ""}`} style={{ "--i": index } as React.CSSProperties}>
      <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--mute)", fontWeight: 600 }}>
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontSize: "clamp(22px, 2.15vw, 34px)",
          fontWeight: 700,
          letterSpacing: "-0.04em",
          lineHeight: 1.05,
          marginTop: 6,
          color: color ? `var(--${color})` : "var(--text)",
        }}
      >
        {value}
      </div>
      {hint && <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}
