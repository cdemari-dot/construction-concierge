"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type * as Leaflet from "leaflet";
import "leaflet/dist/leaflet.css";
import { fmt } from "@/lib/format";
import { locateJob } from "@/app/(owner)/jobs/actions";
import { Odometer } from "@/components/ui/Odometer";

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
  bills: number;
  labourHours: number;
  openShifts?: number;
  openRate?: number;
  unratedShifts: number;
  onSite: number;
}

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// OpenStreetMap's standard tiles (no key; fine for light use). Dark mode and a calmer palette come from a CSS filter.
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export function JobsMap({ jobs: jobsIn }: { jobs: JobCard[] }) {
  const [coords, setCoords] = useState<Record<string, { lat: number; lon: number }>>({});
  const [locating, setLocating] = useState<string | null>(null);
  const [locateMsg, setLocateMsg] = useState<string | null>(null);
  const jobs = jobsIn.map((j) => (j.lat == null && coords[j.id] ? { ...j, lat: coords[j.id].lat, lon: coords[j.id].lon } : j));
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Leaflet.Map | null>(null);
  const libRef = useRef<typeof Leaflet | null>(null);
  const layerRef = useRef<Leaflet.LayerGroup | null>(null);
  const tileRef = useRef<Leaflet.TileLayer | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const located = jobs.filter((j) => j.lat != null && j.lon != null);
  const selectedJob = jobs.find((j) => j.id === selected) ?? null;
  const key = located.map((j) => `${j.id}:${j.lat}:${j.lon}:${j.status}:${j.onSite}`).join("|");

  // Build the map once (client only, lazy-loaded). Street tiles follow the light/dark setting.
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    let disposed = false;
    let ro: ResizeObserver | null = null;
    // The same OpenStreetMap tiles serve both themes (dark mode is a CSS filter), so the layer is added once.
    const addTiles = () => {
      const L = libRef.current;
      const map = mapRef.current;
      if (!L || !map || tileRef.current) return;
      tileRef.current = L.tileLayer(TILE_URL, { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(map);
    };
    (async () => {
      const L = await import("leaflet");
      if (disposed || !wrapRef.current) return;
      libRef.current = L;
      const map = L.map(wrap, { zoomControl: false, scrollWheelZoom: true, worldCopyJump: true }).setView([43.7, -79.4], 10);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      addTiles();
      ro = new ResizeObserver(() => map.invalidateSize());
      ro.observe(wrap);
      setReady(true);
    })();
    return () => {
      disposed = true;
      ro?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      tileRef.current = null;
      setReady(false);
    };
  }, []);

  // Pins: a dot per job (green and pulsing while people are on site), the selected one larger with its job number.
  useEffect(() => {
    const L = libRef.current;
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!ready || !L || !map || !layer) return;
    layer.clearLayers();
    for (const j of located) {
      const on = j.id === selected;
      const html = `<div class="map-pin ${j.status}${j.onSite > 0 ? " live" : ""}${on ? " on" : ""}"><i></i>${on ? `<span>${esc(j.jobNumber)}</span>` : ""}</div>`;
      const m = L.marker([j.lat as number, j.lon as number], { icon: L.divIcon({ className: "cc-map-icon", html, iconSize: [0, 0] }), title: `${j.jobNumber} · ${j.name}`, keyboard: true });
      m.on("click", () => setSelected((cur) => (cur === j.id ? null : j.id)));
      m.addTo(layer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key, selected]);

  // Frame all jobs, or fly to the selected one.
  useEffect(() => {
    const L = libRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const job = located.find((j) => j.id === selected);
    if (job) {
      map.flyTo([job.lat as number, job.lon as number], 16, { animate: !reduce, duration: 1.1 });
    } else if (located.length === 1) {
      map.setView([located[0].lat as number, located[0].lon as number], 14, { animate: !reduce });
    } else if (located.length > 1) {
      // Frame the main cluster: ignore far-off outliers (one job in another province would flatten the view).
      const med = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
      const mLat = med(located.map((j) => j.lat as number));
      const mLon = med(located.map((j) => j.lon as number));
      const near = located.filter((j) => Math.abs((j.lat as number) - mLat) < 1.2 && Math.abs((j.lon as number) - mLon) < 1.6);
      const pts = (near.length ? near : located).map((j) => [j.lat as number, j.lon as number] as [number, number]);
      map.fitBounds(L.latLngBounds(pts), { padding: [44, 44], maxZoom: 13, animate: !reduce });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key, selected]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
      <div className="cc-card" style={{ padding: 10, position: "sticky", top: 16 }}>
        <div style={{ position: "relative", borderRadius: 20, overflow: "hidden" }}>
          <div ref={wrapRef} className="jobs-map" />
          {!ready && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "var(--mute)", fontSize: 13, zIndex: 500 }}>Loading map…</div>
          )}
          <div
            aria-live="polite"
            style={{
              position: "absolute",
              left: 12,
              top: 12,
              zIndex: 900,
              maxWidth: "72%",
              padding: "10px 14px",
              borderRadius: 16,
              background: "var(--glass)",
              backdropFilter: "blur(12px)",
              border: "1px solid var(--line2)",
              fontSize: 12.5,
              lineHeight: 1.4,
              opacity: selectedJob ? 1 : 0,
              transform: selectedJob ? "translateY(0)" : "translateY(-8px)",
              transition: "opacity .35s ease, transform .35s ease",
              pointerEvents: selectedJob ? "auto" : "none",
            }}
          >
            {selectedJob && (
              <>
                <b>
                  {selectedJob.jobNumber} · {selectedJob.name}
                </b>
                <div style={{ color: "var(--mute)", fontSize: 11.5 }}>{selectedJob.address ?? "No address"}</div>
                <button type="button" className="cc-btn ghost sm" style={{ marginTop: 6 }} onClick={() => setSelected(null)}>
                  Show all jobs
                </button>
              </>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 11.5, color: "var(--mute)", marginTop: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <Legend color="var(--lime)" label="People on site" />
          <Legend color="var(--text)" label="Active" />
          <Legend color="var(--amber)" label="Holdback" />
          <Legend color="var(--mute)" label="Closed" />
          <span>· tap a pin or a job</span>
        </div>
        {located.length === 0 && (
          <div style={{ color: "var(--mute)", fontSize: 12.5, marginTop: 8, textAlign: "center" }}>
            No job has a map location yet. Tap a job in the list and it will be found from its address.
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 10, maxHeight: 640, overflowY: "auto", alignContent: "start" }}>
        {locateMsg && <div style={{ fontSize: 12, color: "var(--amber)" }}>{locateMsg}</div>}
        {jobs.map((j) => {
          const on = selected === j.id;
          const hasGps = j.lat != null && j.lon != null;
          return (
            <div
              key={j.id}
              className={`cc-card lift job-card${on ? " on" : ""}`}
              onClick={async () => {
                if (hasGps) return setSelected(on ? null : j.id);
                if (!j.address) return setLocateMsg(`${j.jobNumber} has no address. Add one to put it on the map.`);
                setLocating(j.id);
                setLocateMsg(null);
                const found = await locateJob(j.id).catch(() => null);
                setLocating(null);
                if (!found) return setLocateMsg(`Couldn't find ${j.jobNumber} on the map from its address.`);
                setCoords((c) => ({ ...c, [j.id]: found }));
                setSelected(j.id);
              }}
              style={{
                cursor: hasGps || j.address ? "pointer" : "default",
                borderColor: on ? "var(--cyan)" : undefined,
                transform: on ? "scale(1.015)" : "scale(1)",
                boxShadow: on ? "0 0 0 1px var(--cyan), 0 8px 30px rgba(0,0,0,.14)" : undefined,
                transition: "transform .3s ease, box-shadow .3s ease, border-color .3s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}>
                <div>
                  <b>{j.jobNumber}</b> · {j.name}
                  <div style={{ color: "var(--mute)", fontSize: 11.5, marginTop: 2 }}>
                    {j.address ?? "No address"}
                    {hasGps ? ` · ${j.lat!.toFixed(3)}, ${j.lon!.toFixed(3)}` : locating === j.id ? " · finding on the map…" : j.address ? " · tap to find on the map" : " · no GPS"}
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

              {(j.labourHours > 0 || j.unratedShifts > 0 || j.bills > 0) && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line, rgba(255,255,255,.08))" }}>
                  <LiveJobCost labour={j.labourCost} bills={j.bills} hours={j.labourHours} rate={j.openRate ?? 0} crew={j.openShifts ?? 0} />
                  {j.unratedShifts > 0 && (
                    <div style={{ fontSize: 11.5, color: "var(--amber)", marginTop: 4 }}>
                      {j.unratedShifts} shift{j.unratedShifts === 1 ? "" : "s"} with no rate set
                    </div>
                  )}
                </div>
              )}

              <div style={{ marginTop: 10 }}>
                <Link href={`/jobs/${j.id}`} className="cc-btn ghost sm" onClick={(e) => e.stopPropagation()}>
                  Open job / set hours &amp; bin budget
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


// Job cost so far (bills coded to the job + labour) as a rolling odometer. With people clocked in it
// ticks every second at the crew's combined hourly rate; the page re-fetches every 30 s to resync.
function LiveJobCost({ labour, bills, hours, rate, crew }: { labour: number; bills: number; hours: number; rate: number; crew: number }) {
  const loaded = useRef(Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    loaded.current = Date.now();
    setNow(Date.now());
  }, [labour, bills, hours, rate]);
  useEffect(() => {
    if (rate <= 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [rate]);
  const labourNow = labour + (rate * Math.max(0, now - loaded.current)) / 3600000;
  const total = labourNow + bills;
  const money = (n: number) => "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div>
      <div style={{ fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--mute)", marginBottom: 2 }}>
        {crew > 0 && <span style={{ color: "var(--lime)" }}>● Live </span>}Job cost so far
      </div>
      <Odometer text={money(total)} size={26} color={crew > 0 ? "var(--lime)" : "var(--text, inherit)"} />
      <div style={{ fontSize: 11.5, color: "var(--mute)", marginTop: 3 }}>
        Labour {money(labourNow)} · {hours.toFixed(1)} hrs · Bills {money(bills)}
        {crew > 0 && ` · ${crew} clocked in · +${fmt(rate)}/hr`}
      </div>
    </div>
  );
}
