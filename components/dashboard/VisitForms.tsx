"use client";

import { useState, useTransition } from "react";
import { createSiteVisit, deleteSiteVisit, setVisitStatus } from "@/app/(owner)/visits/actions";

const input: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--line2)",
  borderRadius: 10,
  color: "var(--text)",
  padding: "9px 11px",
  fontSize: 13.5,
  width: "100%",
  minWidth: 0,
};

interface Opt {
  id: string;
  label: string;
}

export function AddVisitForm({
  bids,
  jobs,
  people,
  defaults,
}: {
  bids: (Opt & { address: string | null })[];
  jobs: Opt[];
  people: Opt[];
  defaults: { bidId: string; title: string; address: string };
}) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pending, start] = useTransition();
  const [bidId, setBidId] = useState(defaults.bidId);
  const [title, setTitle] = useState(defaults.title);
  const [address, setAddress] = useState(defaults.address);

  return (
    <form
      className="cc-card"
      style={{ display: "grid", gap: 10, marginBottom: 18 }}
      action={(fd) =>
        start(async () => {
          setError(null);
          setOk(false);
          try {
            await createSiteVisit(fd);
            setOk(true);
            setTitle("");
            setAddress("");
            setBidId("");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed");
          }
        })
      }
    >
      <h3 style={{ fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--mute)" }}>Schedule a site visit</h3>
      {error && <div style={{ color: "var(--red)", fontSize: 12.5 }}>{error}</div>}
      {ok && <div style={{ color: "var(--lime)", fontSize: 12.5 }}>Visit scheduled.</div>}
      <input name="title" placeholder="e.g. Walk the 12th floor for the demo bid" required value={title} onChange={(e) => setTitle(e.target.value)} style={input} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
        <select
          name="bid_id"
          value={bidId}
          onChange={(e) => {
            setBidId(e.target.value);
            const b = bids.find((x) => x.id === e.target.value);
            if (b) {
              if (!address && b.address) setAddress(b.address);
              if (!title) setTitle(`Site visit: ${b.label}`);
            }
          }}
          style={input}
        >
          <option value="">Bid (optional)</option>
          {bids.map((b) => (
            <option key={b.id} value={b.id}>
              {b.label}
            </option>
          ))}
        </select>
        <select name="job_id" defaultValue="" style={input}>
          <option value="">Job (optional)</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.label}
            </option>
          ))}
        </select>
        <select name="assigned_to" defaultValue="" style={input}>
          <option value="">Who is going</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <input name="address" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} style={input} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input name="visit_on" type="date" required style={input} aria-label="Date" />
        <input name="start_time" type="time" style={input} aria-label="Time" />
      </div>
      <textarea name="notes" rows={2} placeholder="Notes (access, who to meet, what to measure)" style={input} />
      <button className="cc-btn lime" type="submit" disabled={pending} style={{ justifySelf: "start" }}>
        {pending ? "Saving…" : "Schedule visit"}
      </button>
    </form>
  );
}

export function VisitActions({ id, status, title }: { id: string; status: "scheduled" | "done" | "cancelled"; title: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const go = (fn: () => Promise<void>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed");
      }
    });
  return (
    <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      {status === "scheduled" && (
        <button className="cc-btn sm" type="button" disabled={pending} onClick={() => go(() => setVisitStatus(id, "done"))}>
          Mark done
        </button>
      )}
      {status === "scheduled" && (
        <button className="cc-btn ghost sm" type="button" disabled={pending} onClick={() => go(() => setVisitStatus(id, "cancelled"))}>
          Cancel
        </button>
      )}
      {status !== "scheduled" && (
        <button className="cc-btn ghost sm" type="button" disabled={pending} onClick={() => go(() => setVisitStatus(id, "scheduled"))}>
          Reopen
        </button>
      )}
      <button
        className="cc-btn ghost sm"
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Delete the visit "${title}"?`)) go(() => deleteSiteVisit(id));
        }}
      >
        Delete
      </button>
      {error && <span style={{ color: "var(--red)", fontSize: 12 }}>{error}</span>}
    </span>
  );
}
