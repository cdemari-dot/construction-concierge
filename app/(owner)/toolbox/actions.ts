"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/session";
import { todayToronto } from "@/lib/today";

export async function createToolboxTalk(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  const supabase = await createClient();

  const jobIds = formData.getAll("job_id").map(String).filter(Boolean);
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  const talkDate = String(formData.get("talk_date") || "") || todayToronto();
  if (jobIds.length === 0) throw new Error("Pick at least one job");
  if (!title || !body) throw new Error("Title and talk content are required");

  const { error } = await supabase.from("toolbox_talks").insert(
    jobIds.map((job_id) => ({
      company_id: user.profile.company_id,
      job_id,
      talk_date: talkDate,
      title,
      body,
      created_by: user.profile.id,
    })),
  );
  if (error) throw new Error(error.message);
  revalidatePath("/toolbox");
}
