"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function TmTicketForm({ companyId, jobId, createdBy }: { companyId: string; jobId: string; createdBy: string }) {
  const [superName, setSuperName] = useState("");
  const [superEmail, setSuperEmail] = useState("");
  const [hours, setHours] = useState("");
  const [equipmentCost, setEquipmentCost] = useState("");
  const [materialsCost, setMaterialsCost] = useState("");
  const [signed, setSigned] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("tm_tickets").insert({
      company_id: companyId,
      job_id: jobId,
      created_by: createdBy,
      super_name: superName,
      super_email: superEmail || null,
      hours: Number(hours) || 0,
      equipment_cost: Number(equipmentCost) || 0,
      materials_cost: Number(materialsCost) || 0,
      status: signed ? "signed" : "draft",
      signed_at: signed ? new Date().toISOString() : null,
    });
    setBusy(false);
    setSaved(true);
    setSuperName("");
    setSuperEmail("");
    setHours("");
    setEquipmentCost("");
    setMaterialsCost("");
    setSigned(false);
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="display" style={{ fontSize: 18 }}>
        T&amp;M ticket
      </div>
      {saved && <div style={{ color: "var(--lime)", fontSize: 12.5 }}>Ticket saved.</div>}
      <input placeholder="GC superintendent name" value={superName} onChange={(e) => setSuperName(e.target.value)} style={inputStyle} />
      <input placeholder="Super email (optional)" value={superEmail} onChange={(e) => setSuperEmail(e.target.value)} style={inputStyle} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <input placeholder="Hours" type="number" value={hours} onChange={(e) => setHours(e.target.value)} style={inputStyle} />
        <input placeholder="Equipment $" type="number" value={equipmentCost} onChange={(e) => setEquipmentCost(e.target.value)} style={inputStyle} />
        <input placeholder="Materials $" type="number" value={materialsCost} onChange={(e) => setMaterialsCost(e.target.value)} style={inputStyle} />
      </div>
      <button
        type="button"
        className="cc-btn ghost"
        style={{ borderColor: signed ? "var(--lime)" : undefined, color: signed ? "var(--lime)" : undefined }}
        onClick={() => setSigned((v) => !v)}
      >
        {signed ? "✅ Super signed on device" : "Mark as signed by super"}
      </button>
      <button className="cc-btn lime" disabled={busy || !superName} onClick={submit} type="button">
        {busy ? "Saving…" : "Save ticket"}
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
