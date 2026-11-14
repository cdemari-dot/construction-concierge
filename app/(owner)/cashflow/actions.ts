"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function updateAssumptions(formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");

  const num = (key: string) => Number(formData.get(key) ?? 0);

  const { error } = await supabase
    .from("cash_flow_assumptions")
    .update({
      overhead_monthly: num("overhead_monthly"),
      payroll_per_period: num("payroll_per_period"),
      payroll_frequency: formData.get("payroll_frequency"),
      hst_reserve_pct: num("hst_reserve_pct"),
      tax_reserve_pct: num("tax_reserve_pct"),
      equipment_reserve_pct: num("equipment_reserve_pct"),
      profit_allocation_pct: num("profit_allocation_pct"),
      revenue_target_annual: num("revenue_target_annual"),
      gross_margin_target: num("gross_margin_target"),
      updated_by: user.profile.id,
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", user.profile.company_id);

  if (error) throw new Error(error.message);
  revalidatePath("/finance");
  revalidatePath("/scale");
  revalidatePath("/dashboard");
}

export async function addCashSnapshot(formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase.from("cash_snapshots").upsert(
    {
      company_id: user.profile.company_id,
      as_of_date: String(formData.get("as_of_date")),
      bank_balance: Number(formData.get("bank_balance") ?? 0),
      created_by: user.profile.id,
    },
    { onConflict: "company_id,as_of_date" },
  );

  if (error) throw new Error(error.message);
  revalidatePath("/finance");
  revalidatePath("/scale");
  revalidatePath("/dashboard");
}
