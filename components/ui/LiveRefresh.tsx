"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-fetches the server data on this page every N seconds (and when the tab regains focus),
// so numbers like job cost move as soon as the crew punches.
export function LiveRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [router, seconds]);
  return null;
}
