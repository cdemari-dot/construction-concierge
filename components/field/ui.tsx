"use client";

import type { ReactNode } from "react";

export function Title({ emoji, children, help }: { emoji: string; children: ReactNode; help?: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div className="display fa-title">
        {emoji ? `${emoji} ` : null}{children}
      </div>
      {help && <div className="fa-help">{help}</div>}
    </div>
  );
}

export function Notice({ ok, error }: { ok?: string | null; error?: string | null }) {
  if (error) return <div className="fa-err">{error}</div>;
  if (ok) return <div className="fa-ok">{ok}</div>;
  return null;
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="fa-label">{children}</span>;
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; emoji?: string; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <div className="fa-chips">
      {options.map((o) => (
        <button key={o.value} type="button" className={`fa-chip ${value === o.value ? "on" : ""}`} onClick={() => onChange(o.value)}>
          {o.emoji ? <span className="e">{o.emoji}</span> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 999, step = 1, unit }: { value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; unit?: string }) {
  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n * 100) / 100));
  return (
    <div className="fa-stepper">
      <button type="button" onClick={() => onChange(clamp(value - step))} aria-label="Less">
        −
      </button>
      <div className="v">
        {value}
        {unit ? <span style={{ fontSize: 15, color: "var(--mute)", marginLeft: 4 }}>{unit}</span> : null}
      </div>
      <button type="button" onClick={() => onChange(clamp(value + step))} aria-label="More">
        +
      </button>
    </div>
  );
}
