"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function addClient(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const supabase = await createClient();

  const { error } = await supabase.from("clients").insert({
    company_id: user.profile.company_id,
    name: String(formData.get("name")),
    contact_name: String(formData.get("contact_name") || "") || null,
    contact_email: String(formData.get("contact_email") || "") || null,
    contact_phone: String(formData.get("contact_phone") || "") || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/clients");
  revalidatePath("/jobs/new");
}
