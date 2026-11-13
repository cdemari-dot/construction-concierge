"use client";

import { useRef, useTransition } from "react";
import { addScheduleEntry, removeScheduleEntry } from "@/app/(owner)/schedule/actions";
import type { Job, Profile } from "@/lib/types/database";

const inputStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line2)",
  borderRadius: 10,
  color: "var(--text)",
  padding: "9px 10px",
  fontSize: 13.5,
};

export function AddScheduleForm({ jobs, crew }: { jobs: Job[]; crew: Profile[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="cc-card"
      style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}
      action={(formData) =>
        startTransition(async () => {
          await addScheduleEntry(formData);
          formRef.current?.reset();
        })
      }
    >
      <select name="job_id" required style={inputStyle} defaultValue="">
        <option value="" disabled>
          Job
        </option>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.job_number}
          </option>
        ))}
      </select>
      <select name="worker_id" required style={inputStyle} defaultValue="">
        <option value="" disabled>
          Crew
        </option>
        {crew.map((c) => (
          <option key={c.id} value={c.id}>
            {c.full_name}
          </option>
        ))}
      </select>
      <input name="work_date" type="date" required style={inputStyle} />
      <input name="notes" placeholder="Notes (optional)" style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
      <button className="cc-btn lime" type="submit" disabled={pending}>
        {pending ? "Adding…" : "Assign"}
      </button>
    </form>
  );
}

export function RemoveScheduleButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="cc-btn ghost sm"
      disabled={pending}
      onClick={() => startTransition(() => removeScheduleEntry(id))}
      type="button"
      style={{ padding: "2px 6px" }}
    >
      ✕
    </button>
  );
}
