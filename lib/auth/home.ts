import type { UserRole } from "@/lib/types/database";

// Where each role lands after signing in. Field roles never see the office
// app; sending them to /dashboard would just bounce them back.
export function homeFor(role: UserRole): string {
  return role === "foreman" || role === "worker" ? "/m" : "/dashboard";
}
