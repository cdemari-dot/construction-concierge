import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { PrintButton } from "@/components/ui/PrintButton";
import { LogoUpload } from "@/components/ui/LogoUpload";
import type { TimeEntry, TmLine, TmTicket } from "@/lib/types/database";

const TZ = "America/Toronto";
const hoursBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 3600000;
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-CA", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const longDate = (ymd: string) => new Date(`${ymd}T12:00:00`).toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const qty = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, ""));

// A printable, form-style T&M ticket. Quantities only, no prices or pay rates, so it is safe to hand to the GC.
// Header is co-branded: the company's own logo x Construction Concierge.
export default async function TmSheetPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const { ticketId } = await params;
  const me = await getCurrentUser();
  const supabase = await createClient();

  const { data: t } = await supabase.from("tm_tickets").select("*").eq("id", ticketId).maybeSingle();
  if (!t) notFound();
  const ticket = t as TmTicket;

  const [{ data: job }, { data: company }, { data: entries }, { data: people }, { data: allTickets }] = await Promise.all([
    supabase.from("jobs").select("job_number, name, address, client_id, foreman_id").eq("id", ticket.job_id).maybeSingle(),
    supabase.from("companies").select("*").eq("id", ticket.company_id).maybeSingle(),
    supabase
      .from("time_entries")
      .select("worker_id, clock_in_at, clock_out_at")
      .eq("job_id", ticket.job_id)
      .gte("clock_in_at", new Date(Date.parse(ticket.ticket_date) - 86400000).toISOString())
      .lte("clock_in_at", new Date(Date.parse(ticket.ticket_date) + 2 * 86400000).toISOString())
      .order("clock_in_at"),
    supabase.from("profiles").select("id, full_name, role"),
    supabase.from("tm_tickets").select("id, created_at").order("created_at"),
  ]);

  const jobRow = job as { job_number: string; name: string; address: string | null; client_id: string | null; foreman_id: string | null } | null;
  const { data: client } = jobRow?.client_id
    ? await supabase.from("clients").select("name, contact_name, contact_email, contact_phone").eq("id", jobRow.client_id).maybeSingle()
    : { data: null };
  const who = new Map(((people ?? []) as { id: string; full_name: string; role: string }[]).map((p) => [p.id, p]));
  const co = company as { name: string; logo_path?: string | null } | null;

  // Sequential ticket number per company, oldest first.
  const index = ((allTickets ?? []) as { id: string }[]).findIndex((x) => x.id === ticket.id);
  const ticketNo = `TM-${String((index < 0 ? 0 : index) + 1).padStart(4, "0")}`;

  const crew = ((entries ?? []) as Pick<TimeEntry, "worker_id" | "clock_in_at" | "clock_out_at">[]).filter(
    (e) => new Date(e.clock_in_at).toLocaleDateString("en-CA", { timeZone: TZ }) === ticket.ticket_date,
  );
  const done = crew.filter((e) => e.clock_out_at);
  const crewHours = done.reduce((s, e) => s + hoursBetween(e.clock_in_at, e.clock_out_at as string), 0);
  const heads = new Set(crew.map((e) => e.worker_id)).size;
  const first = crew[0]?.clock_in_at;
  const last = done.reduce<string | null>((m, e) => (!m || e.clock_out_at! > m ? e.clock_out_at : m), null);

  const [logo, sig, photos] = await Promise.all([
    co?.logo_path ? supabase.storage.from("company-logos").createSignedUrl(co.logo_path, 3600).then((r) => r.data?.signedUrl ?? null) : Promise.resolve(null),
    ticket.super_signature_path ? supabase.storage.from("signatures").createSignedUrl(ticket.super_signature_path, 3600).then((r) => r.data?.signedUrl ?? null) : Promise.resolve(null),
    Promise.all((ticket.photo_paths ?? []).map(async (p) => (await supabase.storage.from("tm-ticket-photos").createSignedUrl(p, 3600)).data?.signedUrl ?? null)),
  ]);

  const signedAt = ticket.signed_at ? new Date(ticket.signed_at).toLocaleString("en-CA", { timeZone: TZ, dateStyle: "long", timeStyle: "short" }) : null;
  const preparedBy = ticket.created_by ? who.get(ticket.created_by)?.full_name : null;
  const foreman = jobRow?.foreman_id ? who.get(jobRow.foreman_id)?.full_name : null;
  const equipment = (ticket.equipment ?? []) as TmLine[];
  const materials = (ticket.materials ?? []) as TmLine[];
  const generated = new Date().toLocaleString("en-CA", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });
  const canEditLogo = me && (me.profile.role === "owner" || me.profile.role === "pm");

  const Field = ({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) => (
    <div className={`tm-cell${wide ? " wide" : ""}`}>
      <small>{label}</small>
      <b>{children || "—"}</b>
    </div>
  );

  const LineTable = ({ rows, empty }: { rows: TmLine[]; empty: string }) =>
    rows.length === 0 ? (
      <p className="tm-muted">{empty}</p>
    ) : (
      <table className="tm-table">
        <thead>
          <tr>
            <th style={{ width: 34 }}>#</th>
            <th>Description</th>
            <th style={{ textAlign: "right", width: 90 }}>Quantity</th>
            <th style={{ width: 80 }}>Unit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{r.item}</td>
              <td style={{ textAlign: "right" }}>{qty(r.qty)}</td>
              <td>{r.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );

  return (
    <div>
      <div className="no-print" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <Link href="/field-reports?tab=tm" className="cc-btn ghost sm">
          ← T&amp;M tickets
        </Link>
        <PrintButton />
        {canEditLogo && <LogoUpload companyId={ticket.company_id} hasLogo={!!logo} />}
        <span style={{ color: "var(--mute)", fontSize: 12 }}>In the print window you can also choose “Save as PDF”.</span>
      </div>

      <article className="tm-sheet">
        <header className="tm-letterhead">
          <div className="tm-brand">
            {logo ? (
              // Signed URL from private storage, not a static asset.
              // eslint-disable-next-line @next/next/no-img-element
              <img className="tm-logo" src={logo} alt={co?.name ?? "Company logo"} />
            ) : (
              <div className="tm-wordmark">{co?.name ?? "Contractor"}</div>
            )}
            <span className="tm-cc-text">Construction Concierge</span>
          </div>
          <div className="tm-ref">
            <div className="tm-no">{ticketNo}</div>
            <div className="tm-muted">{longDate(ticket.ticket_date)}</div>
          </div>
        </header>

        <div className="tm-titlebar">
          <h1>Time &amp; Material Ticket</h1>
          <span className="tm-status">{ticket.status.replaceAll("_", " ")}</span>
        </div>

        <section className="tm-info">
          <Field label="Project">{jobRow ? `${jobRow.job_number} · ${jobRow.name}` : ""}</Field>
          <Field label="Ticket date">{ticket.ticket_date}</Field>
          <Field label="Site address">{jobRow?.address}</Field>
          <Field label="Area / location on site">{ticket.work_area}</Field>
          <Field label="Client">{(client as { name: string } | null)?.name}</Field>
          <Field label="Client contact">
            {[(client as { contact_name?: string } | null)?.contact_name, (client as { contact_phone?: string } | null)?.contact_phone].filter(Boolean).join(" · ")}
          </Field>
          <Field label="Foreman on job">{foreman}</Field>
          <Field label="Prepared by">{preparedBy}</Field>
          <Field label="Time on site">{first ? `${clock(first)} – ${last ? clock(last) : "ongoing"}` : ""}</Field>
          <Field label="Crew / person-hours">{crew.length ? `${heads} ${heads === 1 ? "person" : "people"} · ${crewHours.toFixed(2)} h` : ""}</Field>
        </section>

        <h2>Description of work performed</h2>
        <div className="tm-desc">{ticket.work_description?.trim() || <span className="tm-muted">No description recorded.</span>}</div>

        <h2>Labour</h2>
        {crew.length === 0 ? (
          <p className="tm-muted">No clock-ins recorded for this job on this date. Hours on ticket: {ticket.hours} h.</p>
        ) : (
          <table className="tm-table">
            <thead>
              <tr>
                <th style={{ width: 34 }}>#</th>
                <th>Name</th>
                <th>Classification</th>
                <th>Start</th>
                <th>Finish</th>
                <th style={{ textAlign: "right" }}>Hours</th>
              </tr>
            </thead>
            <tbody>
              {crew.map((e, i) => (
                <tr key={i}>
                  <td>{i + 1}</td>
                  <td>{who.get(e.worker_id)?.full_name ?? "—"}</td>
                  <td>{who.get(e.worker_id)?.role === "foreman" ? "Foreman" : "Labourer"}</td>
                  <td>{clock(e.clock_in_at)}</td>
                  <td>{e.clock_out_at ? clock(e.clock_out_at) : "on site"}</td>
                  <td style={{ textAlign: "right" }}>{e.clock_out_at ? hoursBetween(e.clock_in_at, e.clock_out_at).toFixed(2) : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}>Total labour hours</td>
                <td style={{ textAlign: "right" }}>{crewHours.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        )}

        <h2>Equipment used</h2>
        <LineTable rows={equipment} empty="None recorded." />

        <h2>Materials used</h2>
        <LineTable rows={materials} empty="None recorded." />

        {photos.some(Boolean) && (
          <>
            <h2>Photo record ({photos.filter(Boolean).length})</h2>
            <div className="tm-photos">
              {photos.map((u, i) =>
                u ? (
                  <figure key={i}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={u} alt={`Photo ${i + 1}`} />
                    <figcaption>
                      Photo {i + 1} of {photos.length} · {ticket.ticket_date}
                    </figcaption>
                  </figure>
                ) : null,
              )}
            </div>
          </>
        )}

        <h2>Authorization</h2>
        <p className="tm-clause">
          The undersigned confirms that the labour, equipment and materials listed above were supplied on the date shown, at the request of the client, and
          authorizes them to be billed as time and material.
        </p>
        <section className="tm-sign">
          <div>
            <div className="tm-sigbox">
              {sig ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sig} alt="Client signature" />
              ) : null}
            </div>
            <small>Client representative</small>
            <b>{ticket.super_name || "—"}</b>
            {ticket.super_email && <div className="tm-muted">{ticket.super_email}</div>}
            <div className="tm-muted">{signedAt ? `Signed ${signedAt}` : "Not yet signed"}</div>
          </div>
          <div>
            <div className="tm-sigbox" />
            <small>Contractor representative</small>
            <b>{preparedBy ?? "—"}</b>
            <div className="tm-muted">{co?.name}</div>
            <div className="tm-muted">Date: ____________________</div>
          </div>
        </section>

        <footer className="tm-foot">
          <span>
            {co?.name} · {ticketNo} · Ref {ticket.id.slice(0, 8).toUpperCase()}
          </span>
          <span>Generated {generated} with Construction Concierge</span>
        </footer>
      </article>
    </div>
  );
}
