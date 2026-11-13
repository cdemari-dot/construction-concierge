import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SetupBanner } from "@/components/ui/SetupBanner";
import { Tag } from "@/components/ui/Tag";
import { fmt, fmtDate } from "@/lib/format";
import type { Bill, Invoice } from "@/lib/types/database";

export default async function FinancePage() {
  if (!isSupabaseConfigured) return <SetupBanner />;

  const supabase = await createClient();
  const [{ data: invoices }, { data: bills }] = await Promise.all([
    supabase.from("invoices").select("*").order("issued_at", { ascending: false }),
    supabase.from("bills").select("*").order("due_date", { ascending: true }),
  ]);

  const invoiceList = (invoices ?? []) as Invoice[];
  const billList = (bills ?? []) as Bill[];

  return (
    <div>
      <h1 className="display" style={{ fontSize: 22, marginBottom: 16 }}>
        Finance &amp; Cash
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <section className="cc-card">
          <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>
            Accounts receivable
          </h3>
          <div style={{ display: "grid", gap: 8 }}>
            {invoiceList.map((inv) => (
              <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 8, fontSize: 13 }}>
                <div>
                  <b>{inv.invoice_number}</b>
                  <div style={{ color: "var(--mute)", fontSize: 11.5 }}>due {fmtDate(inv.due_at)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono">{fmt(inv.total_amount)}</div>
                  <Tag color={inv.status === "paid" ? "lime" : inv.status === "overdue" ? "red" : "amber"}>{inv.status}</Tag>
                </div>
              </div>
            ))}
            {invoiceList.length === 0 && <div style={{ color: "var(--mute)", fontSize: 13 }}>No invoices yet.</div>}
          </div>
        </section>

        <section className="cc-card">
          <h3 style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: "uppercase", color: "var(--mute)", marginBottom: 12 }}>
            Accounts payable
          </h3>
          <div style={{ display: "grid", gap: 8 }}>
            {billList.map((b) => (
              <div key={b.id} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 8, fontSize: 13 }}>
                <div>
                  <b>{b.vendor_name}</b>
                  <div style={{ color: "var(--mute)", fontSize: 11.5 }}>due {fmtDate(b.due_date)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="mono">{fmt(b.amount)}</div>
                  <Tag color={b.status === "paid" ? "lime" : "amber"}>{b.status}</Tag>
                </div>
              </div>
            ))}
            {billList.length === 0 && <div style={{ color: "var(--mute)", fontSize: 13 }}>No bills yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}
