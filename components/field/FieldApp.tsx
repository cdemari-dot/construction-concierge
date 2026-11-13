"use client";

import { useState } from "react";
import { KioskApp } from "@/components/kiosk/KioskApp";
import { ExtraForm } from "./ExtraForm";
import { TmTicketForm } from "./TmTicketForm";
import { IncidentForm } from "./IncidentForm";
import { DailyLogForm } from "./DailyLogForm";

interface FieldJob {
  id: string;
  company_id: string;
  job_number: string;
  name: string;
  geofence_lat: number | null;
  geofence_lon: number | null;
  geofence_radius_m: number;
}

const TABS = ["Punch clock", "Daily log", "Extras", "T&M ticket", "Incident"] as const;
type Tab = (typeof TABS)[number];

interface FieldToolboxTalk {
  id: string;
  title: string;
  body: string;
}

export function FieldApp({
  jobs,
  currentProfileId,
  toolboxTalksByJob,
}: {
  jobs: FieldJob[];
  currentProfileId: string;
  toolboxTalksByJob: Record<string, FieldToolboxTalk | null>;
}) {
  const [tab, setTab] = useState<Tab>("Punch clock");
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const job = jobs.find((j) => j.id === jobId) ?? jobs[0];

  if (!job) {
    return <div className="cc-card" style={{ color: "var(--mute)" }}>No jobs assigned yet.</div>;
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto" }}>
      <select value={jobId || job.id} onChange={(e) => setJobId(e.target.value)} style={{ ...selectStyle, marginBottom: 12 }}>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.job_number} · {j.name}
          </option>
        ))}
      </select>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 14 }}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={`cc-btn sm ${tab === t ? "" : "ghost"}`}
            style={{ whiteSpace: "nowrap" }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Punch clock" && <KioskApp job={job} toolboxTalk={toolboxTalksByJob[job.id] ?? null} />}
      {tab === "Daily log" && (
        <div className="cc-card">
          <DailyLogForm companyId={job.company_id} jobId={job.id} foremanId={currentProfileId} />
        </div>
      )}
      {tab === "Extras" && (
        <div className="cc-card">
          <ExtraForm companyId={job.company_id} jobId={job.id} reportedBy={currentProfileId} />
        </div>
      )}
      {tab === "T&M ticket" && (
        <div className="cc-card">
          <TmTicketForm companyId={job.company_id} jobId={job.id} createdBy={currentProfileId} />
        </div>
      )}
      {tab === "Incident" && (
        <div className="cc-card">
          <IncidentForm companyId={job.company_id} jobId={job.id} workerId={currentProfileId} />
        </div>
      )}
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line2)",
  borderRadius: 10,
  color: "var(--text)",
  padding: "9px 10px",
  fontSize: 14,
  width: "100%",
};
