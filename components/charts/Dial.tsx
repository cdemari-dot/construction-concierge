"use client";

import { useEffect, useId, useState } from "react";

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
const ARC = C * 0.75;

export function Dial({ value, max, label, hint, color = "cyan", suffix = "" }: DialProps) {
  const id = useId().replace(/:/g, "");
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const [k, setK] = useState(0);
  const [shown, setShown] = useState(0);
  const stroke = `var(--${color})`;

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
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
      const p = Math.min(1, (now - t0) / 1500);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf2 = requestAnimationFrame(step);
    };
    raf2 = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [value]);

  const ticks = Array.from({ length: 28 }, (_, i) => {
    const a = ((135 + i * (270 / 27)) * Math.PI) / 180;
    const r1 = 54;
    const r2 = i % 3 === 0 ? 49 : 51;
    return (
      <line
        key={i}
        x1={(60 + r1 * Math.cos(a)).toFixed(2)}
        y1={(60 + r1 * Math.sin(a)).toFixed(2)}
        x2={(60 + r2 * Math.cos(a)).toFixed(2)}
        y2={(60 + r2 * Math.sin(a)).toFixed(2)}
        style={{ stroke: i / 27 <= pct * k ? stroke : "var(--line2)", transition: `stroke ${0.05 * i + 0.3}s` }}
        strokeWidth={1.4}
      />
    );
  });

  const dash = `${ARC * pct * k} ${C}`;
  const easing = "1.6s cubic-bezier(.2,.8,.2,1)";

  return (
    <div className="cc-card" style={{ textAlign: "center", padding: "14px 8px 12px" }}>
      <svg viewBox="0 0 120 112" style={{ width: "100%", maxWidth: 150, height: "auto", display: "block", margin: "0 auto" }}>
        <defs>
          <filter id={`${id}f`}>
            <feGaussianBlur stdDeviation="2.2" />
          </filter>
        </defs>
        <circle className="cc-spin" cx="60" cy="60" r="58" fill="none" stroke={stroke} strokeOpacity=".18" strokeDasharray="2 9" />
        <circle className="cc-spin rev" cx="60" cy="60" r="40" fill="none" stroke={stroke} strokeOpacity=".12" strokeDasharray="14 6" />
        {ticks}
        <circle cx="60" cy="60" r={R} fill="none" style={{ stroke: "var(--line)" }} strokeWidth="7" strokeDasharray={`${ARC} ${C}`} transform="rotate(135 60 60)" strokeLinecap="round" />
        <circle cx="60" cy="60" r={R} fill="none" stroke={stroke} strokeWidth="7" strokeDasharray={dash} transform="rotate(135 60 60)" strokeLinecap="round" filter={`url(#${id}f)`} opacity=".7" style={{ transition: `stroke-dasharray ${easing}` }} />
        <circle cx="60" cy="60" r={R} fill="none" stroke={stroke} strokeWidth="5" strokeDasharray={dash} transform="rotate(135 60 60)" strokeLinecap="round" style={{ transition: `stroke-dasharray ${easing}` }} />
        <g style={{ transformOrigin: "60px 60px", transform: `rotate(${135 + 270 * pct * k}deg)`, transition: `transform ${easing}` }}>
          <circle cx={60 + R} cy="60" r="6.5" fill={stroke} opacity=".25" />
          <circle cx={60 + R} cy="60" r="3.4" fill={stroke} filter={`url(#${id}f)`} />
          <circle cx={60 + R} cy="60" r="2.2" fill="#fff" />
        </g>
        <text x="60" y="66" textAnchor="middle" style={{ fill: "var(--text)", fontFamily: "var(--font-bodoni), Didot, serif" }} fontSize="19" fontWeight="500">
          {Math.round(shown)}{suffix}
        </text>
      </svg>
      <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--mute)", marginTop: 4 }}>{label}</div>
      {hint && <div style={{ fontSize: 11.5, marginTop: 3, color: stroke }}>{hint}</div>}
    </div>
  );
}
