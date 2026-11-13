"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function approveHours(periodStart: string, periodEnd: string) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("time_entries")
    .update({ payroll_status: "approved", approved_at: new Date().toISOString(), approved_by: user.profile.id })
    .eq("payroll_status", "pending")
    .not("clock_out_at", "is", null)
    .gte("clock_in_at", periodStart)
    .lt("clock_in_at", periodEnd);

  if (error) throw new Error(error.message);
  revalidatePath("/payroll-export");
}
