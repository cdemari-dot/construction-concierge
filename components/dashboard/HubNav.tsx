"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Command" },
  { href: "/jobs", label: "Jobs" },
  { href: "/crm", label: "CRM" },
  { href: "/clients", label: "Clients" },
  { href: "/schedule", label: "Schedule" },
  { href: "/field", label: "Field app" },
  { href: "/toolbox", label: "Toolbox Talks" },
  { href: "/field-reports", label: "Field Reports" },
  { href: "/team", label: "Team" },
  { href: "/finance", label: "Finance & Cash" },
  { href: "/scale", label: "Grow Safely" },
  { href: "/change-orders", label: "Change Orders" },
  { href: "/payroll-export", label: "Payroll Export" },
];

// Sidebar links with the current page highlighted (black pill), like the website's buttons.
export function HubNav() {
  const path = usePathname() ?? "";
  return (
    <nav className="hub-nav" aria-label="Main">
      {NAV.map((n) => {
        const on = path === n.href || path.startsWith(`${n.href}/`);
        return (
          <Link key={n.href} href={n.href} className={on ? "on" : ""} aria-current={on ? "page" : undefined}>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}
