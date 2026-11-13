"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function IncidentForm({ companyId, jobId, workerId }: { companyId: string; jobId: string; workerId: string }) {
  const [incidentType, setIncidentType] = useState("Near miss");
  const [description, setDescription] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("incident_reports").insert({
      company_id: companyId,
      job_id: jobId,
      worker_id: workerId,
      incident_type: incidentType,
      description,
      body_part: bodyPart || null,
    });
    setBusy(false);
    setSaved(true);
    setDescription("");
    setBodyPart("");
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="display" style={{ fontSize: 18 }}>
        Report an incident
      </div>
      {saved && <div style={{ color: "var(--lime)", fontSize: 12.5 }}>Sent to the office.</div>}
      <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)} style={inputStyle}>
        {["Injury", "Near miss", "Hazard", "Damage", "Equipment issue"].map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      {incidentType === "Injury" && (
        <input placeholder="Body part" value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} style={inputStyle} />
      )}
      <textarea rows={3} placeholder="What happened?" value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
      <button className="cc-btn red" disabled={busy || !description} onClick={submit} type="button">
        {busy ? "Sending…" : "Send to office"}
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line2)",
  borderRadius: 10,
  color: "var(--text)",
  padding: "9px 10px",
  fontSize: 14,
};
