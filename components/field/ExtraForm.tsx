"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ExtraForm({ companyId, jobId, reportedBy }: { companyId: string; jobId: string; reportedBy: string }) {
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState("");
  const [materialsCost, setMaterialsCost] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("extras").insert({
      company_id: companyId,
      job_id: jobId,
      reported_by: reportedBy,
      description,
      hours: Number(hours) || 0,
      materials_cost: Number(materialsCost) || 0,
      authorized_by: authorizedBy,
    });
    setBusy(false);
    setSaved(true);
    setDescription("");
    setHours("");
    setMaterialsCost("");
    setAuthorizedBy("");
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="display" style={{ fontSize: 18 }}>
        Report an extra
      </div>
      {saved && <div style={{ color: "var(--lime)", fontSize: 12.5 }}>Sent to the office — the PM will price it.</div>}
      <textarea
        rows={3}
        placeholder="What's the extra scope? e.g. Found 2nd layer VCT + mastic, super told us to proceed."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        style={textAreaStyle}
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input placeholder="Hours" type="number" value={hours} onChange={(e) => setHours(e.target.value)} style={inputStyle} />
        <input placeholder="Materials $" type="number" value={materialsCost} onChange={(e) => setMaterialsCost(e.target.value)} style={inputStyle} />
      </div>
      <input placeholder="Who authorized it? (e.g. Super verbal)" value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)} style={inputStyle} />
      <button className="cc-btn lime" disabled={busy || !description} onClick={submit} type="button">
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
const textAreaStyle: React.CSSProperties = { ...inputStyle, width: "100%", fontFamily: "inherit" };
