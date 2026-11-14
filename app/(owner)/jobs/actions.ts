"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

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

// Best-effort address lookup via OpenStreetMap Nominatim; a failure just
// means the job has no pin until coordinates are added.
async function geocode(address: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`, {
      headers: { "User-Agent": "ConstructionConcierge/1.0 (constructionconcierge.ai)" },
      signal: AbortSignal.timeout(5000),
    });
    const [hit] = (await res.json()) as { lat: string; lon: string }[];
    return hit ? [Number(hit.lat), Number(hit.lon)] : null;
  } catch {
    return null;
  }
}
