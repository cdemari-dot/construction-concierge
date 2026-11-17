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
