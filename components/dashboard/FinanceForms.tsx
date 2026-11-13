"use client";

import { useRef, useTransition } from "react";
import { addBill, addInvoice, markBillPaid, markInvoicePaid } from "@/app/(owner)/finance/actions";
import type { Job } from "@/lib/types/database";

const inputStyle: React.CSSProperties = {
  background: "var(--panel)",
  border: "1px solid var(--line2)",
  borderRadius: 10,
  color: "var(--text)",
  padding: "9px 10px",
  fontSize: 13.5,
  width: "100%",
};

export function AddInvoiceForm({ jobs }: { jobs: Job[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="cc-card"
      style={{ display: "grid", gap: 8 }}
      action={(formData) =>
        startTransition(async () => {
          await addInvoice(formData);
          formRef.current?.reset();
        })
      }
    >
      <h3 style={{ fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--mute)" }}>
        New invoice (AR)
      </h3>
      <select name="job_id" required style={inputStyle} defaultValue="">
        <option value="" disabled>
          Job
        </option>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.job_number} · {j.name}
          </option>
        ))}
      </select>
      <input name="invoice_number" placeholder="Invoice # (e.g. INV-1001)" required style={inputStyle} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input name="subtotal" type="number" step="0.01" placeholder="Subtotal" required style={inputStyle} />
        <input name="hst_amount" type="number" step="0.01" placeholder="HST" style={inputStyle} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input name="holdback_amount" type="number" step="0.01" placeholder="Holdback" style={inputStyle} />
        <input name="due_at" type="date" style={inputStyle} />
      </div>
      <button className="cc-btn lime sm" type="submit" disabled={pending} style={{ justifySelf: "start" }}>
        {pending ? "Adding…" : "Add invoice"}
      </button>
    </form>
  );
}

export function AddBillForm({ jobs }: { jobs: Job[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="cc-card"
      style={{ display: "grid", gap: 8 }}
      action={(formData) =>
        startTransition(async () => {
          await addBill(formData);
          formRef.current?.reset();
        })
      }
    >
      <h3 style={{ fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase", color: "var(--mute)" }}>New bill (AP)</h3>
      <input name="vendor_name" placeholder="Vendor" required style={inputStyle} />
      <input name="description" placeholder="Description (optional)" style={inputStyle} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <input name="amount" type="number" step="0.01" placeholder="Amount" required style={inputStyle} />
        <input name="due_date" type="date" style={inputStyle} />
      </div>
      <select name="job_id" style={inputStyle} defaultValue="">
        <option value="">Company overhead (no job)</option>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.job_number} · {j.name}
          </option>
        ))}
      </select>
      <button className="cc-btn lime sm" type="submit" disabled={pending} style={{ justifySelf: "start" }}>
        {pending ? "Adding…" : "Add bill"}
      </button>
    </form>
  );
}

export function MarkInvoicePaidButton({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button className="cc-btn ghost sm" disabled={pending} onClick={() => startTransition(() => markInvoicePaid(invoiceId))} type="button">
      Mark paid
    </button>
  );
}

export function MarkBillPaidButton({ billId }: { billId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button className="cc-btn ghost sm" disabled={pending} onClick={() => startTransition(() => markBillPaid(billId))} type="button">
      Mark paid
    </button>
  );
}
