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

const TABS = [
  { key: "clock", emoji: "⏱️", label: "Clock" },
  { key: "log", emoji: "📝", label: "Daily log" },
  { key: "extras", emoji: "➕", label: "Extras" },
  { key: "tm", emoji: "🧾", label: "T&M" },
  { key: "incident", emoji: "🚨", label: "Incident" },
] as const;
type Tab = (typeof TABS)[number]["key"];

interface FieldToolboxTalk {
  id: string;
  title: string;
  body: string;
}

export function FieldApp({
  jobs,
  currentProfileId,
  firstName,
  toolboxTalksByJob,
}: {
  jobs: FieldJob[];
  currentProfileId: string;
  firstName: string;
  toolboxTalksByJob: Record<string, FieldToolboxTalk | null>;
}) {
  const [tab, setTab] = useState<Tab>("clock");
  const [jobId, setJobId] = useState(jobs[0]?.id ?? "");
  const job = jobs.find((j) => j.id === jobId) ?? jobs[0];

  if (!job) {
    return (
      <div className="fa-wrap" style={{ textAlign: "center", paddingTop: 60 }}>
        <div style={{ fontSize: 56 }}>🏗️</div>
        <div className="display fa-title">No jobs yet</div>
        <div className="fa-help">Ask the office to add you to a job. It will show up here.</div>
      </div>
    );
  }

  return (
    <div className="fa-wrap">
      <div className="display fa-hello">👋 Hi {firstName}!</div>
      <div className="fa-sub">Pick your job, then tap what you need below.</div>

      <select className="fa-job" value={jobId || job.id} onChange={(e) => setJobId(e.target.value)} aria-label="Job">
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            🏗️ {j.job_number} · {j.name}
          </option>
        ))}
      </select>

      {tab === "clock" && <KioskApp job={job} toolboxTalk={toolboxTalksByJob[job.id] ?? null} />}
      {tab === "log" && <DailyLogForm key={job.id} companyId={job.company_id} jobId={job.id} foremanId={currentProfileId} />}
      {tab === "extras" && <ExtraForm key={job.id} companyId={job.company_id} jobId={job.id} reportedBy={currentProfileId} />}
      {tab === "tm" && <TmTicketForm key={job.id} companyId={job.company_id} jobId={job.id} createdBy={currentProfileId} />}
      {tab === "incident" && <IncidentForm key={job.id} companyId={job.company_id} jobId={job.id} workerId={currentProfileId} />}

      <nav className="fa-tabbar" aria-label="Field app sections">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`fa-tab ${tab === t.key ? "on" : ""}`} onClick={() => setTab(t.key)} aria-current={tab === t.key ? "page" : undefined}>
            <span className="e">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
