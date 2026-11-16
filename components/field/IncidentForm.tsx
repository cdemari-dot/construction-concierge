"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Chips, Label, Notice, Title } from "./ui";

const TYPES = [
  { value: "Injury", label: "Someone hurt" },
  { value: "Near miss", label: "Near miss" },
  { value: "Hazard", label: "Hazard" },
  { value: "Damage", label: "Damage" },
  { value: "Equipment issue", label: "Equipment" },
] as const;

export function IncidentForm({ companyId, jobId, workerId }: { companyId: string; jobId: string; workerId: string }) {
  const [incidentType, setIncidentType] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [firstAid, setFirstAid] = useState(false);
  const [medical, setMedical] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!incidentType) return;
    setBusy(true);
    setOk(null);
    setError(null);
    const supabase = createClient();
    const { error: e } = await supabase.from("incident_reports").insert({
      company_id: companyId,
      job_id: jobId,
      worker_id: workerId,
      incident_type: incidentType,
      description,
      body_part: incidentType === "Injury" ? bodyPart || null : null,
      first_aid_given: firstAid,
      needs_medical: medical,
    });
    setBusy(false);
    if (e) {
      setError(`NOT sent to the office: ${e.message}. Tell the office right away.`);
      return;
    }
    setOk("Sent to the office. Thanks for reporting it.");
    setIncidentType(null);
    setDescription("");
    setBodyPart("");
    setFirstAid(false);
    setMedical(false);
  }

  const injury = incidentType === "Injury";

  return (
    <div>
      <Title emoji="" help="Tell the office about anything that happened or almost happened. Reporting it is always the right call.">
        Report an incident
      </Title>
      <Notice ok={ok} error={error} />

      <Label>What kind?</Label>
      <Chips options={[...TYPES]} value={incidentType} onChange={setIncidentType} />

      {incidentType && (
        <>
          {injury && (
            <>
              <Label>Which body part?</Label>
              <input className="fa-input" placeholder="e.g. Left hand" value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} />
              <div className="fa-chips" style={{ marginTop: 12 }}>
                <button type="button" className={`fa-chip ${firstAid ? "on" : ""}`} onClick={() => setFirstAid((v) => !v)}>
                  First aid given
                </button>
                <button type="button" className={`fa-chip ${medical ? "on" : ""}`} onClick={() => setMedical((v) => !v)}>
                  Needs a doctor
                </button>
              </div>
            </>
          )}
          <Label>What happened?</Label>
          <textarea className="fa-input" rows={4} placeholder="Tell us in your own words" value={description} onChange={(e) => setDescription(e.target.value)} />
          <button className="fa-btn stop" disabled={busy || !description.trim()} onClick={submit} type="button">
            {busy ? "Sending…" : "Send to office"}
          </button>
        </>
      )}
    </div>
  );
}
