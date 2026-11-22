"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { geocode } from "@/lib/geocode";

export async function createJob(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const supabase = await createClient();

  const clientId = String(formData.get("client_id") || "") || null;
  const foremanId = String(formData.get("foreman_id") || "") || null;
  const pmId = String(formData.get("pm_id") || "") || null;
  const geofenceLat = String(formData.get("geofence_lat") || "");
  const geofenceLon = String(formData.get("geofence_lon") || "");

  let lat = geofenceLat ? Number(geofenceLat) : null;
  let lon = geofenceLon ? Number(geofenceLon) : null;
  const address = String(formData.get("address") || "") || null;
  if ((lat == null || lon == null) && address) {
    const found = await geocode(address);
    if (found) [lat, lon] = found;
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      company_id: user.profile.company_id,
      job_number: String(formData.get("job_number")),
      name: String(formData.get("name")),
      client_id: clientId,
      address,
      geofence_lat: lat,
      geofence_lon: lon,
      contract_value: Number(formData.get("contract_value") || 0),
      foreman_id: foremanId,
      pm_id: pmId,
      start_date: String(formData.get("start_date") || "") || null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath("/jobs");
  revalidatePath("/dashboard");
  redirect(`/jobs/${job.id}`);
}

// Looks up a job's address, saves the coordinates on the job, and returns them (null if it can't be found).
export async function locateJob(jobId: string): Promise<{ lat: number; lon: number } | null> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const supabase = await createClient();
  const { data: job } = await supabase.from("jobs").select("address").eq("id", jobId).maybeSingle();
  const address = (job as { address: string | null } | null)?.address;
  if (!address) return null;
  const found = await geocode(address);
  if (!found) return null;
  const [lat, lon] = found;
  const { error } = await supabase.from("jobs").update({ geofence_lat: lat, geofence_lon: lon }).eq("id", jobId);
  if (error) return null;
  revalidatePath("/jobs");
  return { lat, lon };
}

// Who gets the PM copy of every signed T&M ticket on this job.
export async function setJobPm(jobId: string, pmId: string | null) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const supabase = await createClient();
  const { error } = await supabase.from("jobs").update({ pm_id: pmId || null }).eq("id", jobId);
  if (error) {
    if (/job_budgets|schema cache|does not exist/i.test(error.message)) {
      throw new Error("Budgets aren't set up yet: run migration 0024_job_budgets.sql in the Supabase SQL editor, then try again.");
    }
    throw new Error(error.message);
  }
  revalidatePath(`/jobs/${jobId}`);
}

export async function saveJobBudget(
  jobId: string,
  v: { budget_hours: number | null; hours_pct: number; budget_bins: number | null; bins_pct: number },
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  if (user.profile.role !== "owner" && user.profile.role !== "pm") throw new Error("Only the owner or PM can set budgets");
  const supabase = await createClient();
  const { error } = await supabase.from("job_budgets").upsert({
    job_id: jobId,
    company_id: user.profile.company_id,
    budget_hours: v.budget_hours,
    hours_pct: Math.min(200, Math.max(1, v.hours_pct)),
    budget_bins: v.budget_bins,
    bins_pct: Math.min(200, Math.max(1, v.bins_pct)),
    updated_at: new Date().toISOString(),
  });
  if (error) {
    if (/job_budgets|schema cache|does not exist/i.test(error.message)) {
      throw new Error("Budgets aren't set up yet: run migration 0024_job_budgets.sql in the Supabase SQL editor, then try again.");
    }
    throw new Error(error.message);
  }
  revalidatePath(`/jobs/${jobId}`);
}
