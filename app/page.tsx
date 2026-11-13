import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth/session";

export default async function Home() {
  if (!isSupabaseConfigured) redirect("/login");

  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
