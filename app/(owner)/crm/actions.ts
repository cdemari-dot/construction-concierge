"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { sendBidFollowUp } from "@/lib/crm/followup";
import type { Bid } from "@/lib/types/database";
import { geocode } from "@/lib/geocode";
import type { BidStage } from "@/lib/types/database";

const STAGES: BidStage[] = ["lead", "estimating", "submitted", "won", "lost"];

export async function createBid(formData: FormData) {
  const user = await requireRole(["owner", "pm"]);
  const supabase = await createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Give the bid a name");
  const clientId = String(formData.get("client_id") || "") || null;
  let contactEmail = String(formData.get("contact_email") || "").trim() || null;
  if (!contactEmail && clientId) {
    const { data: c } = await supabase.from("clients").select("contact_email").eq("id", clientId).maybeSingle();
    contactEmail = c?.contact_email ?? null;
  }
  const { error } = await supabase.from("bids").insert({
    company_id: user.profile.company_id,
    name,
    client_id: clientId,
    contact_email: contactEmail,
    address: String(formData.get("address") || "").trim() || null,
    contact: String(formData.get("contact") || "").trim() || null,
    value: Number(formData.get("value") || 0) || 0,
    bid_due: String(formData.get("bid_due") || "") || null,
    follow_up_on: String(formData.get("follow_up_on") || "") || null,
    notes: String(formData.get("notes") || "").trim() || null,
    created_by: user.profile.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/crm");
  revalidatePath("/dashboard");
}

export async function moveBid(id: string, stage: BidStage, lostReason?: string) {
  await requireRole(["owner", "pm"]);
  if (!STAGES.includes(stage)) throw new Error("Unknown stage");
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data: cur } = await supabase.from("bids").select("stage, submitted_at").eq("id", id).single();
  const update: Record<string, unknown> = { stage, stage_changed_at: now, lost_reason: stage === "lost" ? lostReason?.trim() || null : null };
  // The conversion funnel counts a bid as "sent" once it reaches Bid sent (or Won).
  if ((stage === "submitted" || stage === "won") && !cur?.submitted_at) update.submitted_at = now;
  // Re-sending a bid restarts the follow-up sequence.
  if (stage === "submitted" && cur?.stage !== "submitted") {
    update.follow_up_count = 0;
    update.last_follow_up_at = null;
  }
  const { error } = await supabase.from("bids").update(update).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/crm");
  revalidatePath("/dashboard");
}

export async function setBidFollowUp(id: string, date: string | null) {
  await requireRole(["owner", "pm"]);
  const supabase = await createClient();
  const { error } = await supabase.from("bids").update({ follow_up_on: date || null }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/crm");
  revalidatePath("/dashboard");
}

export async function updateBidValue(id: string, value: number) {
  await requireRole(["owner", "pm"]);
  if (!Number.isFinite(value) || value < 0) throw new Error("Enter a valid amount");
  const supabase = await createClient();
  const { error } = await supabase.from("bids").update({ value }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/crm");
  revalidatePath("/dashboard");
}

// Won bid -> a real job, carrying over name, client, address and the bid value as contract value.
export async function createJobFromBid(bidId: string, jobNumber: string) {
  const user = await requireRole(["owner", "pm"]);
  const supabase = await createClient();
  const number = jobNumber.trim();
  if (!number) throw new Error("Enter a job number");

  const { data: bid, error: readError } = await supabase.from("bids").select("*").eq("id", bidId).single();
  if (readError || !bid) throw new Error(readError?.message ?? "Bid not found");
  if (bid.job_id) throw new Error("This bid already has a job");

  const found = bid.address ? await geocode(bid.address) : null;
  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      company_id: user.profile.company_id,
      job_number: number,
      name: bid.name,
      client_id: bid.client_id,
      address: bid.address,
      geofence_lat: found?.[0] ?? null,
      geofence_lon: found?.[1] ?? null,
      contract_value: bid.value,
    })
    .select("id")
    .single();
  if (error || !job) throw new Error(error?.message ?? "Could not create the job");

  const { error: linkError } = await supabase.from("bids").update({ job_id: job.id }).eq("id", bidId);
  if (linkError) throw new Error(linkError.message);
  revalidatePath("/crm");
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
}

export async function setBidEmail(id: string, email: string) {
  await requireRole(["owner", "pm"]);
  const clean = email.trim();
  if (clean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) throw new Error("That email address doesn't look right");
  const supabase = await createClient();
  const { error } = await supabase.from("bids").update({ contact_email: clean || null }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/crm");
}

export async function setAutoFollowUp(id: string, on: boolean) {
  await requireRole(["owner", "pm"]);
  const supabase = await createClient();
  const { error } = await supabase.from("bids").update({ auto_follow_up: on }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/crm");
}

// Manual "send the next follow-up now" (same email and counter as the automatic ones).
export async function sendFollowUpNow(id: string) {
  const user = await requireRole(["owner", "pm"]);
  const supabase = await createClient();
  const { data: bid, error } = await supabase.from("bids").select("*").eq("id", id).single();
  if (error || !bid) throw new Error(error?.message ?? "Bid not found");
  const { data: company } = await supabase.from("companies").select("name").eq("id", user.profile.company_id).single();
  const { data: auth } = await supabase.auth.getUser();
  const name = user.profile.full_name.includes("@") ? company?.name ?? "Our team" : user.profile.full_name;
  await sendBidFollowUp(supabase, bid as Bid, { company: company?.name ?? "Our team", senderName: name, replyTo: auth.user?.email ?? undefined, kind: "manual" });
  revalidatePath("/crm");
}
