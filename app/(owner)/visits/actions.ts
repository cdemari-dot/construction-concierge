"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/session";

export async function createSiteVisit(formData: FormData) {
  const user = await requireRole(["owner", "pm"]);
  const supabase = await createClient();
  const title = String(formData.get("title") || "").trim();
  const visitOn = String(formData.get("visit_on") || "");
  if (!title) throw new Error("Give the visit a title");
  if (!visitOn) throw new Error("Pick a date");
  const { error } = await supabase.from("site_visits").insert({
    company_id: user.profile.company_id,
    title,
    bid_id: String(formData.get("bid_id") || "") || null,
    job_id: String(formData.get("job_id") || "") || null,
    address: String(formData.get("address") || "").trim() || null,
    visit_on: visitOn,
    start_time: String(formData.get("start_time") || "") || null,
    assigned_to: String(formData.get("assigned_to") || "") || null,
    notes: String(formData.get("notes") || "").trim() || null,
    created_by: user.profile.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/visits");
}

export async function setVisitStatus(id: string, status: "scheduled" | "done" | "cancelled") {
  await requireRole(["owner", "pm"]);
  const supabase = await createClient();
  const { error } = await supabase.from("site_visits").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/visits");
}

export async function deleteSiteVisit(id: string) {
  await requireRole(["owner", "pm"]);
  const supabase = await createClient();
  const { error } = await supabase.from("site_visits").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/visits");
}
