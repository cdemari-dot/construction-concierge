"use client";

import { useRef, useState, useTransition } from "react";
import { createBid } from "@/app/(owner)/crm/actions";

const input: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line2)",
  borderRadius: 10,
  color: "var(--text)",
  padding: "9px 10px",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  minWidth: 0,
};

export function BidForm({ clients }: { clients: { id: string; name: string }[] }) {
  const ref = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button className="cc-btn lime" type="button" onClick={() => setOpen(true)}>
        + New bid
      </button>
    );
  }

  return (
    <form
      ref={ref}
      className="cc-card"
      style={{ display: "grid", gap: 10, maxWidth: 560, marginBottom: 16 }}
      action={(fd) =>
        start(async () => {
          setError(null);
          try {
            await createBid(fd);
            ref.current?.reset();
            setOpen(false);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save the bid");
          }
        })
      }
    >
      <b className="display" style={{ fontSize: 16 }}>New bid</b>
      {error && <div className="fa-err">⚠️ {error}</div>}
      <input name="name" placeholder="Project name" required style={input} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <select name="client_id" defaultValue="" style={input}>
          <option value="">Client / GC (optional)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input name="contact" placeholder="Contact (estimator, PM…)" style={input} />
      </div>
      <input name="address" placeholder="Site address" style={input} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
        <input name="value" inputMode="decimal" placeholder="Bid value ($)" style={input} />
        <label style={{ fontSize: 11.5, color: "var(--mute)", display: "grid", gap: 3 }}>
          Bid due
          <input name="bid_due" type="date" style={input} />
        </label>
        <label style={{ fontSize: 11.5, color: "var(--mute)", display: "grid", gap: 3 }}>
          Follow up on
          <input name="follow_up_on" type="date" style={input} />
        </label>
      </div>
      <textarea name="notes" rows={2} placeholder="Notes" style={{ ...input, fontFamily: "inherit" }} />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="cc-btn lime" type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add to pipeline"}
        </button>
        <button className="cc-btn ghost" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
