"use client";

import { useEffect, useState } from "react";

export interface DialProps {
  value: number;
  max: number;
  label: string;
  hint?: string;
  color?: "cyan" | "lime" | "amber" | "red";
  suffix?: string;
}

const R = 46;
const C = 2 * Math.PI * R;

// Activity-ring style gauge: a thick rounded ring that sweeps to its value while the number counts up.
export function Dial({ value, max, label, hint, color = "cyan", suffix = "" }: DialProps) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const [k, setK] = useState(0);
  const [shown, setShown] = useState(0);
  const stroke = `var(--${color})`;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const r = requestAnimationFrame(() => {
        setK(1);
        setShown(value);
      });
      return () => cancelAnimationFrame(r);
    }
    const raf1 = requestAnimationFrame(() => setK(1));
    const t0 = performance.now();
    let raf2 = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / 1400);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf2 = requestAnimationFrame(step);
    };
    raf2 = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [value]);

  return (
    <div className="cc-card lift dial" style={{ textAlign: "center" }}>
      <div className="dial-ring">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" style={{ stroke: "var(--line)" }} />
          <circle
            cx="60"
            cy="60"
            r={R}
            fill="none"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${C * pct * k} ${C}`}
            transform="rotate(-90 60 60)"
            style={{ stroke, transition: "stroke-dasharray 1.4s cubic-bezier(.2,.8,.2,1)" }}
          />
        </svg>
        <div className="dial-num">
          {Math.round(shown)}
          {suffix}
        </div>
      </div>
      <div className="dial-label">{label}</div>
      {hint && <div className="dial-hint" style={{ color: stroke }}>{hint}</div>}
    </div>
  );
}
