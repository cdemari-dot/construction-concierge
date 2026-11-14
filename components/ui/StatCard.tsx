export function StatCard({
  label,
  value,
  hint,
  color,
  index = 0,
}: {
  label: string;
  value: string;
  hint?: string;
  color?: "cyan" | "lime" | "amber" | "red";
  index?: number;
}) {
  return (
    <div className="cc-card cc-in" style={{ "--i": index } as React.CSSProperties}>
      <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--mute)" }}>
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontSize: "clamp(20px, 2.2vw, 26px)",
          fontWeight: 600,
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
