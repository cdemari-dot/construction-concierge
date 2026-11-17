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

// Per-category monthly overhead for the "What you can afford" tab. The total used by the
// cash forecast (overhead_monthly) is raised to the itemised sum if that sum is larger.
export async function saveOverheadBreakdown(formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");

  const num = (key: string) => Math.max(0, Number(formData.get(key) ?? 0) || 0);
  const parts = {
    rent_monthly: num("rent_monthly"),
    vehicles_monthly: num("vehicles_monthly"),
    insurance_monthly: num("insurance_monthly"),
    office_staff_monthly: num("office_staff_monthly"),
    other_monthly: num("other_monthly"),
  };
  const sum = Object.values(parts).reduce((s, v) => s + v, 0);

  const { data: current } = await supabase.from("cash_flow_assumptions").select("overhead_monthly").eq("company_id", user.profile.company_id).maybeSingle();
  const total = Math.max(Number(current?.overhead_monthly ?? 0), sum);

  const { error } = await supabase
    .from("cash_flow_assumptions")
    .update({ ...parts, overhead_monthly: total, updated_by: user.profile.id, updated_at: new Date().toISOString() })
    .eq("company_id", user.profile.company_id);
  if (error) throw new Error(error.message);
  revalidatePath("/finance");
  revalidatePath("/scale");
  revalidatePath("/dashboard");
}
