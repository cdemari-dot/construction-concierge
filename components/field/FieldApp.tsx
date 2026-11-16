"use client";

import { useState } from "react";
import { KioskApp } from "@/components/kiosk/KioskApp";
import { ExtraForm } from "./ExtraForm";
import { TmTicketForm } from "./TmTicketForm";
import { IncidentForm } from "./IncidentForm";
import { DailyLogForm } from "./DailyLogForm";
import { TodayView } from "./TodayView";
import { Icon, type IconName } from "./Icon";
import type { FieldWeek } from "@/lib/fieldWeek";

interface FieldJob {
  id: string;
  company_id: string;
  job_number: string;
  name: string;
  geofence_lat: number | null;
  geofence_lon: number | null;
  geofence_radius_m: number;
}

const TABS: { key: string; icon: IconName; label: string }[] = [
  { key: "today", icon: "home", label: "Today" },
  { key: "clock", icon: "clock", label: "My clock" },
  { key: "log", icon: "log", label: "Log" },
  { key: "extras", icon: "plus", label: "Extras" },
  { key: "tm", icon: "receipt", label: "T&M" },
  { key: "incident", icon: "alert", label: "Incident" },
];
type Tab = "today" | "clock" | "log" | "extras" | "tm" | "incident";

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
  week,
}: {
  jobs: FieldJob[];
  currentProfileId: string;
  firstName: string;
  toolboxTalksByJob: Record<string, FieldToolboxTalk | null>;
  week: FieldWeek;
}) {
  const [tab, setTab] = useState<Tab>("today");
  const [jobId, setJobId] = useState(week.days.find((d) => d.date === week.today)?.sites[0]?.jobId ?? jobs[0]?.id ?? "");
  const job = jobs.find((j) => j.id === jobId) ?? jobs[0];

  return (
    <div className="fa-wrap">
      {tab === "today" && <TodayView firstName={firstName} week={week} onOpenSite={(id) => { setJobId(id); setTab("clock"); }} onGo={(t) => setTab(t)} />}

      {tab !== "today" && !job && (
        <div style={{ textAlign: "center", paddingTop: 40 }}>
          <div className="display fa-title">No sites yet</div>
          <div className="fa-help">You aren&apos;t scheduled on a site yet. Ask the office to add you on the Schedule page.</div>
        </div>
      )}

      {tab !== "today" && job && (
        <select className="fa-job" value={jobId || job.id} onChange={(e) => setJobId(e.target.value)} aria-label="Site">
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.job_number} · {j.name}
            </option>
          ))}
        </select>
      )}

      {tab === "clock" && job && <KioskApp job={job} toolboxTalk={toolboxTalksByJob[job.id] ?? null} />}
      {tab === "log" && job && <DailyLogForm key={job.id} companyId={job.company_id} jobId={job.id} foremanId={currentProfileId} lat={job.geofence_lat} lon={job.geofence_lon} />}
      {tab === "extras" && job && <ExtraForm key={job.id} companyId={job.company_id} jobId={job.id} reportedBy={currentProfileId} />}
      {tab === "tm" && job && <TmTicketForm key={job.id} companyId={job.company_id} jobId={job.id} createdBy={currentProfileId} />}
      {tab === "incident" && job && <IncidentForm key={job.id} companyId={job.company_id} jobId={job.id} workerId={currentProfileId} />}

      <nav className="fa-tabbar" aria-label="Field app sections">
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`fa-tab ${tab === t.key ? "on" : ""}`} onClick={() => setTab(t.key as Tab)} aria-current={tab === t.key ? "page" : undefined}>
            <span className="e"><Icon name={t.icon} size={22} /></span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
