"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { TmTicketStatus } from "@/lib/types/database";

export async function closeIncident(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const supabase = await createClient();
  const { error } = await supabase
    .from("incident_reports")
    .update({ status: "closed", closed_by: user.profile.id, closed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/field-reports");
}

// Field extra -> pending change order (PM prices it on /change-orders).
export async function extraToChangeOrder(extraId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const supabase = await createClient();

  const { data: extra, error: readError } = await supabase.from("extras").select("*").eq("id", extraId).single();
  if (readError || !extra) throw new Error(readError?.message ?? "Extra not found");
  if (extra.change_order_id) throw new Error("Already converted");

  const detail = [extra.hours ? `${extra.hours} h` : null, extra.materials_cost ? `$${extra.materials_cost} materials` : null, extra.authorized_by ? `authorized by ${extra.authorized_by}` : null]
    .filter(Boolean)
    .join(", ");

  const { data: co, error } = await supabase
    .from("change_orders")
    .insert({
      company_id: extra.company_id,
      job_id: extra.job_id,
      description: detail ? `${extra.description} (${detail})` : extra.description,
      amount: 0,
      status: "pending",
      source_extra_id: extra.id,
      created_by: user.profile.id,
    })
    .select("id")
    .single();
  if (error || !co) throw new Error(error?.message ?? "Could not create change order");

  const { error: linkError } = await supabase.from("extras").update({ change_order_id: co.id, status: "priced" }).eq("id", extra.id);
  if (linkError) throw new Error(linkError.message);
  revalidatePath("/field-reports");
  revalidatePath("/change-orders");
}

export async function setTmStatus(id: string, status: TmTicketStatus) {
  const supabase = await createClient();
  const { error } = await supabase.from("tm_tickets").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/field-reports");
  revalidatePath("/dashboard");
}

const esc = (v: string) =>
  v.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;");

// Emails the signed T&M ticket to the GC super (via Resend). Sent from the app's
// address, Reply-To the signed-in user, and the user is CC'd so they keep a copy.
export async function emailTmTicket(id: string): Promise<string> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "Construction Concierge <hello@constructionconcierge.ai>";
  if (!apiKey) throw new Error("Email is not set up yet (RESEND_API_KEY missing).");

  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const supabase = await createClient();

  const { data: t, error } = await supabase.from("tm_tickets").select("*").eq("id", id).single();
  if (error || !t) throw new Error(error?.message ?? "Ticket not found");
  if (!t.super_signature_path) throw new Error("Ticket is not signed yet.");

  const [{ data: job }, { data: company }, { data: file, error: dlError }] = await Promise.all([
    supabase.from("jobs").select("job_number, name, address, pm_id, client_id").eq("id", t.job_id).single(),
    supabase.from("companies").select("name").eq("id", t.company_id).single(),
    supabase.storage.from("signatures").download(t.super_signature_path),
  ]);
  if (dlError || !file) throw new Error(`Could not load signature: ${dlError?.message ?? "missing"}`);
  const sigBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const photoFiles: { filename: string; content: string }[] = [];
  for (const [i, path] of ((t.photo_paths ?? []) as string[]).entries()) {
    const { data: ph } = await supabase.storage.from("tm-ticket-photos").download(path);
    if (ph) photoFiles.push({ filename: `photo-${i + 1}.jpg`, content: Buffer.from(await ph.arrayBuffer()).toString("base64") });
  }

  const companyName = company?.name ?? "Your contractor";
  const jobLine = job ? `${job.job_number} · ${job.name}` : "Job";
  const signedAt = t.signed_at
    ? ` on ${esc(new Date(t.signed_at).toLocaleString("en-CA", { timeZone: "America/Toronto" }))}`
    : "";
  const cell = "padding:6px 0;border-bottom:1px solid #ddd";
  const lineRows = (label: string, rows: unknown) =>
    Array.isArray(rows)
      ? (rows as { item: string; qty: number; unit: string }[])
          .map((r) => `<tr><td style="${cell}">${label}: ${esc(String(r.item))}</td><td style="text-align:right;${cell}">${esc(String(r.qty))} ${esc(String(r.unit))}</td></tr>`)
          .join("")
      : "";
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
<h2 style="margin:0 0 4px">T&amp;M Ticket — ${esc(companyName)}</h2>
<p style="color:#555;margin:0 0 16px">${esc(jobLine)}${job?.address ? ` · ${esc(job.address)}` : ""}<br>Date: ${esc(t.ticket_date)}</p>
<table style="border-collapse:collapse;width:100%">
<tr><td style="${cell}">Labour hours</td><td style="text-align:right;${cell}">${t.hours} h</td></tr>
${t.work_area ? `<tr><td style="${cell}">Area</td><td style="text-align:right;${cell}">${esc(String(t.work_area))}</td></tr>` : ""}
${lineRows("Equipment", t.equipment)}${lineRows("Materials", t.materials)}<tr><td style="padding:6px 0">Photos attached</td><td style="text-align:right">${photoFiles.length}</td></tr>
</table>
${t.work_description ? `<p style="margin:16px 0 4px"><b>Work performed</b><br>${esc(String(t.work_description)).replace(/\n/g, "<br>")}</p>` : ""}
<p style="margin:16px 0 4px">Signed by <b>${esc(t.super_name)}</b>${signedAt}.</p>
<p style="color:#555;font-size:13px">Signature and photos attached. Reply to this email with any questions.</p></div>`;

  // Who gets the two copies: the client (super's email on the ticket, else the client's contact
  // email) and the PM designated on the job (else the company owner).
  let clientEmail: string | null = t.super_email || null;
  if (!clientEmail && job?.client_id) {
    const { data: cl } = await supabase.from("clients").select("contact_email").eq("id", job.client_id).maybeSingle();
    clientEmail = (cl as { contact_email: string | null } | null)?.contact_email ?? null;
  }
  let pmEmail: string | null = null;
  if (job?.pm_id) {
    const { data: pm } = await supabase.from("profiles").select("email").eq("id", job.pm_id).maybeSingle();
    pmEmail = (pm as { email: string | null } | null)?.email ?? null;
  }
  if (!pmEmail) {
    const { data: owners } = await supabase.from("profiles").select("email").eq("role", "owner").eq("status", "active").not("email", "is", null).limit(1);
    pmEmail = (owners?.[0] as { email: string | null } | undefined)?.email ?? null;
  }
  if (!clientEmail && !pmEmail) throw new Error("No client email on the ticket and no PM or owner email to send to.");

  const attachments = [{ filename: "signature.png", content: sigBase64 }, ...photoFiles];
  const subject = `T&M ticket ${t.ticket_date} — ${jobLine} — ${companyName}`;
  const send = async (to: string, replyTo: string | null | undefined, subj: string, body: string) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], reply_to: replyTo ?? undefined, subject: subj, html: body, attachments }),
    });
    if (!res.ok) throw new Error(`Email to ${to} failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  };

  const sent: string[] = [];
  if (clientEmail) {
    await send(clientEmail, pmEmail, subject, html);
    sent.push("client");
    if (t.status === "signed") await supabase.from("tm_tickets").update({ status: "sent_to_gc" }).eq("id", id);
  }
  if (pmEmail) {
    await send(pmEmail, pmEmail, `PM copy: ${subject}`, `<p style="font-family:Arial,sans-serif;color:#555">Copy for the PM. ${clientEmail ? "The client has received the same ticket." : "No client email was on this ticket, so it was not sent to the client."}</p>${html}`);
    sent.push("PM");
  }
  revalidatePath("/field-reports");
  revalidatePath("/dashboard");
  return `Sent to ${sent.join(" and ")}.${clientEmail ? "" : " (No client email on this ticket.)"}`;
}

export async function resendTmTicket(id: string): Promise<void> {
  await emailTmTicket(id);
}

// Saves the path of the company logo the browser just uploaded to the private "company-logos" bucket.
export async function setCompanyLogo(path: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  if (user.profile.role !== "owner" && user.profile.role !== "pm") throw new Error("Only the owner or a PM can change the logo.");
  if (!path.startsWith(`${user.profile.company_id}/`)) throw new Error("Bad logo path.");
  const supabase = await createClient();
  const { error } = await supabase.from("companies").update({ logo_path: path }).eq("id", user.profile.company_id);
  if (error) throw new Error(error.message);
  revalidatePath("/field-reports");
}
