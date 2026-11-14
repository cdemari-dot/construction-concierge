"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { GlobeInstance } from "globe.gl";
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

const STATUS_COLOR: Record<JobCard["status"], string> = {
  active: "#3fbf7f",
  holdback: "#f5a623",
  closed: "#9a9690",
};

export function JobsGlobe({ jobs }: { jobs: JobCard[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeInstance | null>(null);
  const selectedRef = useRef<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const located = jobs.filter((j) => j.lat != null && j.lon != null);
  const selectedJob = jobs.find((j) => j.id === selected) ?? null;

  // Build the globe once (client only, lazy-loaded: it is a big library).
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let disposed = false;
    let observer: ResizeObserver | null = null;

    (async () => {
      const { default: Globe } = await import("globe.gl");
      if (disposed || !wrapRef.current) return;

      const size = () => Math.min(wrap.clientWidth, 520);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const world = new Globe(wrap, { animateIn: !reduce, rendererConfig: { alpha: true, antialias: true } })
        .globeImageUrl("/globe/earth.jpg")
        .bumpImageUrl("/globe/bump.png")
        .backgroundColor("rgba(0,0,0,0)")
        .atmosphereColor("#C8A464")
        .atmosphereAltitude(0.22)
        .width(size())
        .height(size())
        .pointLat("lat")
        .pointLng("lon")
        .pointColor((d) => STATUS_COLOR[(d as JobCard).status])
        .pointAltitude((d) => ((d as JobCard).id === selectedRef.current ? 0.03 : 0.015))
        .pointRadius((d) => ((d as JobCard).id === selectedRef.current ? 0.22 : 0.32))
        .pointLabel((d) => {
          const j = d as JobCard;
          return `<div style="font:600 12px Inter,sans-serif;padding:6px 8px;background:#111;border:1px solid #444;border-radius:8px;color:#eee"><b>${j.jobNumber}</b> · ${j.name}</div>`;
        })
        .onPointClick((d) => setSelected((cur) => ((d as JobCard).id === cur ? null : (d as JobCard).id)))
        .ringLat("lat")
        .ringLng("lon")
        .ringColor((d: object) => {
          const c = STATUS_COLOR[(d as JobCard).status];
          return (t: number) => `${c}${Math.round((1 - t) * 255).toString(16).padStart(2, "0")}`;
        })
        .ringMaxRadius(2.6)
        .ringPropagationSpeed(2.2)
        .ringRepeatPeriod(1400);

      world.pointsData(located);
      world.ringsData(located);

      const controls = world.controls();
      controls.autoRotate = !reduce;
      controls.autoRotateSpeed = 0.45;
      controls.minDistance = 130;
      controls.maxDistance = 520;
      controls.enablePan = false;

      // Intro: start far away and fly in to the first job (or a North America view).
      const first = located[0];
      world.pointOfView({ lat: first?.lat ?? 40, lng: first?.lon ?? -80, altitude: 4 }, 0);
      world.pointOfView({ lat: first?.lat ?? 40, lng: first?.lon ?? -80, altitude: 2.1 }, reduce ? 0 : 2600);

      observer = new ResizeObserver(() => world.width(size()).height(size()));
      observer.observe(wrap);

      globeRef.current = world;
      setReady(true);
    })();

    return () => {
      disposed = true;
      observer?.disconnect();
      const world = globeRef.current as (GlobeInstance & { _destructor?: () => void }) | null;
      world?._destructor?.();
      globeRef.current = null;
      if (wrap) wrap.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs]);

  // Fly to the selected job (zoom in) or back out.
  useEffect(() => {
    selectedRef.current = selected;
    const world = globeRef.current;
    if (!world || !ready) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const job = located.find((j) => j.id === selected);
    const controls = world.controls();
    if (job) {
      controls.autoRotate = false;
      world.pointOfView({ lat: job.lat as number, lng: job.lon as number, altitude: 0.22 }, reduce ? 0 : 1800);
    } else {
      const cur = world.pointOfView();
      world.pointOfView({ lat: cur.lat, lng: cur.lng, altitude: 2.1 }, reduce ? 0 : 1400);
      controls.autoRotate = !reduce;
    }
    // Re-run the point accessors so the selected pin grows.
    world.pointAltitude(world.pointAltitude()).pointRadius(world.pointRadius());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, ready]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
      <div className="cc-card" style={{ display: "grid", placeItems: "center", padding: 12 }}>
        <div style={{ width: "100%", maxWidth: 520, aspectRatio: "1", position: "relative", overflow: "hidden", borderRadius: 16 }}>
          <div ref={wrapRef} style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", cursor: "grab" }} />
          {!ready && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--mute)", fontSize: 13 }}>
              🌍 Loading globe…
            </div>
          )}
          <div
            aria-live="polite"
            style={{
              position: "absolute",
              left: 10,
              top: 10,
              zIndex: 2,
              maxWidth: "70%",
              padding: "8px 12px",
              borderRadius: 12,
              background: "var(--glass)",
              border: "1px solid var(--line2)",
              fontSize: 12.5,
              lineHeight: 1.4,
              opacity: selectedJob ? 1 : 0,
              transform: selectedJob ? "translateY(0)" : "translateY(-8px)",
              transition: "opacity .45s ease, transform .45s ease",
              pointerEvents: selectedJob ? "auto" : "none",
            }}
          >
            {selectedJob && (
              <>
                <b>
                  📍 {selectedJob.jobNumber} · {selectedJob.name}
                </b>
                <div style={{ color: "var(--mute)", fontSize: 11.5 }}>{selectedJob.address ?? "No address"}</div>
                <button type="button" className="cc-btn ghost sm" style={{ marginTop: 6 }} onClick={() => setSelected(null)}>
                  ↩ Zoom out
                </button>
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--mute)", marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
          <Legend color="var(--lime)" label="Active" />
          <Legend color="var(--amber)" label="Holdback" />
          <Legend color="var(--mute)" label="Closed" />
          <span>· drag to spin · scroll to zoom · tap a pin or a job</span>
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
              style={{
                cursor: hasGps ? "pointer" : "default",
                borderColor: on ? "var(--cyan)" : undefined,
                transform: on ? "scale(1.015)" : "scale(1)",
                boxShadow: on ? "0 0 0 1px var(--cyan), 0 8px 30px rgba(200,164,100,.18)" : undefined,
                transition: "transform .3s ease, box-shadow .3s ease, border-color .3s ease",
              }}
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
