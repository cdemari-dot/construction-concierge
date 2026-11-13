"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function addInvoice(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const supabase = await createClient();

  const jobId = String(formData.get("job_id"));
  const { data: job } = await supabase.from("jobs").select("client_id").eq("id", jobId).maybeSingle();

  const subtotal = Number(formData.get("subtotal") || 0);
  const hst = Number(formData.get("hst_amount") || 0);

  const { error } = await supabase.from("invoices").insert({
    company_id: user.profile.company_id,
    job_id: jobId,
    client_id: job?.client_id ?? null,
    invoice_number: String(formData.get("invoice_number")),
    subtotal,
    hst_amount: hst,
    total_amount: subtotal + hst,
    holdback_amount: Number(formData.get("holdback_amount") || 0),
    issued_at: String(formData.get("issued_at") || new Date().toISOString().slice(0, 10)),
    due_at: String(formData.get("due_at") || "") || null,
    status: "sent",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  revalidatePath("/cashflow");
}

export async function markInvoicePaid(invoiceId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("invoices")
    .update({ status: "paid", paid_at: new Date().toISOString().slice(0, 10) })
    .eq("id", invoiceId);
  if (error) throw new Error(error.message);
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  revalidatePath("/cashflow");
}

export async function addBill(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const supabase = await createClient();

  const jobId = String(formData.get("job_id") || "") || null;

  const { error } = await supabase.from("bills").insert({
    company_id: user.profile.company_id,
    job_id: jobId,
    vendor_name: String(formData.get("vendor_name")),
    description: String(formData.get("description") || "") || null,
    amount: Number(formData.get("amount") || 0),
    due_date: String(formData.get("due_date") || "") || null,
    status: "unpaid",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  revalidatePath("/cashflow");
}

export async function markBillPaid(billId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("bills")
    .update({ status: "paid", paid_at: new Date().toISOString().slice(0, 10) })
    .eq("id", billId);
  if (error) throw new Error(error.message);
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  revalidatePath("/cashflow");
}
