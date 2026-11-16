"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchTodayCrew } from "@/lib/todayCrew";
import { todayToronto } from "@/lib/today";
import { SignaturePad } from "./SignaturePad";
import { Icon } from "./Icon";
import { Label, Notice, Stepper, Title } from "./ui";

export function TmTicketForm({ companyId, jobId, createdBy }: { companyId: string; jobId: string; createdBy: string }) {
  const [superName, setSuperName] = useState("");
  const [superEmail, setSuperEmail] = useState("");
  const [hours, setHours] = useState(0);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
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

    const photoPaths: string[] = [];
    for (let i = 0; i < photos.length; i++) {
      const path = `${companyId}/${jobId}/${ticketId}/${i + 1}.jpg`;
      const up = await supabase.storage.from("tm-ticket-photos").upload(path, photos[i].file, { contentType: photos[i].file.type || "image/jpeg" });
      if (up.error) {
        setError(`Photo ${i + 1} did not upload: ${up.error.message}. Ticket NOT saved.`);
        setBusy(false);
        return;
      }
      photoPaths.push(path);
    }

    const { error: insertError } = await supabase.from("tm_tickets").insert({
      id: ticketId,
      company_id: companyId,
      job_id: jobId,
      created_by: createdBy,
      ticket_date: todayToronto(),
      super_name: superName,
      super_email: superEmail || null,
      hours,
      photo_paths: photoPaths,
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
    photos.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]);
    setSignature(null);
    setPadKey((k) => k + 1);
  }

  return (
    <div>
      <Title emoji="" help="Time & materials sign-off. Hand the phone to the GC's super to sign.">
        T&amp;M ticket
      </Title>
      <Notice ok={ok} error={error} />

      <Label>Super&apos;s name</Label>
      <input className="fa-input" placeholder="GC superintendent" value={superName} onChange={(e) => setSuperName(e.target.value)} />

      <Label>Super&apos;s email (so we can send a copy)</Label>
      <input className="fa-input" type="email" inputMode="email" placeholder="name@company.com" value={superEmail} onChange={(e) => setSuperEmail(e.target.value)} />

      <Label>Hours worked (filled from today&apos;s clock-ins, change if needed)</Label>
      <Stepper value={hours} onChange={setHours} step={0.5} max={999} unit="h" />

      <Label>Photos of the work ({photos.length}/8)</Label>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 6 }}>
        {photos.map((p, i) => (
          // Local preview of a just-taken photo, not a static asset.
          // eslint-disable-next-line @next/next/no-img-element
          <img key={p.url} src={p.url} alt={`Photo ${i + 1}`} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10, border: "1px solid var(--line2)" }} />
        ))}
        {photos.length < 8 && (
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
        capture="environment"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setPhotos((p) => [...p, { file: f, url: URL.createObjectURL(f) }]);
          e.target.value = "";
        }}
      />
      <div className="fa-help">Opens the camera. Photos attach to the ticket and the copy sent to the super.</div>

      <Label>Super signs here</Label>
      <SignaturePad key={padKey} onChange={setSignature} />

      <button className="fa-btn go" disabled={busy || !superName.trim()} onClick={submit} type="button">
        {busy ? "Saving…" : "Save ticket"}
      </button>
    </div>
  );
}
