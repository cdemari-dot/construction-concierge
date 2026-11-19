"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Pause, cancel or resume a company's access. Only platform admins pass the database check.
export async function setCompanyAccess(companyId: string, status: "active" | "paused" | "cancelled", note?: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_access", { p_company_id: companyId, p_status: status, p_note: note ?? null });
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}
