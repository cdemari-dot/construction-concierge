"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentPosition, type GeoResult } from "@/lib/geo";
import { stampPhoto } from "@/lib/kiosk/stampPhoto";
import { PPE_ITEMS } from "@/lib/kiosk/constants";
import { Icon } from "@/components/field/Icon";
import { PinPad } from "./PinPad";
import { PhotoStep } from "./PhotoStep";
import { PpeStep } from "./PpeStep";
import { ToolboxTalkStep } from "./ToolboxTalkStep";
import { InjuryFormStep, InjuryQuestionStep, ReportStep } from "./ClockOutSteps";

type Step = "pin" | "photo" | "ppe" | "ppe-missing" | "toolbox" | "done-in" | "injury-q" | "injury-form" | "report" | "done-out" | "error";

interface KioskJob {
  id: string;
  company_id: string;
  job_number: string;
  name: string;
  geofence_lat: number | null;
  geofence_lon: number | null;
  geofence_radius_m: number;
}

interface KioskToolboxTalk {
  id: string;
  title: string;
  body: string;
}

interface Worker {
  id: string;
  full_name: string;
  role: string;
}

export function KioskApp({ job, toolboxTalk }: { job: KioskJob; toolboxTalk: KioskToolboxTalk | null }) {
  const supabase = useRef(createClient()).current;

  const [step, setStep] = useState<Step>("pin");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [worker, setWorker] = useState<Worker | null>(null);
  const [mode, setMode] = useState<"in" | "out">("in");
  const [openEntryId, setOpenEntryId] = useState<string | null>(null);
  const [geo, setGeo] = useState<GeoResult>({ lat: null, lon: null, withinGeofence: null });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [ppeChecked, setPpeChecked] = useState<Record<number, boolean>>({});
  const [injury, setInjury] = useState(false);
  const [busy, setBusy] = useState(false);
  const [doneMessage, setDoneMessage] = useState("");
  const [doneDetail, setDoneDetail] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  function resetAll() {
    setStep("pin");
    setPin("");
    setPinError(null);
    setWorker(null);
    setOpenEntryId(null);
    setPhotoFile(null);
    setPpeChecked({});
    setInjury(false);
    setDoneMessage("");
    setDoneDetail("");
    setFailure(null);
  }

  function fail(e: unknown) {
    setFailure(e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong");
    setStep("error");
  }

  function scheduleReset(ms = 4000) {
    resetTimer.current = setTimeout(resetAll, ms);
  }

  async function handleDigit(n: number) {
    if (pin.length >= 4) return;
    const next = pin + String(n);
    setPin(next);
    if (next.length === 4) {
      setPinError(null);
      await verifyPin(next);
    }
  }

  async function verifyPin(candidate: string) {
    setBusy(true);
    const { data, error } = await supabase.rpc("verify_worker_pin", { p_pin: candidate });
    if (error || !data || data.length === 0) {
      setBusy(false);
      setPin("");
      setPinError("PIN not recognized. Try again or see your foreman.");
      return;
    }

    const w = data[0] as Worker;
    setWorker(w);

    const { data: openEntries } = await supabase
      .from("time_entries")
      .select("id")
      .eq("worker_id", w.id)
      .eq("job_id", job.id)
      .is("clock_out_at", null)
      .limit(1);

    const isClockingOut = Boolean(openEntries && openEntries.length > 0);
    setMode(isClockingOut ? "out" : "in");
    setOpenEntryId(isClockingOut ? openEntries![0].id : null);

    getCurrentPosition(job.geofence_lat, job.geofence_lon, job.geofence_radius_m).then(setGeo);

    setBusy(false);
    setStep("photo");
  }

  function handlePhotoCaptured(file: File | null) {
    setPhotoFile(file);
    setStep(mode === "in" ? "ppe" : "injury-q");
  }

  // Everyone except the foreman (who delivers the talk) must sign it before clocking in.
  const mustSignTalk = worker?.role !== "foreman";

  function afterPpe(all?: Record<number, boolean>) {
    if (!mustSignTalk) {
      submitClockIn(all);
      return;
    }
    if (!toolboxTalk) {
      fail(new Error("Today's safety talk isn't set up for this job, so clock-in is blocked. Tell the office."));
      return;
    }
    setStep("toolbox");
  }

  function handlePpeAllGood() {
    afterPpe();
  }

  function handleForemanSupplied() {
    const all: Record<number, boolean> = {};
    PPE_ITEMS.forEach((_, i) => (all[i] = true));
    setPpeChecked(all);
    afterPpe(all);
  }

  async function submitClockIn(overridePpeChecked?: Record<number, boolean>) {
    if (!worker) return;
    setBusy(true);
    try {
      const blob = await stampPhoto(photoFile, { label: "IN", lat: geo.lat, lon: geo.lon, geofenceOk: geo.withinGeofence });
      const path = `${job.company_id}/${job.id}/${worker.id}-${Date.now()}-in.jpg`;
      const up = await supabase.storage.from("punch-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw new Error(`Photo upload failed: ${up.error.message}`);

      const effectivePpe = overridePpeChecked ?? ppeChecked;
      const missing = PPE_ITEMS.filter((_, i) => !effectivePpe[i]);

      // Allowed anywhere, but a punch at a site they aren't scheduled on today is flagged for the office.
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
      const { data: sched } = await supabase.from("schedule_entries").select("id").eq("worker_id", worker.id).eq("job_id", job.id).eq("work_date", today).limit(1);
      const offSchedule = !sched || sched.length === 0;

      const { data: entry, error } = await supabase
        .from("time_entries")
        .insert({
          company_id: job.company_id,
          job_id: job.id,
          worker_id: worker.id,
          clock_in_lat: geo.lat,
          clock_in_lon: geo.lon,
          clock_in_photo_path: path,
          geofence_ok: geo.withinGeofence,
          off_schedule: offSchedule,
          ppe_confirmed: missing.length === 0,
          ppe_missing_items: missing,
          toolbox_talk_id: mustSignTalk ? toolboxTalk?.id ?? null : null,
        })
        .select()
        .single();

      if (error) throw error;

      if (mustSignTalk && toolboxTalk && entry) {
        const { error: ackError } = await supabase.from("toolbox_talk_acknowledgements").insert({
          toolbox_talk_id: toolboxTalk.id,
          worker_id: worker.id,
          time_entry_id: entry.id,
        });
        if (ackError) throw new Error(`Toolbox talk sign-off failed: ${ackError.message}`);
      }

      setDoneDetail(
        [
          geo.lat != null ? (geo.withinGeofence === false ? "GPS saved (outside the job geofence)" : "GPS saved") : "No GPS fix",
          "photo saved",
          missing.length === 0 ? "PPE confirmed" : `PPE missing: ${missing.join(", ")}`,
          mustSignTalk && toolboxTalk ? "safety talk signed" : null,
        ]
          .filter(Boolean)
          .join(" · "),
      );

      setDoneMessage(`Clocked in ${new Date().toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}`);
      setStep("done-in");
      scheduleReset();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  async function submitIncidentReport(data: { incident_type: string; description: string; first_aid_given?: boolean; needs_medical?: boolean }) {
    if (!worker) return;
    const { error } = await supabase.from("incident_reports").insert({
      company_id: job.company_id,
      job_id: job.id,
      worker_id: worker.id,
      time_entry_id: openEntryId,
      incident_type: data.incident_type,
      description: data.description,
      first_aid_given: data.first_aid_given ?? false,
      needs_medical: data.needs_medical ?? false,
    });
    if (error) throw new Error(`Incident report failed: ${error.message}`);
  }

  async function submitClockOut() {
    if (!worker || !openEntryId) return;
    setBusy(true);
    try {
      const blob = await stampPhoto(photoFile, { label: "OUT", lat: geo.lat, lon: geo.lon, geofenceOk: geo.withinGeofence });
      const path = `${job.company_id}/${job.id}/${worker.id}-${Date.now()}-out.jpg`;
      const up = await supabase.storage.from("punch-photos").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) throw new Error(`Photo upload failed: ${up.error.message}`);

      const { error: outError } = await supabase
        .from("time_entries")
        .update({
          clock_out_at: new Date().toISOString(),
          clock_out_lat: geo.lat,
          clock_out_lon: geo.lon,
          clock_out_photo_path: path,
          injury_reported: injury,
        })
        .eq("id", openEntryId);
      if (outError) throw new Error(`Clock-out failed: ${outError.message}`);

      setDoneDetail(`${geo.lat != null ? "GPS saved" : "No GPS fix"} · photo saved · ${injury ? "injury reported, office notified" : "no injury reported"}`);
      setDoneMessage(`Clocked out ${new Date().toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" })}`);
      setStep("done-out");
      scheduleReset();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="cc-card"
      style={{ maxWidth: 480, margin: "8px auto", padding: 20, minHeight: 460, display: "flex", flexDirection: "column", justifyContent: "center" }}
    >
      {step === "pin" && (
        <PinPad pin={pin} onDigit={handleDigit} onClear={() => setPin("")} onBackspace={() => setPin((p) => p.slice(0, -1))} error={pinError} />
      )}

      {step === "photo" && worker && (
        <PhotoStep title={`${mode === "in" ? "Clock in" : "Clock out"} · Hi ${worker.full_name.split(" ")[0]}`} onCaptured={handlePhotoCaptured} onCancel={resetAll} />
      )}

      {step === "ppe" && (
        <PpeStep
          checked={ppeChecked}
          onToggle={(i) => setPpeChecked((p) => ({ ...p, [i]: !p[i] }))}
          onAllGood={handlePpeAllGood}
          onMissing={() => setStep("ppe-missing")}
        />
      )}

      {step === "ppe-missing" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "grid", placeItems: "center", color: "var(--amber)" }}>
            <Icon name="stop" size={56} />
          </div>
          <div className="display fa-title" style={{ margin: "10px 0" }}>
            Hold up, don&apos;t start yet
          </div>
          <div style={{ color: "var(--amber)", marginBottom: 8, fontSize: 16, fontWeight: 600 }}>
            Missing: {PPE_ITEMS.filter((_, i) => !ppeChecked[i]).join(", ") || "items not confirmed"}
          </div>
          <div style={{ color: "var(--mute)", marginBottom: 6, fontSize: 15 }}>Ask your foreman to get you set up.</div>
          <button className="fa-btn go" onClick={handleForemanSupplied} type="button">
            Foreman gave me the gear
          </button>
          <button className="fa-btn quiet" onClick={resetAll} type="button">
            ← Cancel
          </button>
        </div>
      )}

      {step === "toolbox" && toolboxTalk && (
        <ToolboxTalkStep title={toolboxTalk.title} body={toolboxTalk.body} onAcknowledge={() => submitClockIn(ppeChecked)} />
      )}

      {step === "injury-q" && (
        <InjuryQuestionStep
          onAnswer={(hurt) => {
            setInjury(hurt);
            setStep(hurt ? "injury-form" : "report");
          }}
        />
      )}

      {step === "injury-form" && (
        <InjuryFormStep
          onSubmit={async (data) => {
            try {
              await submitIncidentReport({ incident_type: "Injury", description: data.description, first_aid_given: data.firstAidGiven, needs_medical: data.needsMedical });
              setStep("report");
            } catch (e) {
              fail(e);
            }
          }}
        />
      )}

      {step === "report" && (
        <ReportStep
          onSubmit={async (data) => {
            try {
              if (data.category !== "Nothing to report") {
                await submitIncidentReport({ incident_type: data.category, description: data.details });
              }
            } catch (e) {
              fail(e);
              return;
            }
            await submitClockOut();
          }}
        />
      )}

      {(step === "done-in" || step === "done-out") && (
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "grid", placeItems: "center", color: "var(--lime)" }}>
            <Icon name="circleCheck" size={72} />
          </div>
          <div className="display fa-title" style={{ margin: "10px 0" }}>
            {doneMessage}
          </div>
          <div style={{ color: "var(--mute)", fontSize: 15, lineHeight: 1.7 }}>
            {doneDetail}
          </div>
        </div>
      )}

      {step === "error" && (
        <div style={{ textAlign: "center" }}>
          <div style={{ display: "grid", placeItems: "center", color: "var(--red)" }}>
            <Icon name="alert" size={56} />
          </div>
          <div className="display fa-title" style={{ margin: "10px 0" }}>
            That punch did NOT save
          </div>
          <div style={{ color: "var(--red)", fontSize: 15, lineHeight: 1.6, marginBottom: 12 }}>{failure}</div>
          <div style={{ color: "var(--mute)", fontSize: 15 }}>Tell your foreman, then try again.</div>
          <button className="fa-btn" onClick={resetAll} type="button">
            Start over
          </button>
        </div>
      )}

      {busy && <div style={{ textAlign: "center", color: "var(--mute)", fontSize: 12, marginTop: 14 }}>Working…</div>}
    </div>
  );
}
