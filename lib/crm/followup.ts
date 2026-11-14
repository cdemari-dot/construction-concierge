import type { SupabaseClient } from "@supabase/supabase-js";
import { emailConfigured, senderAddress, sendEmail } from "@/lib/email/send";
import type { Bid } from "@/lib/types/database";

// Days after the bid was sent when each automatic follow-up goes out. Three, then it stops.
export const FOLLOW_UP_DAYS = [3, 7, 14];

const esc = (v: string) => v.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;");

export function daysSince(iso: string, now = Date.now()): number {
  return (now - new Date(iso).getTime()) / 86400000;
}

// Next automatic follow-up is due when the bid has been out long enough for its next step.
export function isFollowUpDue(b: Bid, now = Date.now()): boolean {
  return (
    b.stage === "submitted" &&
    b.auto_follow_up &&
    !!b.contact_email &&
    b.follow_up_count < FOLLOW_UP_DAYS.length &&
    daysSince(b.submitted_at ?? b.stage_changed_at, now) >= FOLLOW_UP_DAYS[b.follow_up_count]
  );
}

export function nextFollowUpInDays(b: Bid, now = Date.now()): number | null {
  if (b.stage !== "submitted" || !b.auto_follow_up || !b.contact_email || b.follow_up_count >= FOLLOW_UP_DAYS.length) return null;
  return Math.max(0, Math.ceil(FOLLOW_UP_DAYS[b.follow_up_count] - daysSince(b.submitted_at ?? b.stage_changed_at, now)));
}

function template(bid: Bid, n: number, company: string, senderName: string) {
  const first = (bid.contact ?? "").split(/\s+/)[0] || "there";
  const sent = new Date(bid.submitted_at ?? bid.stage_changed_at).toLocaleDateString("en-CA", { month: "long", day: "numeric", timeZone: "America/Toronto" });
  const intro = [
    `I wanted to follow up on the bid we sent on ${sent} for <b>${esc(bid.name)}</b>. Did it come through okay, and do you have any questions on the scope or numbers?`,
    `Just checking in on our bid for <b>${esc(bid.name)}</b>. If anything needs adjusting, whether scope, schedule or pricing, tell me and I'll turn it around quickly.`,
    `One last note on our bid for <b>${esc(bid.name)}</b>. If it's gone another direction, no problem, and I'd appreciate a quick heads-up. If it's still live, we'd love the chance to get started.`,
  ][Math.min(n, 2)];
  const subject = n === 0 ? `Following up: ${bid.name}` : n === 1 ? `Checking in on ${bid.name}` : `Last note on ${bid.name}`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#222;max-width:560px">
<p>Hi ${esc(first)},</p><p>${intro}</p><p>Thanks,<br>${esc(senderName)}<br>${esc(company)}</p></div>`;
  return { subject, html };
}

export interface FollowUpContext {
  company: string;
  senderName: string;
  replyTo?: string;
  kind: "auto" | "manual";
}

// Sends the next follow-up for this bid, logs it, and advances the counter. Works with a
// user-scoped client (manual button) or the service-role client (daily cron).
export async function sendBidFollowUp(supabase: SupabaseClient, bid: Bid, ctx: FollowUpContext): Promise<void> {
  if (!emailConfigured()) throw new Error("Email is not set up yet (RESEND_API_KEY / EMAIL_FROM missing).");
  if (!bid.contact_email) throw new Error("This bid has no contact email.");

  const n = Math.min(bid.follow_up_count, FOLLOW_UP_DAYS.length - 1);
  const { subject, html } = template(bid, n, ctx.company, ctx.senderName);
  const from = `${ctx.company} <${senderAddress()}>`;

  let status: "sent" | "failed" = "sent";
  let error: string | null = null;
  try {
    await sendEmail({ from, to: [bid.contact_email], cc: ctx.replyTo ? [ctx.replyTo] : undefined, replyTo: ctx.replyTo, subject, html });
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : "send failed";
  }

  await supabase.from("bid_follow_ups").insert({
    company_id: bid.company_id,
    bid_id: bid.id,
    to_email: bid.contact_email,
    subject,
    kind: ctx.kind,
    status,
    error,
  });
  if (status === "failed") throw new Error(error ?? "Follow-up failed");

  const { error: upError } = await supabase
    .from("bids")
    .update({ follow_up_count: bid.follow_up_count + 1, last_follow_up_at: new Date().toISOString() })
    .eq("id", bid.id);
  if (upError) throw new Error(upError.message);
}
