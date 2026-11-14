"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import type { UserRole } from "@/lib/types/database";

// Foreman/Worker: no login, identified by PIN at the kiosk. Owner picks the
// PIN here and it's hashed server-side via the set_worker_pin RPC — this
// app never stores or transmits a plaintext PIN anywhere else.
export async function addCrewMember(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const supabase = await createClient();

  const fullName = String(formData.get("full_name"));
  const role = String(formData.get("role")) as UserRole;
  const phone = String(formData.get("phone") || "") || null;
  const pin = String(formData.get("pin"));
  const rateText = String(formData.get("hourly_rate") || "").trim();

  const { data: profile, error } = await supabase
    .from("profiles")
    .insert({ company_id: user.profile.company_id, full_name: fullName, role, phone })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const { error: pinError } = await supabase.rpc("set_worker_pin", {
    p_profile_id: profile.id,
    p_pin: pin,
  });
  if (pinError) throw new Error(pinError.message);

  if (rateText !== "") {
    const rate = Number(rateText);
    if (!Number.isFinite(rate) || rate < 0) throw new Error("Enter a valid hourly cost");
    const { error: rateError } = await supabase
      .from("pay_rates")
      .upsert({ profile_id: profile.id, company_id: user.profile.company_id, hourly_rate: rate }, { onConflict: "profile_id" });
    if (rateError) throw new Error(rateError.message);
  }

  revalidatePath("/team");
}

// Owner/PM: real login, invited by email. Creates a placeholder profile with
// no auth_user_id yet — handle_new_auth_user (see CLAUDE.md) claims it the
// moment that email signs up at /accept-invite.
export async function inviteTeamMember(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const supabase = await createClient();

  const fullName = String(formData.get("full_name"));
  const email = String(formData.get("email")).trim().toLowerCase();
  const role = String(formData.get("role")) as UserRole;

  const { error } = await supabase.from("profiles").insert({
    company_id: user.profile.company_id,
    full_name: fullName,
    email,
    role,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/team");
}

export async function changeWorkerPin(profileId: string, pin: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_worker_pin", { p_profile_id: profileId, p_pin: pin });
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

export async function deactivateCrewMember(profileId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ status: "inactive" }).eq("id", profileId);
  if (error) throw new Error(error.message);
  revalidatePath("/team");
}

// Loaded cost per hour (wage plus payroll burden). Owner/PM only — enforced
// by RLS on pay_rates, not just by this app.
export async function setPayRate(profileId: string, rate: number) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  if (!Number.isFinite(rate) || rate < 0) throw new Error("Enter a valid hourly rate");
  const supabase = await createClient();
  const { error } = await supabase.from("pay_rates").upsert(
    { profile_id: profileId, company_id: user.profile.company_id, hourly_rate: rate, updated_at: new Date().toISOString() },
    { onConflict: "profile_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/team");
  revalidatePath("/jobs");
}
