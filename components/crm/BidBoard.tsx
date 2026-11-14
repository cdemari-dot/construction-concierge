"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createJobFromBid, moveBid, sendFollowUpNow, setAutoFollowUp, setBidEmail, setBidFollowUp, updateBidValue } from "@/app/(owner)/crm/actions";
import { FOLLOW_UP_DAYS, nextFollowUpInDays } from "@/lib/crm/followup";
import { fmt } from "@/lib/format";
import { todayToronto } from "@/lib/today";
import type { Bid, BidStage } from "@/lib/types/database";

const COLUMNS: { stage: BidStage; label: string; emoji: string }[] = [
  { stage: "lead", label: "Lead", emoji: "🎯" },
  { stage: "estimating", label: "Estimating", emoji: "🧮" },
  { stage: "submitted", label: "Bid sent", emoji: "📤" },
  { stage: "won", label: "Won", emoji: "🏆" },
  { stage: "lost", label: "Lost", emoji: "🥀" },
];

export function BidBoard({ bids, clientNames }: { bids: Bid[]; clientNames: Record<string, string> }) {
  const [error, setError] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<BidStage | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<void>) {
    setError(null);
    start(async () => {
      try {
        await fn();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function move(bid: Bid, stage: BidStage) {
    if (bid.stage === stage) return;
    let reason: string | undefined;
    if (stage === "lost") {
      const r = window.prompt("Why was it lost? (optional: price, timing, went elsewhere…)");
      if (r === null) return; // cancelled
      reason = r;
    }
    run(() => moveBid(bid.id, stage, reason));
  }

  return (
    <div>
      {error && <div className="fa-err" style={{ marginBottom: 12 }}>⚠️ {error}</div>}
      <div style={{ display: "grid", gridAutoFlow: "column", gridAutoColumns: "minmax(250px, 1fr)", gap: 12, overflowX: "auto", paddingBottom: 8, opacity: pending ? 0.75 : 1 }}>
        {COLUMNS.map((col) => {
          const items = bids.filter((b) => b.stage === col.stage);
          const total = items.reduce((s, b) => s + Number(b.value), 0);
          const over = overStage === col.stage;
          return (
            <section
              key={col.stage}
              className="cc-in"
              onDragOver={(e) => {
                e.preventDefault();
                setOverStage(col.stage);
              }}
              onDragLeave={() => setOverStage((s) => (s === col.stage ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setOverStage(null);
                const bid = bids.find((b) => b.id === dragId);
                setDragId(null);
                if (bid) move(bid, col.stage);
              }}
              style={{
                "--i": COLUMNS.indexOf(col) + 5,
                background: "var(--panel)",
                border: `1px solid ${over ? "var(--cyan)" : "var(--line)"}`,
                borderRadius: 16,
                padding: 10,
                minHeight: 160,
                transition: "border-color .2s, background .2s",
              } as React.CSSProperties}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "2px 4px 10px" }}>
                <b style={{ fontSize: 13 }}>
                  {col.emoji} {col.label} <span style={{ color: "var(--mute)", fontWeight: 500 }}>{items.length}</span>
                </b>
                <span className="mono" style={{ fontSize: 12, color: "var(--mute)" }}>
                  {fmt(total)}
                </span>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {items.map((b, idx) => (
                  <BidCardView
                    key={b.id}
                    index={idx}
                    bid={b}
                    client={b.client_id ? clientNames[b.client_id] : undefined}
                    onDragStart={() => setDragId(b.id)}
                    onMove={(stage) => move(b, stage)}
                    run={run}
                  />
                ))}
                {items.length === 0 && <div style={{ color: "var(--mute)", fontSize: 12, padding: "8px 4px" }}>Drop a bid here</div>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function BidCardView({
  bid,
  client,
  index,
  onDragStart,
  onMove,
  run,
}: {
  bid: Bid;
  index: number;
  client?: string;
  onDragStart: () => void;
  onMove: (s: BidStage) => void;
  run: (fn: () => Promise<void>) => void;
}) {
  const [jobNo, setJobNo] = useState("");
  const [value, setValue] = useState(String(bid.value));
  const today = todayToronto();
  const open = bid.stage === "lead" || bid.stage === "estimating" || bid.stage === "submitted";
  const overdue = open && bid.follow_up_on != null && bid.follow_up_on <= today;
  const dueSoon = open && bid.bid_due != null && bid.bid_due >= today && bid.bid_due <= addDays(today, 3);

  return (
    <div
      className="cc-card cc-in"
      draggable
      onDragStart={onDragStart}
      style={{ "--i": index + 6, padding: 12, cursor: "grab", display: "grid", gap: 6, borderColor: overdue ? "var(--amber)" : undefined } as React.CSSProperties}
    >
      <b style={{ fontSize: 13.5, lineHeight: 1.3 }}>{bid.name}</b>
      {(client || bid.contact) && (
        <div style={{ color: "var(--mute)", fontSize: 12 }}>{[client, bid.contact].filter(Boolean).join(" · ")}</div>
      )}
      {bid.address && <div style={{ color: "var(--mute)", fontSize: 11.5 }}>📍 {bid.address}</div>}

      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 12, color: "var(--mute)" }}>$</span>
        <input
          className="mono"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            const n = Number(value);
            if (Number.isFinite(n) && n !== Number(bid.value)) run(() => updateBidValue(bid.id, n));
          }}
          aria-label="Bid value"
          style={{ width: "100%", background: "transparent", border: "1px solid var(--line2)", borderRadius: 8, color: "var(--text)", padding: "4px 8px", fontSize: 13 }}
        />
      </div>

      {open && (
        <div style={{ display: "grid", gap: 4, fontSize: 11.5 }}>
          {bid.bid_due && (
            <div style={{ color: dueSoon ? "var(--amber)" : "var(--mute)" }}>📅 Bid due {bid.bid_due}{dueSoon ? " (soon)" : ""}</div>
          )}
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: overdue ? "var(--amber)" : "var(--mute)" }}>
            ⏰ Follow up
            <input
              type="date"
              defaultValue={bid.follow_up_on ?? ""}
              onChange={(e) => run(() => setBidFollowUp(bid.id, e.target.value || null))}
              style={{ background: "transparent", border: "1px solid var(--line2)", borderRadius: 8, color: "var(--text)", padding: "2px 6px", fontSize: 11.5 }}
            />
          </label>
          {overdue && <div style={{ color: "var(--amber)", fontWeight: 600 }}>Follow-up is due, give them a call</div>}
        </div>
      )}

      {(bid.stage === "submitted" || bid.stage === "estimating" || bid.stage === "lead") && (
        <div style={{ display: "grid", gap: 4, fontSize: 11.5 }}>
          <input
            type="email"
            placeholder="Contact email (for follow-ups)"
            defaultValue={bid.contact_email ?? ""}
            onBlur={(e) => {
              if ((e.target.value || "") !== (bid.contact_email ?? "")) run(() => setBidEmail(bid.id, e.target.value));
            }}
            style={{ background: "transparent", border: "1px solid var(--line2)", borderRadius: 8, color: "var(--text)", padding: "4px 8px", fontSize: 12 }}
          />
          {bid.stage === "submitted" && (
            <div style={{ color: "var(--mute)" }}>
              🤖 Auto follow-ups {bid.auto_follow_up ? "on" : "off"} · {bid.follow_up_count} of {FOLLOW_UP_DAYS.length} sent
              {bid.auto_follow_up && bid.contact_email && nextFollowUpInDays(bid) != null && (
                <> · {nextFollowUpInDays(bid) === 0 ? "due at the next daily run" : `next in ${nextFollowUpInDays(bid)} day${nextFollowUpInDays(bid) === 1 ? "" : "s"}`}</>
              )}
              {!bid.contact_email && <span style={{ color: "var(--amber)" }}> · add an email to start</span>}
              {bid.last_follow_up_at && <> · last {new Date(bid.last_follow_up_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", timeZone: "America/Toronto" })}</>}
            </div>
          )}
          {bid.stage === "submitted" && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button className="cc-btn ghost sm" type="button" onClick={() => run(() => setAutoFollowUp(bid.id, !bid.auto_follow_up))}>
                {bid.auto_follow_up ? "Pause auto" : "Resume auto"}
              </button>
              <button
                className="cc-btn sm"
                type="button"
                disabled={!bid.contact_email}
                onClick={() => {
                  if (window.confirm(`Send a follow-up email to ${bid.contact_email} now?`)) run(() => sendFollowUpNow(bid.id));
                }}
              >
                ✉️ Send now
              </button>
            </div>
          )}
        </div>
      )}

      {bid.notes && <div style={{ fontSize: 12, color: "var(--text2)", whiteSpace: "pre-wrap" }}>{bid.notes}</div>}
      {bid.stage === "lost" && bid.lost_reason && <div style={{ fontSize: 12, color: "var(--mute)" }}>Lost: {bid.lost_reason}</div>}

      {bid.stage === "won" &&
        (bid.job_id ? (
          <Link href={`/jobs/${bid.job_id}`} className="cc-btn lime sm" style={{ justifySelf: "start" }}>
            ✅ Open job
          </Link>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <input
              placeholder="Job #"
              value={jobNo}
              onChange={(e) => setJobNo(e.target.value)}
              style={{ width: 80, background: "transparent", border: "1px solid var(--line2)", borderRadius: 8, color: "var(--text)", padding: "4px 8px", fontSize: 12.5 }}
            />
            <button className="cc-btn lime sm" type="button" disabled={!jobNo.trim()} onClick={() => run(() => createJobFromBid(bid.id, jobNo))}>
              Create job
            </button>
          </div>
        ))}

      <select
        value={bid.stage}
        onChange={(e) => onMove(e.target.value as BidStage)}
        aria-label="Move to stage"
        style={{ background: "transparent", border: "1px solid var(--line2)", borderRadius: 8, color: "var(--mute)", padding: "4px 6px", fontSize: 11.5 }}
      >
        {COLUMNS.map((c) => (
          <option key={c.stage} value={c.stage}>
            Move to: {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
