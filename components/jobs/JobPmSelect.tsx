"use client";

import { useState, useTransition } from "react";
import { setJobPm } from "@/app/(owner)/jobs/actions";

export function JobPmSelect({ jobId, current, options }: { jobId: string; current: string | null; options: { id: string; label: string }[] }) {
  const [value, setValue] = useState(current ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <div className="cc-card" style={{ marginBottom: 20, display: "grid", gap: 6 }}>
      <div style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)" }}>PM for this job</div>
      <div style={{ fontSize: 13, color: "var(--mute)" }}>Gets a copy of every signed T&amp;M ticket. The client gets the other copy.</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select
          value={value}
          disabled={pending}
          onChange={(e) => {
            const v = e.target.value;
            setValue(v);
            setSaved(false);
            setError(null);
            startTransition(async () => {
              try {
                await setJobPm(jobId, v || null);
                setSaved(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Not saved");
              }
            });
          }}
          style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid var(--line2)", background: "transparent", color: "inherit", minWidth: 240 }}
        >
          <option value="">None (copies go to the owner)</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        {saved && <span style={{ color: "var(--lime)", fontSize: 13 }}>Saved</span>}
        {error && <span style={{ color: "var(--red)", fontSize: 13 }}>{error}</span>}
      </div>
    </div>
  );
}
