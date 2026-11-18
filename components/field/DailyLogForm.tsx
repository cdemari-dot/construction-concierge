"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { todayToronto } from "@/lib/today";
import { fetchJobWeather, type JobWeather } from "@/lib/weather";
import { fetchTodayCrew } from "@/lib/todayCrew";
import { fetchNearestHospital, type Hospital } from "@/lib/hospital";
import { Icon } from "./Icon";
import { Label, Notice, Title } from "./ui";

export function DailyLogForm({
  companyId,
  jobId,
  foremanId,
  lat,
  lon,
}: {
  companyId: string;
  jobId: string;
  foremanId: string;
  lat: number | null;
  lon: number | null;
}) {
  const [crewCount, setCrewCount] = useState<number | null>(null);
  const [weather, setWeather] = useState<JobWeather | null>(null);
  const [weatherState, setWeatherState] = useState<"loading" | "ok" | "none" | "failed">("loading");
  // Where this log was written: the device's GPS if allowed, otherwise the job's pin.
  const [here, setHere] = useState<{ lat: number; lon: number; source: "device" | "job" } | null>(null);
  const [placeChecked, setPlaceChecked] = useState(false);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [hospitalState, setHospitalState] = useState<"loading" | "ok" | "none" | "failed">("loading");
  const [containers, setContainers] = useState<{ type: string; qty: number; status: string }[]>([]);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const [workPerformed, setWorkPerformed] = useState("");
  const [delays, setDelays] = useState("");
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchTodayCrew(jobId)
      .then((c) => {
        if (!cancelled) setCrewCount(c.workers);
      })
      .catch(() => {
        if (!cancelled) setCrewCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // 1. Find where we are (device GPS, else the job pin).
  useEffect(() => {
    let done = false;
    const useJob = () => {
      if (done) return;
      done = true;
      if (lat != null && lon != null) setHere({ lat, lon, source: "job" });
      setPlaceChecked(true);
    };
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          if (done) return;
          done = true;
          setHere({ lat: p.coords.latitude, lon: p.coords.longitude, source: "device" });
          setPlaceChecked(true);
        },
        useJob,
        { enableHighAccuracy: true, timeout: 8000 },
      );
    } else useJob();
    return () => {
      done = true;
    };
  }, [lat, lon]);

  // 2. Weather and nearest hospital for that place.
  useEffect(() => {
    if (!placeChecked) return;
    if (!here) {
      setWeatherState("none");
      setHospitalState("none");
      return;
    }
    let cancelled = false;
    fetchJobWeather(here.lat, here.lon)
      .then((w) => {
        if (cancelled) return;
        setWeather(w);
        setWeatherState("ok");
      })
      .catch(() => {
        if (!cancelled) setWeatherState("failed");
      });
    fetchNearestHospital(here.lat, here.lon)
      .then((h) => {
        if (cancelled) return;
        setHospital(h);
        setHospitalState(h ? "ok" : "none");
      })
      .catch(() => {
        if (!cancelled) setHospitalState("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [placeChecked, here]);

  async function submit() {
    setBusy(true);
    setOk(null);
    setError(null);
    const supabase = createClient();
    const day = todayToronto();

    // Keep photos from earlier saves today, then add the new ones.
    const { data: existing } = await supabase.from("daily_logs").select("photo_paths").eq("job_id", jobId).eq("log_date", day).maybeSingle();
    const photoPaths: string[] = [...((existing?.photo_paths as string[] | null) ?? [])];
    for (let i = 0; i < photos.length; i++) {
      const path = `${companyId}/${jobId}/${day}/${Date.now()}-${i + 1}.jpg`;
      const up = await supabase.storage.from("daily-log-photos").upload(path, photos[i].file, { contentType: photos[i].file.type || "image/jpeg" });
      if (up.error) {
        setBusy(false);
        setError(`Photo ${i + 1} did not upload: ${up.error.message}. Log NOT saved.`);
        return;
      }
      photoPaths.push(path);
    }

    const { error: e } = await supabase.from("daily_logs").upsert(
      {
        company_id: companyId,
        job_id: jobId,
        foreman_id: foremanId,
        log_date: todayToronto(),
        crew_count: crewCount,
        weather: weather?.text ?? null,
        work_performed: workPerformed,
        delays: delays || null,
        photo_paths: photoPaths,
        gps_lat: here?.lat ?? null,
        gps_lon: here?.lon ?? null,
        hospital_name: hospital?.name ?? null,
        hospital_address: hospital?.address ?? null,
        hospital_phone: hospital?.phone ?? null,
        hospital_lat: hospital?.lat ?? null,
        hospital_lon: hospital?.lon ?? null,
        hospital_distance_m: hospital?.distanceM ?? null,
        containers: containers.filter((c) => c.type.trim() && c.qty > 0),
      },
      { onConflict: "job_id,log_date" },
    );
    setBusy(false);
    if (e) {
      setError(`Not saved: ${e.message}`);
      return;
    }
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setOk("Daily log saved. Nice work today!");
  }

  return (
    <div>
      <Title emoji="" help="One quick note per day for this job. Saving again today just updates it.">
        Today&apos;s log
      </Title>
      <Notice ok={ok} error={error} />

      <div className="cc-card" style={{ margin: "16px 0 0", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "var(--cyan)", display: "grid" }}>
          <Icon name="users" size={32} />
        </span>
        <div style={{ fontSize: 15, lineHeight: 1.4 }}>
          <b>{crewCount == null ? "Counting the crew…" : `${crewCount} on site today`}</b>
          <div style={{ color: "var(--mute)", fontSize: 13 }}>Counted from today&apos;s clock-ins · added automatically</div>
        </div>
      </div>

      <div className="cc-card" style={{ margin: "16px 0 0", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "var(--cyan)", display: "grid" }}>
          <Icon name="cloud" size={32} />
        </span>
        <div style={{ fontSize: 15, lineHeight: 1.4 }}>
          {weatherState === "loading" && "Finding your location and the weather…"}
          {weatherState === "ok" && weather && (
            <>
              <b>
                {weather.summary}, {weather.tempC}°C
              </b>
              <div style={{ color: "var(--mute)", fontSize: 13 }}>
                Feels {weather.feelsC}°C · wind {weather.windKmh} km/h{weather.precipMm > 0 ? ` · ${weather.precipMm} mm rain/snow` : ""} · geotagged from {here?.source === "device" ? "this device's GPS" : "the job's pin"}
              </div>
            </>
          )}
          {weatherState === "failed" && "Couldn't get the weather right now. Your log will save without it."}
          {weatherState === "none" && "No location available (GPS off and no pin on this job), so weather can't be added. The office can set the job's location."}
        </div>
      </div>

      <div className="cc-card" style={{ margin: "16px 0 0", fontSize: 15, lineHeight: 1.4 }}>
        <div style={{ color: "var(--mute)", fontSize: 12, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Closest hospital</div>
        {hospitalState === "loading" && "Looking up the closest hospital…"}
        {hospitalState === "failed" && "Couldn't look up the hospital right now. Your log will save without it."}
        {hospitalState === "none" && "No hospital found near this location."}
        {hospitalState === "ok" && hospital && (
          <>
            <b>{hospital.name}</b>
            <div style={{ color: "var(--mute)", fontSize: 13 }}>
              {(hospital.distanceM / 1000).toFixed(1)} km away{hospital.address ? ` · ${hospital.address}` : ""}
              {hospital.phone ? ` · ${hospital.phone}` : ""}
              {hospital.emergency ? " · emergency dept" : ""}
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lon}`}
              target="_blank"
              rel="noreferrer"
              style={{ display: "inline-block", marginTop: 6, fontWeight: 700, textDecoration: "underline", fontSize: 13 }}
            >
              Directions
            </a>
          </>
        )}
      </div>

      <Label>What did we get done?</Label>
      <textarea className="fa-input" rows={4} placeholder="e.g. Finished demo on level 2, hauled 3 bins" value={workPerformed} onChange={(e) => setWorkPerformed(e.target.value)} />

      <Label>Any delays? (optional)</Label>
      <textarea className="fa-input" rows={2} placeholder="e.g. Waiting on the GC for access" value={delays} onChange={(e) => setDelays(e.target.value)} />

      <Label>Containers / bins on site</Label>
      {containers.map((c, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 64px 104px 36px", gap: 6, alignItems: "center", marginBottom: 6 }}>
          <input className="fa-input" style={{ margin: 0 }} placeholder="e.g. 30 yd bin, waste" value={c.type} onChange={(e) => setContainers(containers.map((r, k) => (k === i ? { ...r, type: e.target.value } : r)))} />
          <input className="fa-input" style={{ margin: 0 }} type="number" inputMode="numeric" min={1} value={c.qty} onChange={(e) => setContainers(containers.map((r, k) => (k === i ? { ...r, qty: Number(e.target.value) } : r)))} />
          <select className="fa-input" style={{ margin: 0 }} value={c.status} onChange={(e) => setContainers(containers.map((r, k) => (k === i ? { ...r, status: e.target.value } : r)))}>
            <option>On site</option>
            <option>Placed</option>
            <option>Full</option>
            <option>Hauled</option>
            <option>Swapped</option>
          </select>
          <button type="button" className="fa-btn quiet" style={{ margin: 0, padding: 0, height: 44 }} onClick={() => setContainers(containers.filter((_, k) => k !== i))} aria-label="Remove container">
            ×
          </button>
        </div>
      ))}
      <button type="button" className="fa-btn quiet" onClick={() => setContainers([...containers, { type: "", qty: 1, status: "On site" }])}>
        + Add container
      </button>

      <Label>Photos ({photos.length}/10)</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 6 }}>
        {photos.map((p, i) => (
          // Local preview of a just-taken photo, not a static asset.
          // eslint-disable-next-line @next/next/no-img-element
          <img key={p.url} src={p.url} alt={`Photo ${i + 1}`} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10, border: "1px solid var(--line2)" }} />
        ))}
        {photos.length < 10 && (
          <button type="button" className="fa-btn quiet" style={{ margin: 0, aspectRatio: "1", display: "grid", placeContent: "center", gap: 4, fontSize: 12 }} onClick={() => fileRef.current?.click()}>
            <Icon name="camera" size={24} />
            Add photo
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPhotos((p) => [...p, { file: f, url: URL.createObjectURL(f) }]);
          e.target.value = "";
        }}
      />
      <div className="fa-help">Take a photo or pick one. They are saved with the log and the office sees them.</div>

      <button className="fa-btn go" disabled={busy || !workPerformed.trim()} onClick={submit} type="button">
        {busy ? "Saving…" : "Save today's log"}
      </button>
    </div>
  );
}
