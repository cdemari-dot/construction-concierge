import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "@/components/ui/PrintButton";
import type { Job, TimeEntry, TmTicket } from "@/lib/types/database";

const TZ = "America/Toronto";
const hoursBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 3600000;
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-CA", { timeZone: TZ, hour: "numeric", minute: "2-digit" });

// A printable T&M sheet: job, date, who worked and for how long, photos, and the super's signature.
// Quantities only, no prices. Print or "Save as PDF" from the browser.
export default async function TmSheetPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const supabase = await createClient();

  const { data: t } = await supabase.from("tm_tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!t) notFound();
  const ticket = t as TmTicket;

  const [{ data: job }, { data: company }, { data: entries }, { data: people }] = await Promise.all([
    supabase.from("jobs").select("job_number, name, address").eq("id", ticket.job_id).maybeSingle(),
    supabase.from("companies").select("name").eq("id", ticket.company_id).maybeSingle(),
    supabase
      .from("time_entries")
      .select("worker_id, clock_in_at, clock_out_at")
      .eq("job_id", ticket.job_id)
      .gte("clock_in_at", new Date(Date.parse(ticket.ticket_date) - 86400000).toISOString())
      .lte("clock_in_at", new Date(Date.parse(ticket.ticket_date) + 2 * 86400000).toISOString())
      .order("clock_in_at"),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const jobRow = job as Pick<Job, "job_number" | "name" | "address"> | null;
  const name = new Map(((people ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));

  // Shifts that started on the ticket's date, Toronto time.
  const crew = ((entries ?? []) as Pick<TimeEntry, "worker_id" | "clock_in_at" | "clock_out_at">[]).filter(
    (e) => new Date(e.clock_in_at).toLocaleDateString("en-CA", { timeZone: TZ }) === ticket.ticket_date,
  );
  const crewHours = crew.reduce((s, e) => s + (e.clock_out_at ? hoursBetween(e.clock_in_at, e.clock_out_at) : 0), 0);

  const sig = ticket.super_signature_path ? (await supabase.storage.from("signatures").createSignedUrl(ticket.super_signature_path, 3600)).data?.signedUrl ?? null : null;
  const photos = await Promise.all(
    (ticket.photo_paths ?? []).map(async (p) => (await supabase.storage.from("tm-ticket-photos").createSignedUrl(p, 3600)).data?.signedUrl ?? null),
  );
  const signedAt = ticket.signed_at ? new Date(ticket.signed_at).toLocaleString("en-CA", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" }) : null;

  return (
    <div>
      <div className="no-print" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <Link href="/field-reports?tab=tm" className="cc-btn ghost sm">
          ← T&amp;M tickets
        </Link>
        <PrintButton />
        <span style={{ color: "var(--mute)", fontSize: 12 }}>In the print window you can also choose “Save as PDF”.</span>
      </div>

      <article className="tm-sheet">
        <header className="tm-head">
          <div>
            <div className="tm-co">{(company as { name: string } | null)?.name ?? "Contractor"}</div>
            <h1>Time &amp; Material Ticket</h1>
          </div>
          <div className="tm-status">{ticket.status.replaceAll("_", " ").toUpperCase()}</div>
        </header>

        <section className="tm-grid">
          <div>
            <small>Job</small>
            <b>{jobRow ? `${jobRow.job_number} · ${jobRow.name}` : "—"}</b>
          </div>
          <div>
            <small>Date</small>
            <b>{ticket.ticket_date}</b>
          </div>
          <div>
            <small>Site address</small>
            <b>{jobRow?.address ?? "—"}</b>
          </div>
          <div>
            <small>Total hours on ticket</small>
            <b>{ticket.hours} h</b>
          </div>
        </section>

        <h2>Crew on site</h2>
        {crew.length === 0 ? (
          <p className="tm-muted">No clock-ins recorded for this job on this date.</p>
        ) : (
          <table className="tm-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>In</th>
                <th>Out</th>
                <th style={{ textAlign: "right" }}>Hours</th>
              </tr>
            </thead>
            <tbody>
              {crew.map((e, i) => (
                <tr key={i}>
                  <td>{name.get(e.worker_id) ?? "—"}</td>
                  <td>{clock(e.clock_in_at)}</td>
                  <td>{e.clock_out_at ? clock(e.clock_out_at) : "still on site"}</td>
                  <td style={{ textAlign: "right" }}>{e.clock_out_at ? hoursBetween(e.clock_in_at, e.clock_out_at).toFixed(2) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Total clocked</td>
                <td style={{ textAlign: "right" }}>{crewHours.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        {photos.length > 0 && (
          <>
            <h2>Photos of the work ({photos.length})</h2>
            <div className="tm-photos">
              {photos.map((u, i) =>
                u ? (
                  // Signed URL from private storage, not a static asset.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={u} alt={`Photo ${i + 1}`} />
                ) : null,
              )}
            </div>
          </>
        )}

        <h2>Sign-off</h2>
        <section className="tm-sign">
          <div>
            <small>Superintendent</small>
            <b>{ticket.super_name || "—"}</b>
            {ticket.super_email && <div className="tm-muted">{ticket.super_email}</div>}
            {signedAt ? <div className="tm-muted">Signed {signedAt}</div> : <div className="tm-muted">Not signed yet</div>}
          </div>
          <div className="tm-sigbox">
            {sig ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sig} alt="Superintendent signature" />
            ) : (
              <span className="tm-muted">Signature</span>
            )}
          </div>
        </section>
      </article>
    </div>
  );
}
