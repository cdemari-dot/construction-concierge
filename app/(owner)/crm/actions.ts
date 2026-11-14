"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";
import { geocode } from "@/lib/geocode";
import type { BidStage } from "@/lib/types/database";

const STAGES: BidStage[] = ["lead", "estimating", "submitted", "won", "lost"];

export async function createBid(formData: FormData) {
  const user = await requireRole(["owner", "pm"]);
  const supabase = await createClient();
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new Error("Give the bid a name");
  const { error } = await supabase.from("bids").insert({
    company_id: user.profile.company_id,
    name,
    client_id: String(formData.get("client_id") || "") || null,
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
  const { error } = await supabase
    .from("bids")
    .update({ stage, stage_changed_at: new Date().toISOString(), lost_reason: stage === "lost" ? lostReason?.trim() || null : null })
    .eq("id", id);
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
