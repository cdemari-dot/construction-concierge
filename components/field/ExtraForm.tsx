"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Label, Notice, Stepper, Title } from "./ui";

export function ExtraForm({ companyId, jobId, reportedBy }: { companyId: string; jobId: string; reportedBy: string }) {
  const [description, setDescription] = useState("");
  const [hours, setHours] = useState(0);
  const [materialsCost, setMaterialsCost] = useState("");
  const [authorizedBy, setAuthorizedBy] = useState("");
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setOk(null);
    setError(null);
    const supabase = createClient();
    const { error: e } = await supabase.from("extras").insert({
      company_id: companyId,
      job_id: jobId,
      reported_by: reportedBy,
      description,
      hours,
      materials_cost: Number(materialsCost) || 0,
      authorized_by: authorizedBy || null,
    });
    setBusy(false);
    if (e) {
      setError(`Not sent: ${e.message}`);
      return;
    }
    setOk("Sent to the office. They'll price it.");
    setDescription("");
    setHours(0);
    setMaterialsCost("");
    setAuthorizedBy("");
  }

  return (
    <div>
      <Title emoji="" help="Extra work that wasn't in the original scope. Get it on record before you do it.">
        Report an extra
      </Title>
      <Notice ok={ok} error={error} />

      <Label>What&apos;s the extra work?</Label>
      <textarea className="fa-input" rows={3} placeholder="e.g. Found a 2nd layer of tile, super said go ahead" value={description} onChange={(e) => setDescription(e.target.value)} />

      <Label>Extra hours</Label>
      <Stepper value={hours} onChange={setHours} step={0.5} max={999} unit="h" />

      <Label>Materials cost ($)</Label>
      <input className="fa-input" inputMode="decimal" placeholder="0" value={materialsCost} onChange={(e) => setMaterialsCost(e.target.value)} />

      <Label>Who said OK?</Label>
      <input className="fa-input" placeholder="e.g. Mike, GC super" value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)} />

      <button className="fa-btn go" disabled={busy || !description.trim()} onClick={submit} type="button">
        {busy ? "Sending…" : "Send to office"}
      </button>
    </div>
  );
}
