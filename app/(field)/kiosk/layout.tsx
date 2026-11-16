import type { Metadata, Viewport } from "next";

// Crew Punch is its own installable app (own name, icon, start URL and scope).
export const metadata: Metadata = {
  title: "Crew Punch",
  manifest: "/crew-punch.webmanifest",
  appleWebApp: { capable: true, title: "Crew Punch", statusBarStyle: "black-translucent" },
};
export const viewport: Viewport = { themeColor: "#0B0B0D" };

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  return children;
}
