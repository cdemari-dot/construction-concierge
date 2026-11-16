"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const KEY = "cc-kiosk-job";

// On /kiosk/[jobId]: remember which site this iPad belongs to.
export function RememberKioskSite({ jobId }: { jobId: string }) {
  useEffect(() => {
    try {
      localStorage.setItem(KEY, jobId);
    } catch {}
  }, [jobId]);
  return null;
}

// On /kiosk: if this iPad already has a site, go straight to its PIN pad.
export function KioskAutoOpen({ validJobIds }: { validJobIds: string[] }) {
  const router = useRouter();
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved && validJobIds.includes(saved) && !new URLSearchParams(window.location.search).has("change")) router.replace(`/kiosk/${saved}`);
    } catch {}
  }, [router, validJobIds]);
  return null;
}

export function ForgetKioskSite() {
  return (
    <Link
      href="/kiosk?change=1"
      onClick={() => {
        try {
          localStorage.removeItem(KEY);
        } catch {}
      }}
      style={{ color: "var(--mute)", fontSize: 11, textDecoration: "underline" }}
    >
      Change site
    </Link>
  );
}
