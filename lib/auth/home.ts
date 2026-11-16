import type { UserRole } from "@/lib/types/database";

// Where each role lands after signing in. Field roles never see the office
// app. Foreman -> Field app; Worker (the jobsite punch-clock login) -> Crew Punch kiosk.
export function homeFor(role: UserRole): string {
  if (role === "foreman") return "/m";
  if (role === "worker") return "/kiosk";
  return "/dashboard";
}
