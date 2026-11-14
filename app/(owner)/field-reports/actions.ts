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
}

const esc = (v: string) =>
  v.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;");

// Emails the signed T&M ticket to the GC super (via Resend). Sent from the app's
// address, Reply-To the signed-in user, and the user is CC'd so they keep a copy.
export async function emailTmTicket(id: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Email is not set up yet (RESEND_API_KEY / EMAIL_FROM missing).");

  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const replyTo = authData.user?.email;

  const { data: t, error } = await supabase.from("tm_tickets").select("*").eq("id", id).single();
  if (error || !t) throw new Error(error?.message ?? "Ticket not found");
  if (!t.super_email) throw new Error("This ticket has no superintendent email.");
  if (!t.super_signature_path) throw new Error("Ticket is not signed yet.");

  const [{ data: job }, { data: company }, { data: file, error: dlError }] = await Promise.all([
    supabase.from("jobs").select("job_number, name, address").eq("id", t.job_id).single(),
    supabase.from("companies").select("name").eq("id", t.company_id).single(),
    supabase.storage.from("signatures").download(t.super_signature_path),
  ]);
  if (dlError || !file) throw new Error(`Could not load signature: ${dlError?.message ?? "missing"}`);
  const sigBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const companyName = company?.name ?? "Your contractor";
  const jobLine = job ? `${job.job_number} · ${job.name}` : "Job";
  const total = Number(t.equipment_cost) + Number(t.materials_cost);
  const signedAt = t.signed_at
    ? ` on ${esc(new Date(t.signed_at).toLocaleString("en-CA", { timeZone: "America/Toronto" }))}`
    : "";
  const cell = "padding:6px 0;border-bottom:1px solid #ddd";
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px">
<h2 style="margin:0 0 4px">T&amp;M Ticket — ${esc(companyName)}</h2>
<p style="color:#555;margin:0 0 16px">${esc(jobLine)}${job?.address ? ` · ${esc(job.address)}` : ""}<br>Date: ${esc(t.ticket_date)}</p>
<table style="border-collapse:collapse;width:100%">
<tr><td style="${cell}">Labour hours</td><td style="text-align:right;${cell}">${t.hours} h</td></tr>
<tr><td style="${cell}">Equipment</td><td style="text-align:right;${cell}">$${Number(t.equipment_cost).toFixed(2)}</td></tr>
<tr><td style="${cell}">Materials</td><td style="text-align:right;${cell}">$${Number(t.materials_cost).toFixed(2)}</td></tr>
<tr><td style="padding:6px 0"><b>Equipment + materials</b></td><td style="text-align:right"><b>$${total.toFixed(2)}</b></td></tr>
</table>
<p style="margin:16px 0 4px">Signed by <b>${esc(t.super_name)}</b>${signedAt}.</p>
<p style="color:#555;font-size:13px">Signature image attached. Reply to this email with any questions.</p></div>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [t.super_email],
      cc: replyTo ? [replyTo] : undefined,
      reply_to: replyTo,
      subject: `T&M ticket ${t.ticket_date} — ${jobLine} — ${companyName}`,
      html,
      attachments: [{ filename: "signature.png", content: sigBase64 }],
    }),
  });
  if (!res.ok) throw new Error(`Email failed (${res.status}): ${(await res.text()).slice(0, 200)}`);

  if (t.status === "signed") await supabase.from("tm_tickets").update({ status: "sent_to_gc" }).eq("id", id);
  revalidatePath("/field-reports");
}
