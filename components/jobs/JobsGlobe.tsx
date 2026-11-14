"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import createGlobe from "cobe";
import { fmt } from "@/lib/format";

export interface JobCard {
  id: string;
  jobNumber: string;
  name: string;
  address: string | null;
  lat: number | null;
  lon: number | null;
  status: "active" | "holdback" | "closed";
  contract: number;
  pct: number;
  billed: number;
  outstanding: number;
  margin: number | null;
  labourCost: number;
  labourHours: number;
  unratedShifts: number;
  onSite: number;
}

const STATUS_RGB: Record<JobCard["status"], [number, number, number]> = {
  active: [0.25, 0.75, 0.5],
  holdback: [0.96, 0.65, 0.14],
  closed: [0.55, 0.53, 0.5],
};

const toAngles = (lat: number, lon: number): [number, number] => [Math.PI - ((lon * Math.PI) / 180 - Math.PI / 2), (lat * Math.PI) / 180];

export function JobsGlobe({ jobs }: { jobs: JobCard[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const selectedRef = useRef<string | null>(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  const located = jobs.filter((j) => j.lat != null && j.lon != null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const size = Math.min(wrap.clientWidth, 520);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const first = located[0];
    let [phi, theta] = first ? toAngles(first.lat as number, first.lon as number) : [0, 0.3];
    let dragging = false;
    let lastX = 0;
    let raf = 0;

    const globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: size * dpr,
      height: size * dpr,
      phi,
      theta,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 5,
      baseColor: [0.16, 0.15, 0.14],
      markerColor: [0.25, 0.75, 0.5],
      glowColor: [0.35, 0.3, 0.2],
      markers: located.map((j) => ({ id: j.id, location: [j.lat as number, j.lon as number], size: 0.07, color: STATUS_RGB[j.status] })),
    });

    const tick = () => {
      const sel = located.find((j) => j.id === selectedRef.current);
      if (sel) {
        const [tp, tt] = toAngles(sel.lat as number, sel.lon as number);
        let d = tp - phi;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        phi += d * 0.08;
        theta += (tt - theta) * 0.08;
      } else if (!dragging && !reduce) {
        phi += 0.004;
      }
      globe.update({
        phi,
        theta,
        markers: located.map((j) => ({
          id: j.id,
          location: [j.lat as number, j.lon as number],
          size: j.id === selectedRef.current ? 0.14 : 0.07,
          color: STATUS_RGB[j.status],
        })),
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const down = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      setSelected(null);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      phi += (e.clientX - lastX) / 120;
      lastX = e.clientX;
    };
    const up = () => (dragging = false);
    canvas.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);

    return () => {
      cancelAnimationFrame(raf);
      globe.destroy();
      canvas.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
      <div className="cc-card" style={{ display: "grid", placeItems: "center", padding: 12 }}>
        <div ref={wrapRef} style={{ width: "100%", maxWidth: 520, aspectRatio: "1", display: "grid", placeItems: "center" }}>
          <canvas
            ref={canvasRef}
            style={{ width: "100%", maxWidth: 520, aspectRatio: "1", cursor: "grab", touchAction: "none", contain: "layout paint size" }}
          />
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--mute)", marginTop: 4 }}>
          <Legend color="var(--lime)" label="Active" />
          <Legend color="var(--amber)" label="Holdback" />
          <Legend color="var(--mute)" label="Closed" />
          <span>· drag to spin</span>
        </div>
        {located.length === 0 && (
          <div style={{ color: "var(--mute)", fontSize: 12.5, marginTop: 8, textAlign: "center" }}>
            No job has GPS coordinates yet. Add an address (or use your location) when creating a job and it will appear here.
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 10, maxHeight: 640, overflowY: "auto" }}>
        {jobs.map((j) => {
          const on = selected === j.id;
          const hasGps = j.lat != null && j.lon != null;
          return (
            <div
              key={j.id}
              className="cc-card"
              onClick={() => hasGps && setSelected(on ? null : j.id)}
              style={{ cursor: hasGps ? "pointer" : "default", borderColor: on ? "var(--cyan)" : undefined }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}>
                <div>
                  <b>{j.jobNumber}</b> · {j.name}
                  <div style={{ color: "var(--mute)", fontSize: 11.5, marginTop: 2 }}>
                    {j.address ?? "No address"}
                    {hasGps ? ` · ${j.lat!.toFixed(3)}, ${j.lon!.toFixed(3)}` : " · no GPS"}
                  </div>
                </div>
                <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <span className={`cc-tag ${j.status === "active" ? "lime" : j.status === "holdback" ? "amber" : "mute"}`}>{j.status}</span>
                  {j.onSite > 0 && (
                    <div style={{ fontSize: 11, color: "var(--lime)", marginTop: 4 }}>
                      <span className="cc-dot" />
                      {j.onSite} on site
                    </div>
                  )}
                </div>
              </div>

              <div className="cc-bar" style={{ margin: "10px 0 4px" }}>
                <i style={{ width: `${Math.min(100, j.pct)}%` }} />
              </div>
              <div style={{ fontSize: 11, color: "var(--mute)", marginBottom: 10 }}>{j.pct}% complete</div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, fontSize: 12 }}>
                <Stat label="Contract" value={fmt(j.contract)} />
                <Stat label="Billed" value={fmt(j.billed)} />
                <Stat label="Owing" value={fmt(j.outstanding)} color={j.outstanding > 0 ? "var(--amber)" : undefined} />
                <Stat
                  label="Margin"
                  value={j.margin == null ? "—" : `${Math.round(j.margin * 100)}%`}
                  color={j.margin == null ? undefined : j.margin < 0.15 ? "var(--red)" : j.margin < 0.25 ? "var(--amber)" : "var(--lime)"}
                />
              </div>

              {(j.labourHours > 0 || j.unratedShifts > 0) && (
                <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--mute)" }}>
                  Labour: {j.labourHours.toFixed(1)} hrs · {fmt(j.labourCost)}
                  {j.unratedShifts > 0 && (
                    <span style={{ color: "var(--amber)" }}> · {j.unratedShifts} shift{j.unratedShifts === 1 ? "" : "s"} with no rate set</span>
                  )}
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <Link href={`/jobs/${j.id}`} className="cc-btn ghost sm" onClick={(e) => e.stopPropagation()}>
                  Open job
                </Link>
              </div>
            </div>
          );
        })}
        {jobs.length === 0 && <div className="cc-card" style={{ color: "var(--mute)" }}>No jobs yet.</div>}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 1.1, textTransform: "uppercase", color: "var(--mute)" }}>{label}</div>
      <div className="mono" style={{ fontWeight: 600, color: color ?? "var(--text)" }}>
        {value}
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <i style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}
