"use client";

import { useRef } from "react";

// An iPad (Crew Punch kiosk) and a phone (Field app) drawn in CSS, floating in 3D. They tilt toward the pointer.
export function TiltDevices() {
  const ref = useRef<HTMLDivElement>(null);
  function move(e: React.PointerEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
    const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    el.style.setProperty("--ry", `${x * 14}deg`);
    el.style.setProperty("--rx", `${-y * 10}deg`);
  }
  function leave() {
    ref.current?.style.setProperty("--ry", "0deg");
    ref.current?.style.setProperty("--rx", "0deg");
  }
  return (
    <div className="devices" ref={ref} onPointerMove={move} onPointerLeave={leave} aria-label="Crew Punch on an iPad and the Field app on a phone">
      <div className="dev-stage">
        <div className="ipad">
          <div className="ipad-screen">
            <div className="k-site">J-2026-114 · Unit 12 fit-out</div>
            <div className="k-title display">Clock in or out</div>
            <div className="k-sub">Type your 4-digit PIN</div>
            <div className="k-dots">
              <i className="on" />
              <i className="on" />
              <i />
              <i />
            </div>
            <div className="k-pad">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "⌫"].map((k) => (
                <span key={k}>{k}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="phone">
          <div className="phone-notch" />
          <div className="phone-screen">
            <div className="p-h display">Today</div>
            <div className="p-week">
              {["M", "T", "W", "T", "F"].map((d, i) => (
                <span key={i} className={i === 2 ? "on" : ""}>
                  {d}
                </span>
              ))}
            </div>
            <div className="p-card">
              <b>Riverside Plaza, Level 3</b>
              <small>7 on site · talk signed 7/7</small>
              <div className="p-bar">
                <i />
              </div>
            </div>
            <div className="p-card">
              <b>Maple Ridge, Phase 2</b>
              <small>4 scheduled · 1 late</small>
              <div className="p-bar">
                <i style={{ width: "48%" }} />
              </div>
            </div>
            <div className="p-need">1 T&amp;M ticket needs a signature</div>
          </div>
        </div>
      </div>
    </div>
  );
}
