"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ChangeOrderStatus } from "@/lib/types/database";

export async function priceChangeOrder(id: string, amount: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("change_orders")
    .update({ amount, status: "priced", priced_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/change-orders");
}

export async function sendChangeOrderToGc(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("change_orders")
    .update({ status: "sent_to_gc", sent_to_gc_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/change-orders");
}

export async function setChangeOrderStatus(id: string, status: ChangeOrderStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("change_orders")
    .update({ status, gc_responded_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/change-orders");
}
