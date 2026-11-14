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
