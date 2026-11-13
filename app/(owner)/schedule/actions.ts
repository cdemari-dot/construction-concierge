"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function addScheduleEntry(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const supabase = await createClient();

  const { error } = await supabase.from("schedule_entries").upsert(
    {
      company_id: user.profile.company_id,
      job_id: String(formData.get("job_id")),
      worker_id: String(formData.get("worker_id")),
      work_date: String(formData.get("work_date")),
      notes: String(formData.get("notes") || "") || null,
      created_by: user.profile.id,
    },
    { onConflict: "job_id,worker_id,work_date" },
  );
  if (error) throw new Error(error.message);
  revalidatePath("/schedule");
}

export async function removeScheduleEntry(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("schedule_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/schedule");
}
