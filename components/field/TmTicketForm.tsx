"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchTodayCrew } from "@/lib/todayCrew";
import { SignaturePad } from "./SignaturePad";
import { Label, Notice, Stepper, Title } from "./ui";

export function TmTicketForm({ companyId, jobId, createdBy }: { companyId: string; jobId: string; createdBy: string }) {
  const [superName, setSuperName] = useState("");
  const [superEmail, setSuperEmail] = useState("");
  const [hours, setHours] = useState(0);
  const [equipmentCost, setEquipmentCost] = useState("");
  const [materialsCost, setMaterialsCost] = useState("");
  const [signature, setSignature] = useState<Blob | null>(null);
  const [padKey, setPadKey] = useState(0);
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Pre-fill hours from today's actual shifts at this job (still editable).
  useEffect(() => {
    let cancelled = false;
    fetchTodayCrew(jobId)
      .then((c) => {
        if (!cancelled && c.hours > 0) setHours(c.hours);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  async function submit() {
    setBusy(true);
    setError(null);
    setOk(null);
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
      hours,
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
    setOk(signaturePath ? "Ticket signed and saved. The office can send the super a copy." : "Saved as a draft (not signed yet).");
    setSuperName("");
    setSuperEmail("");
    setHours(0);
    setEquipmentCost("");
    setMaterialsCost("");
    setSignature(null);
    setPadKey((k) => k + 1);
  }

  return (
    <div>
      <Title emoji="🧾" help="Time & materials sign-off. Hand the phone to the GC's super to sign.">
        T&amp;M ticket
      </Title>
      <Notice ok={ok} error={error} />

      <Label>🧑‍💼 Super&apos;s name</Label>
      <input className="fa-input" placeholder="GC superintendent" value={superName} onChange={(e) => setSuperName(e.target.value)} />

      <Label>📧 Super&apos;s email (so we can send a copy)</Label>
      <input className="fa-input" type="email" inputMode="email" placeholder="name@company.com" value={superEmail} onChange={(e) => setSuperEmail(e.target.value)} />

      <Label>⏱️ Hours worked (filled from today&apos;s clock-ins, change if needed)</Label>
      <Stepper value={hours} onChange={setHours} step={0.5} max={999} unit="h" />

      <Label>🚜 Equipment cost ($)</Label>
      <input className="fa-input" inputMode="decimal" placeholder="0" value={equipmentCost} onChange={(e) => setEquipmentCost(e.target.value)} />

      <Label>🧱 Materials cost ($)</Label>
      <input className="fa-input" inputMode="decimal" placeholder="0" value={materialsCost} onChange={(e) => setMaterialsCost(e.target.value)} />

      <Label>✍️ Super signs here</Label>
      <SignaturePad key={padKey} onChange={setSignature} />

      <button className="fa-btn go" disabled={busy || !superName.trim()} onClick={submit} type="button">
        {busy ? "Saving…" : "✅ Save ticket"}
      </button>
    </div>
  );
}
