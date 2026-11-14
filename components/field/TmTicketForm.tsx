"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SignaturePad } from "./SignaturePad";

export function TmTicketForm({ companyId, jobId, createdBy }: { companyId: string; jobId: string; createdBy: string }) {
  const [superName, setSuperName] = useState("");
  const [superEmail, setSuperEmail] = useState("");
  const [hours, setHours] = useState("");
  const [equipmentCost, setEquipmentCost] = useState("");
  const [materialsCost, setMaterialsCost] = useState("");
  const [signature, setSignature] = useState<Blob | null>(null);
  const [padKey, setPadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const ticketId = crypto.randomUUID();
    let signaturePath: string | null = null;

    if (signature) {
      signaturePath = `${companyId}/${jobId}/${ticketId}.png`;
      const up = await supabase.storage.from("signatures").upload(signaturePath, signature, { contentType: "image/png" });
      if (up.error) {
        setError(`Signature did not upload: ${up.error.message}. Ticket NOT saved.`);
        setBusy(false);
        return;
      }
    }

    const { error: insertError } = await supabase.from("tm_tickets").insert({
      id: ticketId,
      company_id: companyId,
      job_id: jobId,
      created_by: createdBy,
      super_name: superName,
      super_email: superEmail || null,
      hours: Number(hours) || 0,
      equipment_cost: Number(equipmentCost) || 0,
      materials_cost: Number(materialsCost) || 0,
      status: signaturePath ? "signed" : "draft",
      super_signature_path: signaturePath,
      signed_at: signaturePath ? new Date().toISOString() : null,
    });
    setBusy(false);
    if (insertError) {
      setError(`Ticket NOT saved: ${insertError.message}`);
      return;
    }
    setSaved(true);
    setSuperName("");
    setSuperEmail("");
    setHours("");
    setEquipmentCost("");
    setMaterialsCost("");
    setSignature(null);
    setPadKey((k) => k + 1);
  }

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div className="display" style={{ fontSize: 18 }}>
        T&amp;M ticket
      </div>
      {saved && <div style={{ color: "var(--lime)", fontSize: 12.5 }}>Ticket saved.</div>}
      {error && <div style={{ color: "var(--red)", fontSize: 12.5 }}>{error}</div>}
      <input placeholder="GC superintendent name" value={superName} onChange={(e) => setSuperName(e.target.value)} style={inputStyle} />
      <input placeholder="Super email (optional)" value={superEmail} onChange={(e) => setSuperEmail(e.target.value)} style={inputStyle} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        <input placeholder="Hours" type="number" value={hours} onChange={(e) => setHours(e.target.value)} style={inputStyle} />
        <input placeholder="Equipment $" type="number" value={equipmentCost} onChange={(e) => setEquipmentCost(e.target.value)} style={inputStyle} />
        <input placeholder="Materials $" type="number" value={materialsCost} onChange={(e) => setMaterialsCost(e.target.value)} style={inputStyle} />
      </div>
      <SignaturePad key={padKey} onChange={setSignature} />
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
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
};
