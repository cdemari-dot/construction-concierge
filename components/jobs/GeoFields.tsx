"use client";

import { useState } from "react";

const inputStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line2)",
  borderRadius: 10,
  color: "var(--text)",
  padding: "9px 10px",
  fontSize: 14,
  width: "100%",
};

export function GeoFields() {
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  function useHere() {
    setMsg("Locating…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(p.coords.latitude.toFixed(6));
        setLon(p.coords.longitude.toFixed(6));
        setMsg("Using your current location.");
      },
      () => setMsg("Couldn't get your location — allow location access, or rely on the address."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
          Latitude (optional — filled from address if blank)
          <input name="geofence_lat" type="number" step="0.000001" value={lat} onChange={(e) => setLat(e.target.value)} style={inputStyle} />
        </label>
        <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
          Longitude
          <input name="geofence_lon" type="number" step="0.000001" value={lon} onChange={(e) => setLon(e.target.value)} style={inputStyle} />
        </label>
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button type="button" className="cc-btn ghost sm" onClick={useHere}>
          Use my current location
        </button>
        {msg && <span style={{ fontSize: 11.5, color: "var(--mute)" }}>{msg}</span>}
      </div>
    </div>
  );
}
