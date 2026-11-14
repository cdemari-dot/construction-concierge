import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeFor } from "@/lib/auth/home";
import type { Profile, UserRole } from "@/lib/types/database";

export interface CurrentUser {
  authUserId: string;
  profile: Profile;
}

// Loads the signed-in user's own `profiles` row. Returns null if there's no
// session, or if the session exists but hasn't been linked to a profile yet
// (shouldn't normally happen outside of the sign-up flow).
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("auth_user_id", authData.user.id)
    .maybeSingle();

  if (!profile) return null;

  return { authUserId: authData.user.id, profile: profile as Profile };
}

// Server Component / Server Action guard: redirects to /login if there's no
// session, and to /dashboard if the role isn't allowed for this route.
export async function requireRole(allowed: UserRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!allowed.includes(user.profile.role)) redirect(homeFor(user.profile.role));
  return user;
}
