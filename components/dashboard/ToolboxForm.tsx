"use client";

import { useRef, useState, useTransition } from "react";
import { createToolboxTalk } from "@/app/(owner)/toolbox/actions";
import { todayToronto } from "@/lib/today";
import { TALK_TEMPLATES } from "@/lib/toolbox";

export function ToolboxForm({ jobs }: { jobs: { id: string; label: string }[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const today = todayToronto();

  return (
    <form
      ref={formRef}
      className="cc-card"
      style={{ display: "grid", gap: 10, maxWidth: 640 }}
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          setSaved(false);
          try {
            await createToolboxTalk(fd);
            setSaved(true);
            setTitle("");
            setBody("");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save");
          }
        })
      }
    >
      <b className="display" style={{ fontSize: 16 }}>New toolbox talk</b>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {TALK_TEMPLATES.map((t) => (
          <button key={t.title} type="button" className="cc-btn ghost sm" onClick={() => { setTitle(t.title); setBody(t.body); }}>
            {t.title}
          </button>
        ))}
      </div>
      {error && <div style={{ color: "var(--red)", fontSize: 12.5 }}>{error}</div>}
      {saved && <div style={{ color: "var(--lime)", fontSize: 12.5 }}>Saved. Crew will see it at their next clock-in.</div>}
      <input name="title" placeholder="Title" required value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
      <textarea name="body" placeholder="What the crew is acknowledging" required rows={5} value={body} onChange={(e) => setBody(e.target.value)} style={inputStyle} />
      <label style={{ fontSize: 12, color: "var(--mute)", display: "grid", gap: 4 }}>
        Date
        <input name="talk_date" type="date" defaultValue={today} style={inputStyle} />
      </label>
      <fieldset style={{ border: "1px solid var(--line2)", borderRadius: 10, padding: 10 }}>
        <legend style={{ fontSize: 12, color: "var(--mute)", padding: "0 6px" }}>Jobs</legend>
        <div style={{ display: "grid", gap: 6 }}>
          {jobs.map((j) => (
            <label key={j.id} style={{ fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
              <input type="checkbox" name="job_id" value={j.id} /> {j.label}
            </label>
          ))}
          {jobs.length === 0 && <span style={{ color: "var(--mute)", fontSize: 13 }}>No active jobs.</span>}
        </div>
      </fieldset>
      <button className="cc-btn lime" disabled={pending} type="submit">
        {pending ? "Saving…" : "Publish talk"}
      </button>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line2)",
  borderRadius: 10,
  color: "var(--text)",
  padding: "9px 10px",
  fontSize: 14,
  fontFamily: "inherit",
};
