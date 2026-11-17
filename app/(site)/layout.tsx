import type { Metadata } from "next";
import "./site.css";

const description =
  "The owner's CFO and back office for subcontractors of every trade, from one-truck micro shops to growing medium-size crews. Live job cost from the punch clock, cash flow you can trust, and field paperwork that signs itself off.";

export const metadata: Metadata = {
  title: "Construction Concierge | The owner's CFO and back office for contractors",
  description,
  openGraph: { title: "Construction Concierge", description, type: "website", siteName: "Construction Concierge" },
};

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return <div className="site">{children}</div>;
}
