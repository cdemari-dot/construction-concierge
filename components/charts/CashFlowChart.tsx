"use client";

import { useState } from "react";
import type { WeekBucket } from "@/lib/cashflow/forecast";
import { fmt, fmtk } from "@/lib/format";

const W = 760;
const H = 300;
const PL = 54;
const PR = 10;
const PT = 24;
const PB = 28;

export function CashFlowChart({ buckets, payrollLine }: { buckets: WeekBucket[]; payrollLine: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const n = buckets.length;
  const cw = (W - PL - PR) / n;

  const balances = buckets.map((b) => b.endingBalance);
  const maxV = Math.max(1, ...balances, ...buckets.map((b) => b.inflows), ...buckets.map((b) => b.outflows), payrollLine) * 1.12;
  const minV = Math.min(0, ...balances) * 1.15;
  const y = (v: number) => PT + (H - PT - PB) * (1 - (v - minV) / (maxV - minV));
  const y0 = y(0);

  const pts = balances.map((v, i) => [PL + i * cw + cw / 2, y(v)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[n - 1][0]} ${y(minV)} L${pts[0][0]} ${y(minV)} Z`;

  let low = 0;
  balances.forEach((v, i) => {
    if (v < balances[low]) low = i;
  });
  const lowBad = balances[low] < payrollLine;
  const lowColor = lowBad ? "var(--red)" : "var(--amber)";
  const lp = pts[low];
  const calloutX = Math.min(Math.max(lp[0], PL + 40), W - PR - 40);

  const lineMs = 1500;
  const hv = hover != null ? buckets[hover] : null;

  return (
    <div style={{ position: "relative" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(n - 1, Math.floor((x - PL) / cw))));
        }}
      >
        <defs>
          <linearGradient id="cfArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--lime)" }} stopOpacity=".28" />
            <stop offset="1" style={{ stopColor: "var(--lime)" }} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="cfIn" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--text)" }} />
            <stop offset="1" style={{ stopColor: "var(--text)", stopOpacity: 0.3 }} />
          </linearGradient>
          <linearGradient id="cfOut" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#E5484D" />
            <stop offset="1" stopColor="#E5484D" stopOpacity=".3" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3, 4].map((i) => {
          const v = minV + ((maxV - minV) * i) / 4;
          return (
            <g key={i}>
              <line x1={PL} x2={W - PR} y1={y(v)} y2={y(v)} style={{ stroke: "var(--line)" }} />
              <text x={PL - 6} y={y(v) + 4} textAnchor="end" style={{ fill: "var(--mute)" }} fontSize="10">
                {fmtk(v)}
              </text>
            </g>
          );
        })}
        <line x1={PL} x2={W - PR} y1={y0} y2={y0} style={{ stroke: "var(--line2)" }} />
        {payrollLine > 0 && (
          <line x1={PL} x2={W - PR} y1={y(payrollLine)} y2={y(payrollLine)} style={{ stroke: "var(--amber)" }} strokeDasharray="4 4" opacity=".8" />
        )}

        {buckets.map((b, i) => {
          const x = PL + i * cw;
          const hi = Math.max(0, y0 - y(b.inflows));
          const ho = Math.max(0, y0 - y(b.outflows));
          const bar = (extra: number, h: number, fill: string, op: number) => (
            <rect
              className="cc-anim"
              x={x + cw * extra}
              y={y0 - h}
              width={cw * 0.3}
              height={h}
              rx="5"
              fill={fill}
              opacity={op}
              style={{ transformBox: "fill-box", transformOrigin: "bottom", animation: `cc-grow 520ms cubic-bezier(.2,.8,.2,1) ${i * 55}ms both` }}
            />
          );
          return (
            <g key={b.weekStart}>
              {bar(0.17, hi, "url(#cfIn)", 0.85)}
              {bar(0.5, ho, "url(#cfOut)", 0.75)}
              {i % 2 === 0 && (
                <text x={x + cw / 2} y={H - 8} textAnchor="middle" style={{ fill: "var(--mute)" }} fontSize="10">
                  {new Date(b.weekStart + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                </text>
              )}
            </g>
          );
        })}

        <path className="cc-anim" d={area} fill="url(#cfArea)" style={{ animation: `cc-fade 900ms ${350}ms both` }} />
        <path
          className="cc-anim"
          d={line}
          fill="none"
          strokeWidth="2.5"
          pathLength={1}
          strokeDasharray="1 1"
          style={{ stroke: "var(--text)", animation: `cc-draw ${lineMs - 350}ms cubic-bezier(.2,.8,.2,1) 350ms both` }}
        />

        {pts.map((p, i) => {
          const bad = balances[i] < payrollLine;
          return (
            <circle
              key={i}
              className="cc-anim"
              cx={p[0]}
              cy={p[1]}
              r={i === low ? 6 : 3.5}
              strokeWidth="2"
              style={{
                fill: bad ? "var(--red)" : "var(--text)",
                stroke: "var(--bg)",
                transformBox: "fill-box",
                transformOrigin: "center",
                animation: `cc-pop 280ms cubic-bezier(.2,1.4,.4,1) ${350 + (1100 * i) / Math.max(1, n - 1)}ms both`,
              }}
            />
          );
        })}

        <circle
          className="cc-anim"
          cx={lp[0]}
          cy={lp[1]}
          r="9"
          fill="none"
          strokeWidth="2"
          style={{ stroke: lowColor, transformBox: "fill-box", transformOrigin: "center", animation: `cc-ring 1.8s ease-out ${lineMs}ms infinite both` }}
        />
        <g className="cc-anim" style={{ transformBox: "fill-box", transformOrigin: "center bottom", animation: `cc-pop 450ms cubic-bezier(.2,1.4,.4,1) ${lineMs}ms both` }}>
          <rect x={calloutX - 38} y={lp[1] - 34} width="76" height="20" rx="10" style={{ fill: lowColor }} />
          <text x={calloutX} y={lp[1] - 20} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff">
            LOW {fmtk(balances[low])}
          </text>
        </g>

        {hover != null && (
          <g pointerEvents="none">
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1={PT} y2={H - PB} style={{ stroke: "var(--cyan)" }} strokeDasharray="3 3" />
            <circle cx={pts[hover][0]} cy={pts[hover][1]} r="5" style={{ fill: "var(--cyan)", stroke: "var(--bg)" }} strokeWidth="2" />
          </g>
        )}
      </svg>

      {hv && hover != null && (
        <div
          className="cc-card"
          style={{
            position: "absolute",
            top: 6,
            left: `${Math.min(Math.max((pts[hover][0] / W) * 100, 18), 82)}%`,
            transform: "translateX(-50%)",
            padding: "8px 11px",
            fontSize: 12,
            minWidth: 170,
            pointerEvents: "none",
            boxShadow: "0 10px 30px rgba(0,0,0,.5)",
          }}
        >
          <div style={{ color: "var(--mute)", marginBottom: 4 }}>
            Week of {new Date(hv.weekStart + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
          </div>
          <Row label="Collected" value={fmt(hv.inflows)} color="var(--cyan)" />
          <Row label="Paid out" value={fmt(hv.outflows)} color="var(--red)" />
          <Row label="Ending cash" value={fmt(hv.endingBalance)} color={hv.endingBalance < payrollLine ? "var(--red)" : "var(--lime)"} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14 }}>
      <span style={{ color: "var(--mute)" }}>{label}</span>
      <b className="mono" style={{ color }}>
        {value}
      </b>
    </div>
  );
}
