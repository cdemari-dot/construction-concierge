import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUser } from "@/lib/auth/session";
import { homeFor } from "@/lib/auth/home";

export default async function Home() {
  if (!isSupabaseConfigured) redirect("/login");

  const user = await getCurrentUser();
  redirect(user ? homeFor(user.profile.role) : "/login");
}
