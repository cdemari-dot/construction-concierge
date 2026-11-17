import type { Metadata, Viewport } from "next";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { requireRole } from "@/lib/auth/session";

// The Field app is its own installable app, separate from the Crew Punch kiosk.
export const metadata: Metadata = {
  title: "CC Field",
  manifest: "/field-app.webmanifest",
  appleWebApp: { capable: true, title: "CC Field", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#FAFAF8" };

export default async function FieldAppLayout({ children }: { children: React.ReactNode }) {
  // The punch-clock login (Worker role) belongs to the kiosk app, not the foreman app.
  if (isSupabaseConfigured) await requireRole(["owner", "pm", "foreman"]);
  return children;
}
