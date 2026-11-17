"use client";

import { useState, useTransition } from "react";
import { codeBillToJob } from "@/app/(owner)/finance/actions";
import { fmt } from "@/lib/format";

export interface UncodedBill {
  id: string;
  vendor: string;
  description: string | null;
  amount: number;
  due: string | null;
  suggestJobId: string | null; // where this vendor was last coded
}
export interface JobOption {
  id: string;
  label: string;
}

// Statutory and payroll payments are labour/overhead, not job materials, so they stay out of the way.
const OVERHEAD_VENDOR = /\b(cra|receiver general|wsib|workplace safety|payroll|revenue agency|cpp|ei\b|ontario health|eht)\b/i;

const h3: React.CSSProperties = { fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 10 };

export function CodeBills({ bills, jobs, codedPct, codedAmount }: { bills: UncodedBill[]; jobs: JobOption[]; codedPct: number; codedAmount: number }) {
  const [showAll, setShowAll] = useState(false);
  const [showOverhead, setShowOverhead] = useState(false);
  const jobCosts = bills.filter((b) => !OVERHEAD_VENDOR.test(b.vendor)).sort((a, b) => b.amount - a.amount);
  const overhead = bills.filter((b) => OVERHEAD_VENDOR.test(b.vendor)).sort((a, b) => b.amount - a.amount);
  const shown = showAll ? jobCosts : jobCosts.slice(0, 15);
  const total = jobCosts.reduce((s, b) => s + b.amount, 0);

  return (
    <section id="code-bills" className="cc-card cc-in" style={{ "--i": 8 } as React.CSSProperties}>
      <h3 style={h3}>Tie bills to jobs</h3>
      <p style={{ fontSize: 12.5, color: "var(--text2)", lineHeight: 1.6, marginBottom: 12 }}>
        Your job margin is only real once the materials, subs and equipment you paid for are tied to the job they were for. Right now <b>{Math.round(codedPct)}%</b> of your billing ({fmt(codedAmount)}) has bills tied to its job. Pick the job for each bill below. It saves right away, changes only your job margin, and does not touch your cash forecast.
      </p>

      {jobCosts.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--lime)" }}>Nothing left to tie: every job-type bill already belongs to a job.</div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "var(--mute)", marginBottom: 6 }}>
            {jobCosts.length} bills, {fmt(total)} not tied to a job, biggest first
          </div>
          <div style={{ display: "grid" }}>
            {shown.map((b, i) => (
              <Row key={b.id} bill={b} jobs={jobs} index={i} />
            ))}
          </div>
          {jobCosts.length > 15 && (
            <button type="button" className="cc-btn ghost sm" style={{ marginTop: 10 }} onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show fewer" : `Show all ${jobCosts.length}`}
            </button>
          )}
        </>
      )}

      {overhead.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          <button type="button" className="cc-btn ghost sm" onClick={() => setShowOverhead((v) => !v)}>
            {showOverhead ? "Hide" : "Show"} {overhead.length} tax and payroll bills ({fmt(overhead.reduce((s, b) => s + b.amount, 0))})
          </button>
          <div style={{ fontSize: 12, color: "var(--mute)", marginTop: 6 }}>CRA, WSIB and payroll payments. They are labour and overhead, so they are best left off jobs.</div>
          {showOverhead && (
            <div style={{ display: "grid", marginTop: 6 }}>
              {overhead.map((b, i) => (
                <Row key={b.id} bill={b} jobs={jobs} index={i} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Row({ bill, jobs, index }: { bill: UncodedBill; jobs: JobOption[]; index: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const suggested = bill.suggestJobId ? jobs.find((j) => j.id === bill.suggestJobId) : undefined;

  function save(jobId: string) {
    if (!jobId) return;
    setError(null);
    startTransition(async () => {
      try {
        await codeBillToJob(bill.id, jobId);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save");
      }
    });
  }

  return (
    <div className="cc-in" style={{ "--i": Math.min(index, 10), display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 8, alignItems: "center", padding: "10px 0", borderTop: "1px solid var(--line)", opacity: pending ? 0.5 : 1 } as React.CSSProperties}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{bill.vendor}</div>
        <div style={{ fontSize: 12, color: "var(--mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {bill.description ? `${bill.description} · ` : ""}
          {bill.due ? `due ${bill.due}` : "no due date"}
        </div>
        {suggested && (
          <button type="button" className="cc-btn ghost sm" style={{ marginTop: 4, padding: "2px 8px", fontSize: 11 }} disabled={pending} onClick={() => save(suggested.id)}>
            Same as last time: {suggested.label}
          </button>
        )}
        {error && <div style={{ fontSize: 11.5, color: "var(--red)", marginTop: 2 }}>{error}</div>}
      </div>
      <div style={{ display: "grid", gap: 4, justifyItems: "end" }}>
        <span className="mono" style={{ fontSize: 14 }}>{fmt(bill.amount)}</span>
        <select
          aria-label={`Job for ${bill.vendor}`}
          defaultValue=""
          disabled={pending}
          onChange={(e) => save(e.target.value)}
          style={{ background: "var(--panel)", border: "1px solid var(--line2)", borderRadius: 10, color: "var(--text)", padding: "7px 8px", fontSize: 13, maxWidth: 210 }}
        >
          <option value="">Pick a job…</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
