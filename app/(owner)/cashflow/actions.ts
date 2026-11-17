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

// Own split of the overhead budget for "What you can afford". Percentages are scaled to add to 100.
// Sending "reset" goes back to the typical contractor split.
export async function saveAffordShares(formData: FormData) {
  const supabase = await createClient();
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");

  let weights: Record<string, number> | null = null;
  if (formData.get("reset") == null) {
    const keys = ["rent", "vehicles", "insurance", "office", "other"];
    const raw = keys.map((k) => Math.max(0, Number(formData.get(`share_${k}`) ?? 0) || 0));
    const sum = raw.reduce((s, v) => s + v, 0);
    if (sum <= 0) throw new Error("Give at least one category a share above zero.");
    weights = Object.fromEntries(keys.map((k, i) => [k, Math.round((raw[i] / sum) * 1000) / 10]));
  }

  const { error } = await supabase
    .from("cash_flow_assumptions")
    .update({ afford_weights: weights, updated_by: user.profile.id, updated_at: new Date().toISOString() })
    .eq("company_id", user.profile.company_id);
  if (error) throw new Error(error.message);
  revalidatePath("/finance");
}
